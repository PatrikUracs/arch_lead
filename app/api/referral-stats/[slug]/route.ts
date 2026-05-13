import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug.' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: designer }, { count }] = await Promise.all([
    supabase
      .from('designers')
      .select('referral_months_earned')
      .eq('slug', slug)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('designers')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', slug)
      .is('archived_at', null),
  ])

  if (!designer) {
    return NextResponse.json({ error: 'Designer not found.' }, { status: 404 })
  }

  return NextResponse.json({
    referralCount: count ?? 0,
    monthsEarned: designer.referral_months_earned ?? 0,
  })
}
