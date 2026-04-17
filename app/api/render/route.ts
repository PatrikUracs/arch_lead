import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const maxDuration = 60

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildPrompt(
  aiStyleProfile: string | null,
  styleKeywords: string[],
  designStyle: string,
  roomType: string
): string {
  const styleBase =
    aiStyleProfile?.trim() ||
    (styleKeywords.length > 0 ? styleKeywords.join(', ') : 'contemporary, refined')
  return `${styleBase}, ${designStyle}, ${roomType}, photorealistic interior architecture photography, natural window light, editorial quality, 8K, ultra detailed, no people`
}

async function storeRender(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  replicateUrl: string,
  submissionId: string,
  index: number
): Promise<string> {
  const res = await fetch(replicateUrl, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Failed to fetch render from Replicate: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = `submissions/${submissionId}/render-${index}.jpg`
  const { error } = await supabase.storage
    .from('renders')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Failed to upload render to storage: ${error.message}`)
  const { data } = supabase.storage.from('renders').getPublicUrl(path)
  return data.publicUrl
}

async function generateOne(prompt: string, imageUrl: string): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

  const output = await replicate.run('jagilley/controlnet-depth:865a52cfc447e048994ea6d4038ba65d6d74c574162b6f54ba4b3cd25c0e0e4b', {
    input: {
      image: imageUrl,
      prompt,
      num_samples: '1',
      image_resolution: 768,
      detect_resolution: 384,
      scale: 9,
      ddim_steps: 20,
      eta: 0,
      a_prompt: 'best quality, extremely detailed, photorealistic, architectural photography',
      n_prompt:
        'longbody, lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, people, person, human, figures, text, watermark, signature, deformed',
    },
  })

  console.log('Replicate output:', JSON.stringify(output))

  const items = Array.isArray(output) ? output : [output]
  const url = items.map((item: unknown) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && 'url' in item && typeof (item as { url: unknown }).url === 'function') {
      return (item as { url: () => string }).url()
    }
    if (item && typeof item === 'object' && 'url' in item) {
      return String((item as { url: unknown }).url)
    }
    return String(item)
  })[0]

  if (!url || url === '[object Object]') throw new Error('No image URL returned from Replicate')
  return url
}

async function sendResultsEmail(params: {
  clientEmail: string
  clientName: string
  roomType: string
  token: string
  studioName: string
  designerName: string
}) {
  if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_APP_URL) {
    console.error('Results email skipped — missing RESEND_API_KEY or NEXT_PUBLIC_APP_URL')
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/results/${params.token}`
  console.log('Sending results email to:', params.clientEmail, 'url:', resultsUrl)

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#0A0A0A;margin:0;padding:24px;">
  <div style="max-width:580px;margin:0 auto;background:#111111;border-radius:2px;overflow:hidden;border:1px solid rgba(201,169,110,0.2);">
    <div style="padding:40px 40px 0;">
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;margin:0 0 8px;letter-spacing:0.02em;">Your concept is ready.</h1>
      <p style="color:rgba(245,240,232,0.5);font-size:13px;font-weight:300;margin:0 0 32px;letter-spacing:0.05em;">${params.studioName}</p>
      <hr style="border:none;border-top:1px solid rgba(201,169,110,0.15);margin:0 0 32px;"/>
      <p style="color:rgba(245,240,232,0.7);font-size:14px;line-height:1.7;margin:0 0 32px;">
        We&rsquo;ve prepared 3 concept directions for your ${params.roomType} project.
      </p>
      <div style="text-align:center;margin-bottom:40px;">
        <a href="${resultsUrl}" style="background:#C9A96E;color:#0A0A0A;padding:14px 32px;font-family:sans-serif;font-size:13px;letter-spacing:0.1em;text-decoration:none;display:inline-block;border-radius:2px;font-weight:400;">View your concepts</a>
      </div>
    </div>
    <div style="padding:20px 40px 24px;border-top:1px solid rgba(201,169,110,0.08);">
      <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.3);line-height:1.6;">This preview was prepared by ${params.studioName}. Reply to this email to get in touch.</p>
    </div>
  </div>
</body>
</html>`

  const result = await resend.emails.send({
    from: `${params.designerName} <onboarding@resend.dev>`,
    to: [params.clientEmail],
    subject: `Your concept is ready — ${params.studioName}`,
    html,
  })
  console.log('Results email sent:', JSON.stringify(result))
}

export async function POST(req: NextRequest) {
  let submissionId: string
  try {
    const body = await req.json()
    submissionId = body.submissionId
    if (!submissionId) throw new Error('Missing submissionId')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'Missing REPLICATE_API_TOKEN' }, { status: 500 })
  }

  const supabase = getSupabase()

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('id, designer_slug, client_email, client_name, room_type, design_style, photo_urls, brief, results_page_token')
    .eq('id', submissionId)
    .single()

  if (subErr || !submission) {
    console.error('Submission not found:', subErr)
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const { data: designer } = await supabase
    .from('designers')
    .select('name, studio_name, style_keywords, ai_style_profile, calendly_url, is_paid')
    .eq('slug', submission.designer_slug)
    .single()

  const styleKeywords: string[] = designer?.style_keywords ?? []
  const aiStyleProfile: string | null = designer?.ai_style_profile ?? null
  const prompt = buildPrompt(aiStyleProfile, styleKeywords, submission.design_style, submission.room_type)

  const firstPhoto: string = submission.photo_urls[0]

  try {
    const replicateUrls = await Promise.all([
      generateOne(prompt, firstPhoto),
      generateOne(prompt, firstPhoto),
      generateOne(prompt, firstPhoto),
    ])

    const urls = await Promise.all(
      replicateUrls.map((url, i) => storeRender(supabase, url, submissionId, i))
    )

    await supabase
      .from('submissions')
      .update({ render_urls: urls, render_status: 'complete' })
      .eq('id', submissionId)

    const studioName = designer?.studio_name || designer?.name || 'Your designer'
    const designerName = designer?.name || 'Your designer'
    try {
      await sendResultsEmail({
        clientEmail: submission.client_email,
        clientName: submission.client_name,
        roomType: submission.room_type,
        token: submission.results_page_token,
        studioName,
        designerName,
      })
    } catch (emailErr) {
      console.error('Results email failed:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Render generation failed:', err)
    await supabase
      .from('submissions')
      .update({ render_status: 'failed' })
      .eq('id', submissionId)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
