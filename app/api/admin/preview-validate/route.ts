import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false }, { status: 400 })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ valid: false }, { status: 500 })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('admin_preview_tokens')
    .select('designer_slug, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) return NextResponse.json({ valid: false })

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' })
  }

  // Fetch designer name for the banner
  const { data: designer } = await supabase
    .from('designers')
    .select('name, studio_name')
    .eq('slug', data.designer_slug)
    .single()

  return NextResponse.json({
    valid: true,
    designer_slug: data.designer_slug,
    designer_name: designer?.studio_name || designer?.name || data.designer_slug,
  })
}
