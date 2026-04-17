import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET() {
  const slug = process.env.NEXT_PUBLIC_DESIGNER_SLUG
  if (!slug || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: submissions }, { data: designer }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, created_at, client_name, client_email, room_type, budget_range, lead_quality, status, render_status, results_page_token, brief')
      .eq('designer_slug', slug)
      .order('created_at', { ascending: false }),
    supabase
      .from('designers')
      .select('name, studio_name, notification_preference, ai_style_profile, portfolio_scrape_status')
      .eq('slug', slug)
      .single(),
  ])

  return NextResponse.json({
    submissions: submissions ?? [],
    designer: designer ?? null,
  })
}
