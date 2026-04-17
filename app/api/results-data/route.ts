import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, render_status, render_urls, room_type, design_style, brief, designer_slug, results_page_token')
    .eq('results_page_token', token)
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch designer (only safe public fields)
  const { data: designer } = await supabase
    .from('designers')
    .select('name, studio_name, calendly_url, is_paid')
    .eq('slug', submission.designer_slug)
    .single()

  return NextResponse.json({
    submission: {
      id: submission.id,
      render_status: submission.render_status,
      render_urls: submission.render_urls,
      room_type: submission.room_type,
      design_style: submission.design_style,
      brief: submission.brief,
      results_page_token: submission.results_page_token,
    },
    designer: designer ?? null,
  })
}
