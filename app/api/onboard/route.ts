import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import bcrypt from 'bcryptjs'
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
    })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (appUrl && body.portfolioUrl?.trim()) {
    waitUntil(
      fetch(`${appUrl}/api/scrape-portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designer_slug: slug }),
      }).catch((err) => console.error('Scrape-portfolio trigger failed:', err))
    )
  }

  return NextResponse.json({
    success: true,
    slug,
    intakeUrl: `${appUrl}/a/${slug}`,
    dashboardUrl: `${appUrl}/dashboard/${slug}`,
  })
}
