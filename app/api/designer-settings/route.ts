import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const VALID_PREFERENCES = ['instant', 'digest']

type PricingPayload = {
  notificationPreference?: string
  slug: string
  password: string
  pricingHourly?: boolean
  pricingFlat?: boolean
  pricingMinimum?: boolean
  pricingM2?: boolean
  pricingHourlyRate?: number | null
  pricingFlatRate?: number | null
  pricingMinimumAmount?: number | null
  pricingM2Rate?: number | null
  marketPositioning?: string | null
}

const VALID_POSITIONINGS = ['budget', 'mid', 'premium', 'luxury']

export async function PATCH(req: NextRequest) {
  let payload: PricingPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { notificationPreference, slug, password } = payload

  if (notificationPreference !== undefined && !VALID_PREFERENCES.includes(notificationPreference)) {
    return NextResponse.json({ error: 'Invalid preference' }, { status: 400 })
  }

  if (payload.marketPositioning !== undefined && payload.marketPositioning !== null && !VALID_POSITIONINGS.includes(payload.marketPositioning)) {
    return NextResponse.json({ error: 'Invalid market positioning' }, { status: 400 })
  }

  if (!slug || !password) {
    return NextResponse.json({ error: 'Missing slug or password' }, { status: 400 })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: designer } = await supabase
    .from('designers')
    .select('dashboard_password_hash')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!designer?.dashboard_password_hash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const match = await bcrypt.compare(password, designer.dashboard_password_hash)
  if (!match) {
    await new Promise((r) => setTimeout(r, 1500))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates: Record<string, unknown> = {}
  if (notificationPreference !== undefined) updates.notification_preference = notificationPreference
  if (payload.pricingHourly !== undefined) updates.pricing_hourly = payload.pricingHourly
  if (payload.pricingFlat !== undefined) updates.pricing_flat = payload.pricingFlat
  if (payload.pricingMinimum !== undefined) updates.pricing_minimum = payload.pricingMinimum
  if (payload.pricingM2 !== undefined) updates.pricing_m2 = payload.pricingM2
  if (payload.pricingHourlyRate !== undefined) updates.pricing_hourly_rate = payload.pricingHourlyRate
  if (payload.pricingFlatRate !== undefined) updates.pricing_flat_rate = payload.pricingFlatRate
  if (payload.pricingMinimumAmount !== undefined) updates.pricing_minimum_amount = payload.pricingMinimumAmount
  if (payload.pricingM2Rate !== undefined) updates.pricing_m2_rate = payload.pricingM2Rate
  if (payload.marketPositioning !== undefined) updates.market_positioning = payload.marketPositioning

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from('designers')
    .update(updates)
    .eq('slug', slug)
    .is('archived_at', null)

  if (error) {
    console.error('Designer settings update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
