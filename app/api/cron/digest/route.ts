import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

type Submission = {
  id: string
  client_name: string
  room_type: string
  budget_range: string
  lead_quality: string | null
  designer_slug: string
  results_page_token: string | null
}

type Designer = {
  slug: string
  name: string
  studio_name: string | null
  email?: string
  notification_preference: string
}

function qualityLabel(q: string | null) {
  if (!q) return ''
  return q
}

function buildDigestHtml(designer: Designer, submissions: Submission[], dashboardUrl: string): string {
  const studioName = designer.studio_name || designer.name
  const rows = submissions
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1E1E1E;color:#F5F0E8;font-size:13px;">${s.client_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1E1E1E;color:rgba(245,240,232,0.6);font-size:13px;">${s.room_type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1E1E1E;color:rgba(245,240,232,0.6);font-size:13px;">${s.budget_range}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1E1E1E;color:#C9A96E;font-size:12px;font-weight:300;">${qualityLabel(s.lead_quality)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#0A0A0A;margin:0;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background:#111111;border-radius:2px;border:1px solid rgba(201,169,110,0.2);">
    <div style="padding:32px 40px 0;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#F5F0E8;margin:0 0 6px;">Daily lead digest</h1>
      <p style="color:rgba(245,240,232,0.4);font-size:12px;margin:0 0 28px;letter-spacing:0.05em;">${studioName}</p>
      <hr style="border:none;border-top:1px solid rgba(201,169,110,0.12);margin:0 0 24px;"/>
      <p style="color:rgba(245,240,232,0.6);font-size:14px;margin:0 0 20px;line-height:1.6;">
        You received <strong style="color:#F5F0E8;">${submissions.length}</strong> new lead${submissions.length !== 1 ? 's' : ''} in the last 24 hours.
      </p>
      <table style="width:100%;border-collapse:collapse;background:#0D0D0D;border-radius:2px;overflow:hidden;margin-bottom:28px;">
        <thead>
          <tr style="background:#111;">
            <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:300;letter-spacing:0.15em;text-transform:uppercase;color:rgba(201,169,110,0.6);border-bottom:1px solid rgba(201,169,110,0.12);">Client</th>
            <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:300;letter-spacing:0.15em;text-transform:uppercase;color:rgba(201,169,110,0.6);border-bottom:1px solid rgba(201,169,110,0.12);">Room</th>
            <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:300;letter-spacing:0.15em;text-transform:uppercase;color:rgba(201,169,110,0.6);border-bottom:1px solid rgba(201,169,110,0.12);">Budget</th>
            <th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:300;letter-spacing:0.15em;text-transform:uppercase;color:rgba(201,169,110,0.6);border-bottom:1px solid rgba(201,169,110,0.12);">Quality</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:center;margin-bottom:36px;">
        <a href="${dashboardUrl}" style="background:#C9A96E;color:#0A0A0A;padding:13px 28px;font-family:sans-serif;font-size:12px;letter-spacing:0.1em;text-decoration:none;display:inline-block;border-radius:2px;">View in dashboard</a>
      </div>
    </div>
    <div style="padding:16px 40px 20px;border-top:1px solid rgba(201,169,110,0.08);">
      <p style="margin:0;font-size:11px;color:rgba(245,240,232,0.25);">Daily digest from DesignLead · You&rsquo;re receiving this because your notification preference is set to daily.</p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Query submissions from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, client_name, room_type, budget_range, lead_quality, designer_slug, results_page_token')
    .gte('created_at', since)

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Group by designer_slug
  const byDesigner: Record<string, Submission[]> = {}
  for (const s of submissions) {
    if (!byDesigner[s.designer_slug]) byDesigner[s.designer_slug] = []
    byDesigner[s.designer_slug].push(s)
  }

  const slugs = Object.keys(byDesigner)
  const { data: designers } = await supabase
    .from('designers')
    .select('slug, name, studio_name, notification_preference')
    .in('slug', slugs)

  if (!designers) return NextResponse.json({ sent: 0 })

  let sent = 0
  const designerEmail = process.env.DESIGNER_EMAIL

  for (const designer of designers) {
    if (designer.notification_preference !== 'digest') continue
    if (!designerEmail) continue

    const subs = byDesigner[designer.slug] ?? []
    if (subs.length === 0) continue

    const html = buildDigestHtml(designer as Designer, subs, `${appUrl}/dashboard`)
    const studioName = designer.studio_name || designer.name

    try {
      await resend.emails.send({
        from: `${studioName} <onboarding@resend.dev>`,
        to: [designerEmail],
        subject: `${subs.length} new lead${subs.length !== 1 ? 's' : ''} today — ${studioName}`,
        html,
      })
      sent++
    } catch (err) {
      console.error(`Digest email failed for ${designer.slug}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
