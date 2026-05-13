import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
    .select('id, render_status, render_urls, room_type, design_style, designer_slug')
    .eq('results_page_token', token)
    .is('archived_at', null)
    .single()

  if (error || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch designer (only safe public fields)
  const { data: designer } = await supabase
    .from('designers')
    .select('name, studio_name, calendly_url')
    .eq('slug', submission.designer_slug)
    .is('archived_at', null)
    .single()

  return NextResponse.json({
    submission: {
      id: submission.id,
      render_status: submission.render_status,
      render_urls: submission.render_urls,
      room_type: submission.room_type,
      design_style: submission.design_style,
    },
    designer: designer ?? null,
  })
}
