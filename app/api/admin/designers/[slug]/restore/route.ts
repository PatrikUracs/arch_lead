import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await supabase.from('designers').update({ archived_at: null }).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'designer_restored',
    target_type: 'designer',
    target_id: slug,
    details: {},
  })

  return NextResponse.json({ success: true })
}
