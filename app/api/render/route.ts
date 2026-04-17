import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Hobby max — flux/schnell completes 3 images in ~20s

type FalImageResult = {
  images: Array<{ url: string }>
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildPrompt(styleKeywords: string[], designStyle: string, roomType: string): string {
  const keywordsStr = styleKeywords.length > 0 ? styleKeywords.join(', ') : 'contemporary, refined'
  return `Interior design concept render, ${keywordsStr}, ${designStyle}, ${roomType}, photorealistic, natural light, architectural photography, 8K, ultra detailed, no people, editorial interior photography`
}

async function generateOne(prompt: string, imageUrl?: string): Promise<string> {
  fal.config({ credentials: process.env.FAL_API_KEY })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input: any = {
    prompt,
    num_images: 1,
    image_size: 'landscape_4_3',
    num_inference_steps: 4,
    enable_safety_checker: true,
  }

  if (imageUrl) {
    input.image_url = imageUrl
    input.strength = 0.65
  }

  let result: unknown
  try {
    result = await fal.subscribe('fal-ai/flux/schnell', { input })
  } catch (e) {
    console.error('fal.subscribe threw:', JSON.stringify(e), e)
    throw e
  }
  console.log('fal.ai raw result:', JSON.stringify(result))
  const data = ((result as { data?: FalImageResult })?.data ?? result) as FalImageResult
  const url = data?.images?.[0]?.url
  if (!url) throw new Error('No image URL returned from fal.ai')
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
  if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_APP_URL) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/results/${params.token}`

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

  await resend.emails.send({
    from: `${params.designerName} <onboarding@resend.dev>`,
    to: [params.clientEmail],
    subject: `Your concept is ready — ${params.studioName}`,
    html,
  })
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
  if (!process.env.FAL_API_KEY) {
    return NextResponse.json({ error: 'Missing FAL_API_KEY' }, { status: 500 })
  }

  const supabase = getSupabase()

  // Fetch submission
  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('id, designer_slug, client_email, client_name, room_type, design_style, photo_urls, brief, results_page_token')
    .eq('id', submissionId)
    .single()

  if (subErr || !submission) {
    console.error('Submission not found:', subErr)
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Fetch designer
  const { data: designer } = await supabase
    .from('designers')
    .select('name, studio_name, style_keywords, calendly_url, is_paid')
    .eq('slug', submission.designer_slug)
    .single()

  const styleKeywords: string[] = designer?.style_keywords ?? []
  const prompt = buildPrompt(styleKeywords, submission.design_style, submission.room_type)
  const firstPhoto: string | undefined = submission.photo_urls?.[0]

  try {
    // Generate 3 images in parallel
    const urls = await Promise.all([
      generateOne(prompt, firstPhoto),
      generateOne(prompt, firstPhoto),
      generateOne(prompt, firstPhoto),
    ])

    // Store results
    await supabase
      .from('submissions')
      .update({ render_urls: urls, render_status: 'complete' })
      .eq('id', submissionId)

    // Send client results email
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
      // Don't fail the whole render if email fails
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
