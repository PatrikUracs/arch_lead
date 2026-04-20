import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: designer, error: fetchErr } = await supabase
    .from('designers')
    .select('is_paid')
    .eq('slug', slug)
    .single()

  if (fetchErr || !designer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newValue = !designer.is_paid
  const { error } = await supabase.from('designers').update({ is_paid: newValue }).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'plan_toggled',
    target_type: 'designer',
    target_id: slug,
    details: { from: designer.is_paid, to: newValue },
  })

  return NextResponse.json({ success: true, is_paid: newValue })
}
