import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const password = req.headers.get('x-dashboard-password')
  if (!password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: designerCheck } = await supabase
    .from('designers')
    .select('slug, dashboard_password_hash')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!designerCheck?.dashboard_password_hash) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const match = await bcrypt.compare(password, designerCheck.dashboard_password_hash)
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: submissions }, { data: designer }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, created_at, client_name, client_email, room_type, budget_range, lead_quality, status, render_status, results_page_token, brief, ai_response_draft, ai_response_subject, offer_direction')
      .eq('designer_slug', slug)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('designers')
      .select('name, studio_name, notification_preference, ai_style_profile, portfolio_scrape_status, pricing_hourly, pricing_flat, pricing_minimum, pricing_m2, pricing_hourly_rate, pricing_flat_rate, pricing_minimum_amount, pricing_m2_rate, market_positioning')
      .eq('slug', slug)
      .is('archived_at', null)
      .single(),
  ])

  return NextResponse.json({
    submissions: submissions ?? [],
    designer: designer ?? null,
  })
}
