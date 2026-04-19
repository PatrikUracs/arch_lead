import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { RENDERS_ENABLED } from '@/lib/flags'

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
  designer_slug: string
}

type DesignerRow = {
  slug: string
  name: string
  email: string | null
  studio_name: string | null
  style_keywords: string[]
  typical_project_size: string | null
  rate_per_sqm: string | null
  bio: string | null
  response_tone: string | null
  is_paid: boolean
  notification_preference: string
  ai_style_profile: string | null
  calendly_url: string | null
}

const REQUIRED_FIELDS: (keyof Omit<FormBody, 'additionalInfo' | 'photoUrls' | 'designer_slug'>)[] = [
  'name', 'email', 'roomType', 'roomSize', 'designStyle', 'budgetRange', 'timeline',
]

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
      messages: [{
        role: 'user',
        content: [
          ...images.map((img) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
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
      }],
    })
    return result.content[0].type === 'text' ? result.content[0].text : ''
  } catch (err) {
    console.error('Claude Vision error:', err)
    return ''
  }
}

/* ── Groq fallback: text-only room assessment ───────────────────── */
async function analyseRoomPhotosGroqFallback(body: Pick<FormBody, 'roomType' | 'roomSize' | 'designStyle' | 'additionalInfo'>): Promise<string> {
  if (!process.env.GROQ_API_KEY) return ''
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const result = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `An interior designer is reviewing a client inquiry. Room: ${body.roomType}, ${body.roomSize}m², desired style: ${body.designStyle}. Additional notes: ${body.additionalInfo || 'none'}. Write a brief 2-sentence assessment of likely room conditions and key considerations for this project. Be specific and concise.`,
      }],
    })
    return result.choices[0]?.message?.content?.trim() ?? ''
  } catch {
    return ''
  }
}

/* ── AI response email draft ────────────────────────────────────── */
function detectLanguage(text: string): 'hu' | 'en' {
  if (!text?.trim()) return 'hu'
  return /[áéíóöőúüű]/i.test(text) ? 'hu' : 'en'
}

async function generateResponseDraft(
  body: FormBody,
  designer: DesignerRow,
  leadQuality: string | null
): Promise<{ draft: string | null; subject: string }> {
  const lang = detectLanguage(body.additionalInfo ?? '')
  const subject = lang === 'hu'
    ? `Válasz: A(z) ${body.roomType} projekted`
    : `Re: Your ${body.roomType} project`

  if (!process.env.ANTHROPIC_API_KEY) return { draft: null, subject }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const tone = designer.response_tone ?? 'warm and personal'
    const styleKeywords = designer.style_keywords?.join(', ') || 'refined, contemporary'
    const fullName = designer.name
    const studioName = designer.studio_name || fullName

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: "You are drafting a personalized email that an interior designer will send to a potential client who just submitted an inquiry. You are writing as the designer, in first person. The email should feel human, specific to the client's project, and match the designer's preferred tone. Do not invent facts — only reference details the client actually provided. End with a clear suggested next step. Write in the same language the client used in their inquiry (detect automatically). Hungarian inquiries get Hungarian responses, English gets English, etc.",
      messages: [{
        role: 'user',
        content: `Draft a response email from ${fullName} of ${studioName} to a new client. The client's details:
Name: ${body.name}
Room type: ${body.roomType}
Size: ${body.roomSize} m²
Style preference: ${body.designStyle}
Budget: ${body.budgetRange}
Timeline: ${body.timeline}
Additional context from client: ${body.additionalInfo?.trim() || 'None'}
Designer's preferred tone: ${tone}
Designer's style specialty: ${styleKeywords}
Lead quality assessment from our system: ${leadQuality ?? 'Unknown'}

Write the response email with:
- An opening that acknowledges their specific project (room type + style)
- One sentence showing genuine interest in a specific detail they mentioned
- Brief indication of next steps (suggest a 20-minute call, or request photos if they haven't been uploaded, or — if lead quality is Low — politely suggest they may be better served by a different type of designer)
- A warm closing signed off as ${fullName}

Do not include a subject line. Do not include salutation placeholders like [Name] — use the actual name. Do not include any text outside the email body itself. Keep it under 150 words.`,
      }],
    })
    const draft = result.content[0]?.type === 'text' ? result.content[0].text : null
    return { draft, subject }
  } catch (err) {
    console.error('Response draft generation failed:', err)
    return { draft: null, subject }
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
  return rows.map(([label, value]) =>
    `<tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;color:#333;font-size:13px;">${value}</td>
    </tr>`
  ).join('')
}

