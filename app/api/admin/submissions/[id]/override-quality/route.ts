import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { id } = params
  let quality: string, reason: string
  try {
    const body = await req.json()
    quality = body.quality
    reason = body.reason
    if (!quality || !reason) throw new Error('Missing fields')
  } catch {
    return NextResponse.json({ error: 'quality and reason are required' }, { status: 400 })
  }

  if (!['High', 'Medium', 'Low'].includes(quality)) {
    return NextResponse.json({ error: 'Invalid quality value' }, { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: submission } = await supabase
    .from('submissions')
    .select('lead_quality, designer_slug')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('submissions').update({ lead_quality: quality }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'quality_overridden',
    target_type: 'submission',
    target_id: id,
    details: { from: submission?.lead_quality, to: quality, reason, designer_slug: submission?.designer_slug },
  })

  return NextResponse.json({ success: true })
}
