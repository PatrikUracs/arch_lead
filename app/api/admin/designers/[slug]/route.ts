import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

const EDITABLE_FIELDS = new Set([
  'name', 'studio_name', 'email', 'portfolio_url', 'style_keywords',
  'typical_project_size', 'rate_per_sqm', 'bio', 'calendly_url',
  'response_tone', 'notification_preference', 'is_paid',
])

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  let updates: Record<string, unknown>
  try {
    updates = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Only allow known-safe fields
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (EDITABLE_FIELDS.has(k)) safe[k] = v
  }
  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await supabase.from('designers').update(safe).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'designer_updated',
    target_type: 'designer',
    target_id: slug,
    details: { fields_updated: Object.keys(safe) },
  })

  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: designer, error } = await supabase
    .from('designers')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !designer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ designer })
}
