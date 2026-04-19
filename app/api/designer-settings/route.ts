import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const VALID_PREFERENCES = ['instant', 'digest']

export async function PATCH(req: NextRequest) {
  let notificationPreference: string
  let slug: string
  let password: string
  try {
    const body = await req.json()
    notificationPreference = body.notificationPreference
    slug = body.slug
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!VALID_PREFERENCES.includes(notificationPreference)) {
    return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })
  }

  if (!slug || !password) {
    return NextResponse.json({ error: 'Missing slug or password' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: designer } = await supabase
    .from('designers')
    .select('dashboard_password_hash')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!designer?.dashboard_password_hash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const match = await bcrypt.compare(password, designer.dashboard_password_hash)
  if (!match) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('designers')
    .update({ notification_preference: notificationPreference })
    .eq('slug', slug)
    .is('archived_at', null)

  if (error) {
    console.error('Designer settings update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
