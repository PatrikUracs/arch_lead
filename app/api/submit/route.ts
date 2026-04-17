import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'

export const runtime = 'nodejs'

type FormBody = {
  name: string
  email: string
  roomType: string
  roomSize: string
  designStyle: string
  budgetRange: string
  timeline: string
  additionalInfo?: string
  photoUrls: string[]
}

type DesignerProfile = {
  name: string
  studio_name: string | null
  portfolio_url: string | null
  style_keywords: string[]
  typical_project_size: string | null
  rate_per_sqm: string | null
  bio: string | null
}

const REQUIRED_FIELDS: (keyof Omit<FormBody, 'additionalInfo' | 'photoUrls'>)[] = [
  'name',
  'email',
  'roomType',
  'roomSize',
  'designStyle',
  'budgetRange',
  'timeline',
]

/* ── Fetch designer profile from Supabase ──────────────────────── */
async function fetchDesignerProfile(): Promise<DesignerProfile | null> {
  const slug = process.env.NEXT_PUBLIC_DESIGNER_SLUG
  if (!slug || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabase
      .from('designers')
      .select('name, studio_name, portfolio_url, style_keywords, typical_project_size, rate_per_sqm, bio')
      .eq('slug', slug)
      .single()

    if (error || !data) return null
    return data as DesignerProfile
  } catch {
    return null
  }
}

/* ── Download image and base64-encode it ───────────────────────── */
async function imageUrlToBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)
    ? contentType
    : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  return { data: Buffer.from(buffer).toString('base64'), mediaType }
}

/* ── Claude Vision: analyse room photos ─────────────────────────── */
async function analyseRoomPhotos(photoUrls: string[]): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return ''

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const images = await Promise.all(photoUrls.map(imageUrlToBase64))

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
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
              text: `You are assisting an interior designer in evaluating a client's room. Analyse the photo(s) and describe:
1. Room condition: good / needs cosmetic updates / needs renovation
2. Existing style: what style elements are present, what is worth keeping
3. Key constraints or challenges visible (low ceiling, awkward layout, dated finishes, etc.)

Be specific and concise. Maximum 120 words. Do not introduce yourself or add preamble.`,
            },
          ],
        },
      ],
    })

    return result.content[0].type === 'text' ? result.content[0].text : ''
  } catch (err) {
    console.error('Claude Vision error:', err)
    return ''
  }
}

/* ── Email helpers ──────────────────────────────────────────────── */
function briefToHtml(brief: string): string {
  return brief
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<br/>'
      if (/^\d+\)/.test(trimmed)) {
        return `<h3 style="margin:18px 0 6px;font-size:15px;font-weight:600;color:#111;">${trimmed}</h3>`
      }
      const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return `<p style="margin:0 0 8px;line-height:1.6;color:#333;">${formatted}</p>`
    })
    .join('\n')
}