function photoLinksHtml(photoUrls: string[]): string {
  if (!photoUrls.length) return ''
  const links = photoUrls.map((url, i) =>
    `<a href="${url}" style="display:inline-block;margin-right:12px;color:#376E6F;font-size:13px;text-decoration:none;border-bottom:1px solid #376E6F;">View photo ${i + 1}</a>`
  ).join('')
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

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  if (!body.designer_slug?.trim()) {
    return NextResponse.json({ error: 'Missing designer_slug' }, { status: 400 })
  }

  const roomSize = Number(body.roomSize)
  if (isNaN(roomSize) || roomSize < 10 || roomSize > 500) {
    return NextResponse.json({ error: 'Invalid room size' }, { status: 400 })
  }

  if (!Array.isArray(body.photoUrls) || body.photoUrls.length === 0) {
    return NextResponse.json({ error: 'At least one photo is required' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // ── 0. Look up designer — abort before any AI calls if not found ──
  const { data: designer, error: designerErr } = await supabase
    .from('designers')
    .select('slug, name, email, studio_name, style_keywords, typical_project_size, rate_per_sqm, bio, response_tone, is_paid, notification_preference, ai_style_profile, calendly_url')
    .eq('slug', body.designer_slug.trim())
    .is('archived_at', null)
    .single()

  if (designerErr || !designer) {
    return NextResponse.json({ error: 'Designer not found' }, { status: 404 })
  }

  const designerRow = designer as DesignerRow
  const designerEmail = designerRow.email
  const designerName = designerRow.studio_name || designerRow.name

  if (!designerEmail) {
    console.error('Designer has no email set:', designerRow.slug)
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // ── 1. Run Vision + designer profile in parallel ────────────────
  const roomAssessmentRaw = await analyseRoomPhotos(body.photoUrls)
  const roomAssessment = roomAssessmentRaw || await analyseRoomPhotosGroqFallback(body)

  // ── 2. Build designer context for Groq prompt ───────────────────
  const designerContext = `
Designer style profile:
- Name: ${designerRow.name}
- Style keywords: ${designerRow.style_keywords?.join(', ') || 'not specified'}
- Typical project size: ${designerRow.typical_project_size || 'not specified'}
- Rate per m²: ${designerRow.rate_per_sqm || 'not specified'}
${designerRow.bio ? `- Bio: ${designerRow.bio}` : ''}

Write this brief specifically for ${designerRow.name}. Reference their aesthetic and rate structure where relevant.`

  const roomContext = roomAssessment
    ? `\nRoom assessment from uploaded photos:\n${roomAssessment}\n`
    : ''

  // ── 3. Generate brief with Groq ─────────────────────────────────
  const systemPrompt = "You are an assistant helping an interior designer pre-qualify client leads. You receive a client's project details and write a structured project brief the designer will read before deciding whether to respond. Be concise, professional, and specific. Write in English."

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
4) Budget & timeline fit (honest assessment of whether the budget is realistic for the scope${designerRow.rate_per_sqm ? `, given the designer's rate of ${designerRow.rate_per_sqm}` : ''})
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

  let leadQuality: string | null = null
  const lqMatch = brief.match(/Lead quality[:\s]+\*{0,2}(High|Medium|Low)\*{0,2}/i)
  if (lqMatch) leadQuality = lqMatch[1]

  // ── 4. Generate response draft + send emails in parallel ────────
  const resend = new Resend(process.env.RESEND_API_KEY)

  const roomAssessmentHtml = roomAssessment
    ? `<div style="margin:24px 0;padding:20px;background:#f0f9f9;border-radius:6px;border-left:3px solid #376E6F;">
  <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#376E6F;">Room assessment (Claude Vision)</h3>
  <p style="margin:0;font-size:13px;line-height:1.7;color:#333;">${roomAssessment.replace(/\n/g, '<br/>')}</p>
</div>`
    : ''

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const dashboardUrl = `${appUrl}/dashboard/${designerRow.slug}`

  const designerEmailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
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
        <tbody>${rawAnswersHtml(body)}</tbody>
      </table>
      <div style="margin-top:28px;text-align:center;">
        <a href="${dashboardUrl}" style="background:#111;color:#fff;padding:12px 24px;font-size:12px;text-decoration:none;display:inline-block;border-radius:4px;">View in dashboard</a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Submitted via your client intake form</p>
    </div>
  </div>
</body></html>`

  const clientEmailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
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
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;width:40%;">Room type</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.roomType}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Room size</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.roomSize} m²</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Design style</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.designStyle}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Budget range</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.budgetRange}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Timeline</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.timeline}</td></tr>
            <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Photos uploaded</td><td style="padding:5px 0;font-size:13px;color:#111;font-weight:500;">${body.photoUrls.length}</td></tr>
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
</body></html>`

  const [designerEmailResult, responseDraft, clientEmailResult] = await Promise.allSettled([
    resend.emails.send({
      from: `${designerName} <onboarding@resend.dev>`,
      to: [designerEmail],
      subject: `New client inquiry — ${body.roomType}, ${body.budgetRange}`,
      html: designerEmailHtml,
    }),
    generateResponseDraft(body, designerRow, leadQuality),
    resend.emails.send({
      from: `${designerName} <onboarding@resend.dev>`,
      to: [body.email],
      subject: `We received your inquiry — ${designerName}`,
      html: clientEmailHtml,
    }),
  ])

  if (designerEmailResult.status === 'rejected') {
    console.error('Resend error (designer email):', designerEmailResult.reason)
    return NextResponse.json({ error: 'Failed to send designer email' }, { status: 500 })
  }

  if (clientEmailResult.status === 'rejected') {
    console.error('Resend error (client email):', clientEmailResult.reason)
  }

  const responseDraftData = responseDraft.status === 'fulfilled'
    ? responseDraft.value
    : { draft: null, subject: '' }

  // ── 5. Log submission + trigger render if Pro ───────────────────
  const token = crypto.randomUUID()

  const { data: submission, error: insertError } = await supabase
    .from('submissions')
    .insert({
      designer_slug: designerRow.slug,
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
      ai_response_draft: responseDraftData.draft,
      ai_response_subject: responseDraftData.subject,
      // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
      render_status: RENDERS_ENABLED && designerRow.is_paid ? 'pending' : 'not_applicable',
      results_page_token: token,
      status: 'New',
    })
    .select('id, results_page_token')
    .single()

  // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  if (!insertError && submission && RENDERS_ENABLED && designerRow.is_paid && appUrl) {
    waitUntil(
      fetch(`${appUrl}/api/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
        },
        body: JSON.stringify({ submissionId: submission.id }),
      })
        .then(r => console.log('Render trigger response:', r.status))
        .catch((err) => console.error('Render trigger failed:', err))
    )
  }

  return NextResponse.json({ success: true })
}
