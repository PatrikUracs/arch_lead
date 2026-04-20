import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { htmlEscape } from '@/lib/utils'
import { logError } from '@/lib/errorLog'

export const runtime = 'nodejs'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function storeRender(replicateUrl: string, submissionId: string, index: number): Promise<string> {
  const res = await fetch(replicateUrl, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Failed to fetch render from Replicate: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const path = `submissions/${submissionId}/render-${index}.jpg`
  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from('renders')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Failed to upload render to storage: ${error.message}`)
  const { data } = supabase.storage.from('renders').getPublicUrl(path)
  return data.publicUrl
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
      <p style="color:rgba(245,240,232,0.5);font-size:13px;font-weight:300;margin:0 0 32px;letter-spacing:0.05em;">${htmlEscape(params.studioName)}</p>
      <hr style="border:none;border-top:1px solid rgba(201,169,110,0.15);margin:0 0 32px;"/>
      <p style="color:rgba(245,240,232,0.7);font-size:14px;line-height:1.7;margin:0 0 32px;">
        We&rsquo;ve prepared concept directions for your ${htmlEscape(params.roomType)} project.
      </p>
      <div style="text-align:center;margin-bottom:40px;">
        <a href="${resultsUrl}" style="background:#C9A96E;color:#0A0A0A;padding:14px 32px;font-family:sans-serif;font-size:13px;letter-spacing:0.1em;text-decoration:none;display:inline-block;border-radius:2px;font-weight:400;">View your concepts</a>
      </div>
    </div>
    <div style="padding:20px 40px 24px;border-top:1px solid rgba(201,169,110,0.08);">
      <p style="margin:0;font-size:12px;color:rgba(245,240,232,0.3);line-height:1.6;">This preview was prepared by ${htmlEscape(params.studioName)}. Reply to this email to get in touch.</p>
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
  console.log('Results email sent to:', params.clientEmail)
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const submissionId = searchParams.get('submissionId')
  const index = parseInt(searchParams.get('index') ?? '0', 10)
  const secret = searchParams.get('secret')
  const total = parseInt(searchParams.get('total') ?? '2', 10)

  // Verify secret — prefer dedicated WEBHOOK_SECRET, fall back to CRON_SECRET
  const expectedSecret = process.env.WEBHOOK_SECRET ?? process.env.CRON_SECRET
  if (!secret || !expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!submissionId) {
    return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
  }

  let body: { status: string; output: unknown; error?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  console.log(`Webhook received: submissionId=${submissionId} index=${index} status=${body.status}`)

  if (body.status === 'failed') {
    console.error(`Prediction ${index} failed:`, body.error)
    // Only mark failed if all predictions have reported back as failed — for now just log
    return NextResponse.json({ ok: true })
  }

  if (body.status !== 'succeeded') {
    return NextResponse.json({ ok: true })
  }

  // Extract image URL from output
  const output = body.output
  let replicateUrl: string | null = null
  if (typeof output === 'string') replicateUrl = output
  else if (Array.isArray(output) && typeof output[0] === 'string') replicateUrl = output[0]

  if (!replicateUrl) {
    console.error('No image URL in webhook output:', JSON.stringify(output))
    return NextResponse.json({ error: 'No image URL' }, { status: 500 })
  }

  const supabase = getSupabase()

  try {
    const storedUrl = await storeRender(replicateUrl, submissionId, index)

    // Fetch current render_urls array and append
    const { data: submission } = await supabase
      .from('submissions')
      .select('render_urls, client_email, client_name, room_type, results_page_token, designer_slug')
      .eq('id', submissionId)
      .single()

    if (!submission) throw new Error('Submission not found')

    const existing: string[] = submission.render_urls ?? []
    existing[index] = storedUrl
    const filled = existing.filter(Boolean)
    const isComplete = filled.length >= total

    await supabase
      .from('submissions')
      .update({
        render_urls: existing,
        render_status: isComplete ? 'complete' : 'pending',
      })
      .eq('id', submissionId)

    // Send email only once, when the last render arrives
    if (isComplete) {
      const { data: designer } = await supabase
        .from('designers')
        .select('name, studio_name')
        .eq('slug', submission.designer_slug)
        .single()

      try {
        await sendResultsEmail({
          clientEmail: submission.client_email,
          clientName: submission.client_name,
          roomType: submission.room_type,
          token: submission.results_page_token,
          studioName: designer?.studio_name || designer?.name || 'Your designer',
          designerName: designer?.name || 'Your designer',
        })
      } catch (emailErr) {
        void logError('render-webhook/results-email', emailErr, { submissionId })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    void logError('render-webhook/handler', err, { submissionId: submissionId ?? undefined })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