function rawAnswersHtml(body: FormBody): string {
  const rows = [
    ['Name', body.name],
    ['Email', body.email],
    ['Room type', body.roomType],
    ['Room size', `${body.roomSize} m²`],
    ['Design style', body.designStyle],
    ['Budget range', body.budgetRange],
    ['Timeline', body.timeline],
    ['Additional info', body.additionalInfo || '—'],
  ]
  return rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;font-weight:600;color:#555;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:8px 12px;color:#333;font-size:13px;">${value}</td>
        </tr>`
    )
    .join('')
}

function photoLinksHtml(photoUrls: string[]): string {
  if (!photoUrls.length) return ''
  const links = photoUrls
    .map(
      (url, i) =>
        `<a href="${url}" style="display:inline-block;margin-right:12px;color:#376E6F;font-size:13px;text-decoration:none;border-bottom:1px solid #376E6F;">View photo ${i + 1}</a>`
    )
    .join('')
  return `
<div style="margin-top:24px;padding:16px;background:#f0f9f9;border-radius:6px;border-left:3px solid #376E6F;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#376E6F;">Room photos</p>
  <p style="margin:0;font-size:12px;color:#888;margin-bottom:8px;">Links expire after 24 hours.</p>
  ${links}
</div>`
}

/* ── Route handler ──────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: FormBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Server-side validation
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  const roomSize = Number(body.roomSize)
  if (isNaN(roomSize) || roomSize < 10 || roomSize > 500) {
    return NextResponse.json({ error: 'Invalid room size' }, { status: 400 })
  }

  if (!Array.isArray(body.photoUrls) || body.photoUrls.length === 0) {
    return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 })
  }

  const designerName = process.env.DESIGNER_NAME || 'Patrik Uracs'
  const designerEmail = process.env.DESIGNER_EMAIL

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (!designerEmail) {
    console.error('DESIGNER_EMAIL is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // ── 1. Run Vision + fetch designer profile in parallel ────────────────────
  const [roomAssessment, designerProfile] = await Promise.all([
    analyseRoomPhotos(body.photoUrls),
    fetchDesignerProfile(),
  ])

  // ── 2. Build designer context for Groq prompt ─────────────────────────────
  const designerContext = designerProfile
    ? `
Designer style profile:
- Name: ${designerProfile.name}
- Style keywords: ${designerProfile.style_keywords.join(', ') || 'not specified'}
- Typical project size: ${designerProfile.typical_project_size || 'not specified'}
- Rate per m²: ${designerProfile.rate_per_sqm || 'not specified'}
${designerProfile.bio ? `- Bio: ${designerProfile.bio}` : ''}

Write this brief specifically for ${designerProfile.name}. Reference their aesthetic and rate structure where relevant.`
    : ''

  const roomContext = roomAssessment
    ? `
Room assessment from uploaded photos:
${roomAssessment}
`
    : ''

  // ── 3. Generate brief with Groq ───────────────────────────────────────────
  const systemPrompt =
    "You are an assistant helping an interior designer pre-qualify client leads. You receive a client's project details and write a structured project brief the designer will read before deciding whether to respond. Be concise, professional, and specific. Write in English."

  const userPrompt = `A new client submitted an inquiry. Here are their details:
Name: ${body.name}
Email: ${body.email}
Room type: ${body.roomType}
Room size: ${body.roomSize}m²
Design style: ${body.designStyle}
Budget range: ${body.budgetRange}
Timeline: ${body.timeline}
Additional notes: ${body.additionalInfo?.trim() || 'None'}
${roomContext}${designerContext}

Write a project brief with these sections:
1) Project summary (2–3 sentences)
2) Client profile (what kind of client this seems to be, their priorities)
3) Scope assessment (what the project likely involves — reference the room photos if available)
4) Budget & timeline fit (honest assessment of whether the budget is realistic for the scope${designerProfile?.rate_per_sqm ? `, given the designer's rate of ${designerProfile.rate_per_sqm}` : ''})
5) Recommended next step (what the designer should do — e.g. schedule a call, ask for more info, decline politely)

End with a "Lead quality" line: rate it High / Medium / Low with one sentence of reasoning.`

  let brief: string
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    brief = result.choices[0]?.message?.content ?? ''
  } catch (err) {
    console.error('Groq API error:', err)
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }

  // ── 4. Send emails via Resend ─────────────────────────────────────────────
  const resend = new Resend(process.env.RESEND_API_KEY)

  const roomAssessmentHtml = roomAssessment
    ? `
<div style="margin:24px 0;padding:20px;background:#f0f9f9;border-radius:6px;border-left:3px solid #376E6F;">
  <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#376E6F;">Room assessment (Claude Vision)</h3>
  <p style="margin:0;font-size:13px;line-height:1.7;color:#333;">${roomAssessment.replace(/\n/g, '<br/>')}</p>
