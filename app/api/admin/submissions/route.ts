import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const params = req.nextUrl.searchParams
  const designerFilter = params.get('designer')
  const statusFilter = params.get('status')
  const qualityFilter = params.get('quality')
  const searchFilter = params.get('search')
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const showArchived = params.get('archived') === 'true'

  let query = supabase
    .from('submissions')
    .select('id, created_at, designer_slug, client_name, client_email, room_type, room_size, design_style, budget_range, timeline, lead_quality, status, render_status, results_page_token, brief, ai_response_draft, ai_response_subject, archived_at')
    .order('created_at', { ascending: false })

  if (!showArchived) query = query.is('archived_at', null)
  if (designerFilter) query = query.eq('designer_slug', designerFilter)
  if (statusFilter) query = query.eq('status', statusFilter)
  if (qualityFilter) query = query.eq('lead_quality', qualityFilter)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data: submissions, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let filtered = submissions ?? []
  if (searchFilter) {
    const s = searchFilter.toLowerCase()
    filtered = filtered.filter(
      (sub) =>
        sub.client_name?.toLowerCase().includes(s) ||
        sub.client_email?.toLowerCase().includes(s)
    )
  }

  return NextResponse.json({ submissions: filtered })
}
