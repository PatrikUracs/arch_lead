import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { generateUniqueSlug } from '@/tools/slug'

export const runtime = 'nodejs'

type OnboardBody = {
  name: string
  email: string
  studioName?: string
  portfolioUrl?: string
  styleKeywords: string[]
  typicalProjectSize?: string
  ratePerSqm?: string
  bio?: string
  responseTone?: string
  calendlyUrl?: string
  notificationPreference?: string
  password: string
  ref?: string
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req)
  } catch (err) {
    console.error('Unhandled onboard error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

async function handlePost(req: NextRequest) {
  let body: OnboardBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars not set')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const slug = await generateUniqueSlug(
    body.studioName?.trim() || body.name.trim(),
    supabase
  )

  const passwordHash = await bcrypt.hash(body.password, 10)
  const verificationToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  // Validate referral slug if provided
  let validRef: string | null = null
  let referredByName: string | null = null
  if (body.ref?.trim()) {
    const { data: referrer } = await supabase
      .from('designers')
      .select('slug, studio_name, name')
      .eq('slug', body.ref.trim())
      .is('archived_at', null)
      .maybeSingle()
    if (referrer) {
      validRef = referrer.slug
      referredByName = referrer.studio_name || referrer.name
    }
  }

  const { error } = await supabase
    .from('designers')
    .insert({
      slug,
      name: body.name.trim(),
      email: body.email.trim(),
      studio_name: body.studioName?.trim() || null,
      portfolio_url: body.portfolioUrl?.trim() || null,
      style_keywords: body.styleKeywords ?? [],
      typical_project_size: body.typicalProjectSize?.trim() || null,
      rate_per_sqm: body.ratePerSqm?.trim() || null,
      bio: body.bio?.trim() || null,
      response_tone: body.responseTone?.trim() || null,
      calendly_url: body.calendlyUrl?.trim() || null,
      notification_preference: body.notificationPreference ?? 'instant',
      dashboard_password_hash: passwordHash,
      referred_by: validRef,
      email_verified: false,
      email_verification_token: verificationToken,
    })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 })
  }

  // Increment referrer's months earned, capped at 1
  // Setting to 1 WHERE < 1 is equivalent to +1 with a cap of 1 (default is 0)
  if (validRef) {
    await supabase.from('designers')
      .update({ referral_months_earned: 1 })
      .eq('slug', validRef)
      .lt('referral_months_earned', 1)
      .is('archived_at', null)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Send verification email — best-effort, non-fatal
  if (appUrl && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const verifyUrl = `${appUrl}/api/verify-email?token=${verificationToken}`
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails.send({
      from: `Spacio <${process.env.RESEND_FROM_EMAIL}>`,
      to: [body.email.trim()],
      subject: 'Confirm your Spacio account',
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:6px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Confirm your email address</h2>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">
      Click the button below to verify your email and activate your Spacio account.
    </p>
    <a href="${verifyUrl}" style="background:#111;color:#fff;padding:12px 24px;font-size:13px;text-decoration:none;display:inline-block;border-radius:4px;">Verify email address</a>
    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">If you didn't sign up for Spacio, you can ignore this email.</p>
  </div>
</body></html>`,
    }).catch((err) => console.error('Verification email failed:', err))
  }

  if (appUrl && body.portfolioUrl?.trim()) {
    waitUntil(
      fetch(`${appUrl}/api/scrape-portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' },
        body: JSON.stringify({ designer_slug: slug }),
      }).catch((err) => console.error('Scrape-portfolio trigger failed:', err))
    )
  }

  return NextResponse.json({
    success: true,
    slug,
    intakeUrl: `${appUrl}/a/${slug}`,
    dashboardUrl: `${appUrl}/dashboard/${slug}`,
    referredByName,
  })
}
