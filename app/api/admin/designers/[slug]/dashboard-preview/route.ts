import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1-hour expiry
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const token = crypto.randomUUID()

  const { error } = await supabase.from('admin_preview_tokens').insert({
    token,
    designer_slug: slug,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'dashboard_preview_opened',
    target_type: 'designer',
    target_id: slug,
    details: { token, expires_at: expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return NextResponse.json({ url: `${appUrl}/dashboard/${slug}?preview=${token}`, token })
}