</div>`
    : ''

  const designerEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f9f9f9;margin:0;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;">${designerName}</h1>
      <p style="color:#aaa;margin:4px 0 0;font-size:13px;">New client inquiry</p>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 20px;">AI-Generated Project Brief</h2>
      ${briefToHtml(brief)}
      ${roomAssessmentHtml}
      ${photoLinksHtml(body.photoUrls)}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;"/>
      <h2 style="font-size:16px;font-weight:700;color:#111;margin:0 0 16px;">Raw Form Answers</h2>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;overflow:hidden;">
        <tbody>
          ${rawAnswersHtml(body)}
        </tbody>
      </table>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Submitted via your client intake form</p>
    </div>
  </div>
</body>
</html>`

  const clientEmailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f9f9f9;margin:0;padding:24px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;">${designerName}</h1>
      <p style="color:#aaa;margin:4px 0 0;font-size:13px;">Thoughtful spaces for modern living</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#111;margin:0 0 16px;">Hi ${body.name},</p>
      <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 20px;">
        Thank you for reaching out to ${designerName}. We've received your inquiry and will review it shortly.
      </p>
      <div style="background:#f9fafb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 14px;">What you submitted</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;width:40%;">Room type</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.roomType}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;">Room size</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.roomSize} m²</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;">Design style</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.designStyle}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;">Budget range</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.budgetRange}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;">Timeline</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.timeline}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6b7280;">Photos uploaded</td>
              <td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.photoUrls.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 8px;">
        ${designerName.split(' ')[0]} will personally review your project details and be in touch within <strong>2 business days</strong>.
      </p>
      <p style="font-size:14px;color:#444;line-height:1.7;margin:0;">
        In the meantime, feel free to reply to this email with any questions.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">${designerName} · Interior Design</p>
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: `${designerName} <onboarding@resend.dev>`,
      to: [designerEmail],
      subject: `New client inquiry — ${body.roomType}, ${body.budgetRange}`,
      html: designerEmailHtml,
    })
  } catch (err) {
    console.error('Resend error (designer email):', err)
    return NextResponse.json({ error: 'Failed to send designer email' }, { status: 500 })
  }

  try {
    await resend.emails.send({
      from: `${designerName} <onboarding@resend.dev>`,
      to: [body.email],
      subject: `We received your inquiry — ${designerName}`,
      html: clientEmailHtml,
    })
  } catch (err) {
    console.error('Resend error (client email):', err)
    // Don't fail the whole request if only the client confirmation fails
    console.warn('Client confirmation email failed but designer email was sent successfully')
  }

  // ── 5. Log submission to Supabase + trigger background render ─────────────
  const slug = process.env.NEXT_PUBLIC_DESIGNER_SLUG
  if (slug && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Parse lead quality from brief (last line: "Lead quality: High/Medium/Low — ...")
    let leadQuality: string | null = null
    const match = brief.match(/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i)
    if (match) leadQuality = match[1]

    const token = crypto.randomUUID()

    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        designer_slug: slug,
        client_name: body.name,
        client_email: body.email,
        room_type: body.roomType,
        room_size: body.roomSize,
        design_style: body.designStyle,
        budget_range: body.budgetRange,
        timeline: body.timeline,
        additional_info: body.additionalInfo || null,
        photo_urls: body.photoUrls,
        brief,
        lead_quality: leadQuality,
        render_status: 'pending',
        results_page_token: token,
        status: 'New',
      })
      .select('id, results_page_token')
      .single()

    if (!insertError && submission && process.env.NEXT_PUBLIC_APP_URL) {
      const renderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/render`
      console.log('Triggering render:', renderUrl, 'submissionId:', submission.id)
      waitUntil(
        fetch(renderUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: submission.id }),
        })
          .then(r => console.log('Render trigger response:', r.status))
          .catch((err) => console.error('Render trigger failed:', err))
      )
    } else {
      console.log('Render NOT triggered — insertError:', insertError, 'submission:', !!submission, 'APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
    }
  }

  return NextResponse.json({ success: true })
}
