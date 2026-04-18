import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

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


async function createPrediction(prompt: string, imageUrl: string, webhookUrl: string): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

  const prediction = await replicate.predictions.create({
    version: '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38',
    input: {
      image: imageUrl,
      prompt,
      negative_prompt:
        'lowres, watermark, banner, logo, contactinfo, text, deformed, blurry, blur, out of focus, out of frame, surreal, extra, ugly, upholstered walls, fabric walls, plush walls, mirror, mirrored',
      num_inference_steps: 35,
      guidance_scale: 15,
      prompt_strength: 0.8,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  })

  return prediction.id
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_APP_URL' }, { status: 500 })

  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Missing CRON_SECRET' }, { status: 500 })

  try {
    const predictionIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const webhookUrl = `${appUrl}/api/render-webhook?submissionId=${submissionId}&index=${i}&secret=${secret}&total=2`
      predictionIds.push(await createPrediction(prompt, firstPhoto, webhookUrl))
      console.log(`Prediction ${i} created:`, predictionIds[i])
    }

    return NextResponse.json({ success: true, predictionIds })
  } catch (err) {
    console.error('Failed to create Replicate predictions:', err)
    await supabase
      .from('submissions')
      .update({ render_status: 'failed' })
      .eq('id', submissionId)
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 })
  }
}
