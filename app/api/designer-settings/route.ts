import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const VALID_PREFERENCES = ['instant', 'digest']

export async function PATCH(req: NextRequest) {
  let notificationPreference: string
  try {
    const body = await req.json()
    notificationPreference = body.notificationPreference
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!VALID_PREFERENCES.includes(notificationPreference)) {
    return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })
  }

  const slug = process.env.NEXT_PUBLIC_DESIGNER_SLUG
  if (!slug || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('designers')
    .update({ notification_preference: notificationPreference })
    .eq('slug', slug)

  if (error) {
    console.error('Designer settings update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
