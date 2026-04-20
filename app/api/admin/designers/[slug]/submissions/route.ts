import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const showArchived = req.nextUrl.searchParams.get('archived') === 'true'

  let query = supabase
    .from('submissions')
    .select('id, created_at, client_name, client_email, room_type, budget_range, lead_quality, status, render_status, results_page_token, brief, ai_response_draft, ai_response_subject, archived_at')
    .eq('designer_slug', slug)
    .order('created_at', { ascending: false })

  if (!showArchived) query = query.is('archived_at', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ submissions: data ?? [] })
}
