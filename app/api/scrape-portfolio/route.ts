import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'designer-portfolios'

const FILTER_PATTERNS = /logo|thumb|thumbnail|icon|placeholder|blank|pixel|spacer/i

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function extFromContentType(ct: string): string {
  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif')) return 'gif'
  return 'jpg'
}

async function imageUrlToBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)
      ? contentType
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    return { data: Buffer.from(buffer).toString('base64'), mediaType }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let designer_slug: string
  try {
    const body = await req.json()
    designer_slug = body.designer_slug?.trim()
    if (!designer_slug) throw new Error('missing slug')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = getSupabase()

  // Mark as pending (re-run support)
  await supabase
    .from('designers')
    .update({ portfolio_scrape_status: 'pending', portfolio_image_urls: [], ai_style_profile: null })
    .eq('slug', designer_slug)

  try {
    // Fetch designer's portfolio URL
    const { data: designer, error: designerErr } = await supabase
      .from('designers')
      .select('portfolio_url, style_keywords')
      .eq('slug', designer_slug)
      .single()

    if (designerErr || !designer?.portfolio_url) {
      throw new Error('No portfolio URL found')
    }

    const portfolioUrl = designer.portfolio_url

    // Fetch portfolio HTML
    const htmlRes = await fetch(portfolioUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DesignLeadBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!htmlRes.ok) throw new Error(`Portfolio fetch failed: ${htmlRes.status}`)
    const html = await htmlRes.text()

    // Parse img srcs with cheerio
    const $ = cheerio.load(html)
    const candidates: string[] = []

    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
      if (!src) return

      // Filter by URL pattern
      if (FILTER_PATTERNS.test(src)) return

      // Filter by width/height attrs (skip small images)
      const w = parseInt($(el).attr('width') || '9999', 10)
      const h = parseInt($(el).attr('height') || '9999', 10)
      if (w < 200 || h < 200) return

      const resolved = resolveUrl(src, portfolioUrl)
      if (resolved) candidates.push(resolved)
    })

    // Deduplicate and take first 10
    const seen = new Set<string>()
    const unique = candidates.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true }).slice(0, 10)

    if (unique.length === 0) throw new Error('No portfolio images found')

    // Download images and upload to Supabase Storage
    const publicUrls: string[] = []

    for (let i = 0; i < unique.length; i++) {
      try {
        const imgRes = await fetch(unique[i], { signal: AbortSignal.timeout(10000) })
        if (!imgRes.ok) continue

        const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
        const ext = extFromContentType(contentType)
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        const path = `${designer_slug}/portfolio-${i}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType, upsert: true })

        if (uploadErr) {
          console.error(`Upload failed for ${path}:`, uploadErr)
          continue
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        if (urlData?.publicUrl) publicUrls.push(urlData.publicUrl)
      } catch (err) {
        console.error(`Failed to process image ${i}:`, err)
      }
    }

    if (publicUrls.length === 0) throw new Error('No images successfully uploaded')

    // Store portfolio image URLs
    await supabase
      .from('designers')
      .update({ portfolio_image_urls: publicUrls })
      .eq('slug', designer_slug)

    // Claude Vision style analysis
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const images = (await Promise.all(publicUrls.map(imageUrlToBase64))).filter(Boolean) as {
          data: string
          mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        }[]

        if (images.length > 0) {
          const result = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 200,
            system:
              'You are an expert interior design analyst. You examine a designer\'s portfolio images and produce a precise, usable style description that will later be fed into an AI image generator. Focus on recurring visual signatures, not one-off elements.',
            messages: [
              {
                role: 'user',
                content: [
                  ...images.map((img) => ({
                    type: 'image' as const,
                    source: {
                      type: 'base64' as const,
                      media_type: img.mediaType,
                      data: img.data,
                    },
                  })),
                  {
                    type: 'text' as const,
                    text: `These are ${images.length} images from an interior designer's portfolio. Analyze them together and produce a structured style profile covering: 1) Recurring materials (e.g. oak, linen, brass, travertine), 2) Color temperature and palette (warm/cool, saturation, dominant hues), 3) Lighting character (diffuse/direct, warm/cool, natural/artificial), 4) Furniture silhouettes (low/tall, curved/angular, heavy/light), 5) Spatial qualities (minimal/layered, symmetrical/organic, open/intimate), 6) Signature details (specific recurring elements unique to this designer). Output as a single dense paragraph, no headings, no bullet points, maximum 120 words. Write it as a prompt fragment that can be dropped directly into an image generation prompt.`,
                  },
                ],
              },
            ],
          })

          const styleProfile =
            result.content[0].type === 'text' ? result.content[0].text.trim() : ''

          if (styleProfile) {
            await supabase
              .from('designers')
              .update({ ai_style_profile: styleProfile })
              .eq('slug', designer_slug)
          }
        }
      } catch (visionErr) {
        console.error('Claude Vision style analysis failed:', visionErr)
        // Non-fatal: proceed with complete status, no style profile
      }
    }

    await supabase
      .from('designers')
      .update({ portfolio_scrape_status: 'complete' })
      .eq('slug', designer_slug)

    return NextResponse.json({ success: true, imageCount: publicUrls.length })
  } catch (err) {
    console.error('Portfolio scrape failed:', err)
    await supabase
      .from('designers')
      .update({ portfolio_scrape_status: 'failed' })
      .eq('slug', designer_slug)
    return NextResponse.json({ success: false, error: String(err) })
  }
}
