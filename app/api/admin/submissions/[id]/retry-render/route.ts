import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { id } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'Missing APP_URL' }, { status: 500 })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Reset render status before retrying
  await supabase.from('submissions').update({ render_status: 'pending' }).eq('id', id)

  fetch(`${appUrl}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId: id }),
  }).catch((err) => console.error('Retry render failed:', err))

  await supabase.from('admin_actions').insert({
    action_type: 'render_retried',
    target_type: 'submission',
    target_id: id,
    details: {},
  })

  return NextResponse.json({ success: true })
}
