import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date().toISOString()

  const [{ error: dErr }, { error: sErr }] = await Promise.all([
    supabase.from('designers').update({ archived_at: now }).eq('slug', slug),
    supabase.from('submissions').update({ archived_at: now }).eq('designer_slug', slug).is('archived_at', null),
  ])

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })
  if (sErr) console.error('Partial error archiving submissions:', sErr)

  await supabase.from('admin_actions').insert({
    action_type: 'designer_archived',
    target_type: 'designer',
    target_id: slug,
    details: { archived_at: now },
  })

  return NextResponse.json({ success: true })
}
