import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type OnboardBody = {
  slug: string
  name: string
  studioName?: string
  portfolioUrl?: string
  styleKeywords: string[]
  typicalProjectSize?: string
  ratePerSqm?: string
  bio?: string
  calendlyUrl?: string
  key: string
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

  const secret = process.env.ONBOARD_SECRET
  if (secret && body.key !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (!body.slug?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: 'Slug and name are required.' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars not set')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('designers')
    .upsert(
      {
        slug: body.slug.trim(),
        name: body.name.trim(),
        studio_name: body.studioName?.trim() || null,
        portfolio_url: body.portfolioUrl?.trim() || null,
        style_keywords: body.styleKeywords ?? [],
        typical_project_size: body.typicalProjectSize?.trim() || null,
        rate_per_sqm: body.ratePerSqm?.trim() || null,
        bio: body.bio?.trim() || null,
        calendly_url: body.calendlyUrl?.trim() || null,
      },
      { onConflict: 'slug' }
    )

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Failed to save profile.' }, { status: 500 })
  }

  if (process.env.NEXT_PUBLIC_APP_URL && body.portfolioUrl?.trim()) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scrape-portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designer_slug: body.slug.trim() }),
    }).catch((err) => console.error('Scrape-portfolio trigger failed:', err))
  }

  return NextResponse.json({ success: true })
}
