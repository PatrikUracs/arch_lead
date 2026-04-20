import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let password: string
  let slug: string
  try {
    const body = await req.json()
    password = body.password
    slug = body.slug
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!slug || !password) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data } = await supabase
    .from('designers')
    .select('dashboard_password_hash')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!data?.dashboard_password_hash) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const match = await bcrypt.compare(password, data.dashboard_password_hash)
  return NextResponse.json({ ok: match })
}
