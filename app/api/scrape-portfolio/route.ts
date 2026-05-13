import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import * as cheerio from 'cheerio'
import { verifyInternalAuth } from '@/lib/internalAuth'
import dns from 'dns/promises'
import net from 'net'
import https from 'https'
import http from 'http'

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

function isPrivateIp(ip: string): boolean {
  // Reject private, loopback, link-local, and reserved ranges
  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ]
  return privateRanges.some((re) => re.test(ip))
}

async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Disallowed protocol: ${parsed.protocol}`)
  }
  const hostname = parsed.hostname
  // Reject if hostname is already an IP address
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error(`Private IP address rejected: ${hostname}`)
    return
  }
  // Resolve and check all DNS addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true })
    for (const { address } of addresses) {
      if (isPrivateIp(address)) throw new Error(`DNS resolved to private IP: ${address}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('DNS resolved')) throw err
    throw new Error(`DNS resolution failed for ${hostname}`)
  }
}

// Resolves DNS once, then connects directly to the resolved IP — eliminates DNS rebinding window.
// Uses the original hostname for TLS SNI and the Host header so certificates validate correctly.
async function resolvedFetch(
  url: string,
  options: { signal?: AbortSignal; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string>; headers: { get(k: string): string | null } }> {
  const parsed = new URL(url)
  const hostname = parsed.hostname
  const useHttps = parsed.protocol === 'https:'
  const port = parsed.port ? parseInt(parsed.port, 10) : (useHttps ? 443 : 80)
  const path = (parsed.pathname || '/') + parsed.search

  // Single DNS resolution — the actual TCP connection uses this IP, not a re-lookup
  let resolvedIp: string
  if (net.isIP(hostname)) {
    resolvedIp = hostname
  } else {
    const result = await dns.lookup(hostname) as { address: string; family: number }
    resolvedIp = result.address
  }
  if (isPrivateIp(resolvedIp)) throw new Error(`Resolved to private IP: ${resolvedIp}`)

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: resolvedIp,
      port,
      path: path || '/',
      method: 'GET',
      headers: { Host: hostname, 'User-Agent': 'Mozilla/5.0 (compatible; DesignLeadBot/1.0)', ...options.headers },
      servername: hostname,
      rejectUnauthorized: true,
    }
    const req = (useHttps ? https : http).request(reqOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        const rawHeaders = res.headers
        resolve({
          ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
          status: res.statusCode ?? 0,
          arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
          text: async () => body.toString('utf-8'),
          headers: { get: (k: string) => { const v = rawHeaders[k.toLowerCase()]; return Array.isArray(v) ? v[0] : (v ?? null) } },
        })
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    if (options.signal) options.signal.addEventListener('abort', () => req.destroy())
    req.end()
  })
}

function resolveUrl(src: string, base: string): string | null {
  try {
    return new URL(src, base).href
  } catch {
    return null
  }
}

function detectMagicBytes(buf: Buffer): { mime: string; ext: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
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
    await assertSafeUrl(url)
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

async function groqStyleFallback(designer_slug: string, styleKeywords: string[]): Promise<void> {
  if (!process.env.GROQ_API_KEY || styleKeywords.length === 0) {
    console.warn('Groq fallback skipped — no API key or no style keywords')
    return
  }
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are an expert interior design analyst. A designer describes their style as: ${styleKeywords.join(', ')}. Write a dense style profile paragraph (max 120 words) covering: recurring materials, colour palette, lighting character, furniture silhouettes, spatial qualities. Write as a prompt fragment for an AI image generator. No headings, no bullets, no preamble.`,
        },
      ],
      max_tokens: 200,
    })
    const profile = result.choices[0]?.message?.content?.trim() ?? ''
    if (profile) {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('designers')
        .update({ ai_style_profile: profile })
        .eq('slug', designer_slug)
      if (error) console.error('Groq fallback: failed to save style profile:', error)
      else console.log('Groq fallback: style profile saved successfully')
    }
  } catch (err) {
    console.error('Groq style fallback failed:', err)
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      .is('archived_at', null)
      .single()

    if (designerErr || !designer?.portfolio_url) {
      throw new Error('No portfolio URL found')
    }

    const portfolioUrl = designer.portfolio_url

    // Reject private/internal URLs before fetching (SSRF protection)
    await assertSafeUrl(portfolioUrl)

    // Fetch portfolio HTML — use resolvedFetch to eliminate DNS rebinding window
    const htmlRes = await resolvedFetch(portfolioUrl, { signal: AbortSignal.timeout(15000) })
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
        await assertSafeUrl(unique[i])
        const imgRes = await resolvedFetch(unique[i], { signal: AbortSignal.timeout(10000) })
        if (!imgRes.ok) continue

        const buffer = Buffer.from(await imgRes.arrayBuffer())
        const magic = detectMagicBytes(buffer)
        if (!magic) {
          console.warn(`Skipping portfolio image ${i} — failed magic byte check`)
          continue
        }
        const path = `${designer_slug}/portfolio-${i}.${magic.ext}`
        const contentType = magic.mime

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
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set — skipping style analysis')
    }
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const images = (await Promise.all(publicUrls.map(imageUrlToBase64))).filter(Boolean) as {
          data: string
          mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        }[]

        console.log(`Claude Vision: ${images.length}/${publicUrls.length} images loaded for analysis`)
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

          console.log('Style profile generated, length:', styleProfile.length, 'preview:', styleProfile.slice(0, 80))

          if (styleProfile) {
            const { error: updateErr } = await supabase
              .from('designers')
              .update({ ai_style_profile: styleProfile })
              .eq('slug', designer_slug)
            if (updateErr) console.error('Failed to save ai_style_profile:', updateErr)
            else console.log('ai_style_profile saved successfully')
          } else {
            console.error('Style profile was empty — content type:', result.content[0].type)
          }
        }
      } catch (visionErr) {
        console.error('Claude Vision style analysis failed:', visionErr)
        // Fallback: generate style profile from keywords using Groq (no vision)
        await groqStyleFallback(designer_slug, designer.style_keywords ?? [])
      }
    } else {
      await groqStyleFallback(designer_slug, designer.style_keywords ?? [])
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
