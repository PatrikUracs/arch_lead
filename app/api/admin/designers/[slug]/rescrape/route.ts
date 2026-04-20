import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'Missing APP_URL' }, { status: 500 })

  // Fire and forget
  fetch(`${appUrl}/api/scrape-portfolio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designer_slug: slug }),
  }).catch((err) => console.error('Rescrape trigger failed:', err))

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await supabase.from('admin_actions').insert({
    action_type: 'portfolio_rescrape_triggered',
    target_type: 'designer',
    target_id: slug,
    details: {},
  })

  return NextResponse.json({ success: true })
}
