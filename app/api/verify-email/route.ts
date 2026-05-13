import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!token || token.length < 32) {
    return NextResponse.redirect(`${appUrl}/onboard?verified=invalid`)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.redirect(`${appUrl}/onboard?verified=error`)
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch first to check token age before consuming it
  const { data: match } = await supabase
    .from('designers')
    .select('slug, created_at')
    .eq('email_verification_token', token)
    .is('archived_at', null)
    .single()

  if (!match) {
    return NextResponse.redirect(`${appUrl}/onboard?verified=invalid`)
  }

  // Tokens older than 72 hours are expired (token is set once at signup, never regenerated)
  const tokenAgeMs = Date.now() - new Date(match.created_at).getTime()
  if (tokenAgeMs > 72 * 60 * 60 * 1000) {
    return NextResponse.redirect(`${appUrl}/onboard?verified=expired`)
  }

  const { data, error } = await supabase
    .from('designers')
    .update({ email_verified: true, email_verification_token: null })
    .eq('email_verification_token', token)
    .is('archived_at', null)
    .select('slug')
    .single()

  if (error || !data) {
    return NextResponse.redirect(`${appUrl}/onboard?verified=invalid`)
  }

  return NextResponse.redirect(`${appUrl}/dashboard/${data.slug}?verified=1`)
}
