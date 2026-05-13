import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const VALID_STATUSES = ['New', 'Contacted', 'Converted', 'Not a fit']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  let status: string
  let slug: string
  let password: string
  try {
    const body = await req.json()
    status = body.status
    slug = body.slug
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (!slug || !password) {
    return NextResponse.json({ error: 'Missing slug or password' }, { status: 401 })
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
    .from('submissions')
    .update({ status })
    .eq('id', id)
    .eq('designer_slug', slug)
    .is('archived_at', null)

  if (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
