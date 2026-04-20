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

  const showArchived = req.nextUrl.searchParams.get('archived') === 'true'

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: designers },
    { data: allSubmissions },
    { data: weekSubmissions },
    { data: renders },
  ] = await Promise.all([
    supabase
      .from('designers')
      .select('id, slug, name, studio_name, email, is_paid, notification_preference, response_tone, portfolio_url, style_keywords, typical_project_size, rate_per_sqm, bio, calendly_url, created_at, archived_at, portfolio_scrape_status')
      .order('created_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('designer_slug')
      .is('archived_at', null),
    supabase
      .from('submissions')
      .select('id, lead_quality, created_at')
      .gte('created_at', sevenDaysAgo)
      .is('archived_at', null),
    supabase
      .from('submissions')
      .select('id')
      .eq('render_status', 'complete')
      .gte('created_at', sevenDaysAgo)
      .is('archived_at', null),
  ])

  // Submission count per designer
  const subCounts: Record<string, number> = {}
  for (const s of (allSubmissions ?? [])) {
    subCounts[s.designer_slug] = (subCounts[s.designer_slug] ?? 0) + 1
  }

  const filteredDesigners = (designers ?? []).filter((d) =>
    showArchived ? d.archived_at !== null : d.archived_at === null
  )

  const designersWithCounts = filteredDesigners.map((d) => ({
    ...d,
    submission_count: subCounts[d.slug] ?? 0,
  }))

  // Lead quality breakdown
  const week = weekSubmissions ?? []
  const total = week.length
  const high = week.filter((s) => s.lead_quality === 'High').length
  const medium = week.filter((s) => s.lead_quality === 'Medium').length
  const low = week.filter((s) => s.lead_quality === 'Low').length

  const metrics = {
    total_designers: (designers ?? []).filter((d) => d.archived_at === null).length,
    submissions_this_week: total,
    renders_this_week: renders?.length ?? 0,
    quality_breakdown: total > 0
      ? {
          high: Math.round((high / total) * 100),
          medium: Math.round((medium / total) * 100),
          low: Math.round((low / total) * 100),
        }
      : { high: 0, medium: 0, low: 0 },
  }

  return NextResponse.json({ designers: designersWithCounts, metrics })
}
