import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

type ServiceStatus = {
  status: 'ok' | 'degraded' | 'failing'
  label: string
  detail?: string
}

async function checkResend(): Promise<ServiceStatus> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { status: 'failing', label: 'Failing', detail: 'No API key' }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) return { status: 'ok', label: 'Operational' }
    return { status: 'degraded', label: 'Degraded', detail: `HTTP ${res.status}` }
  } catch {
    return { status: 'failing', label: 'Failing' }
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 'failing', label: 'Failing', detail: 'No config' }
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase.from('designers').select('id').limit(1)
    if (error) return { status: 'failing', label: 'Failing', detail: (error as { message?: string }).message }
    return { status: 'ok', label: 'Operational' }
  } catch {
    return { status: 'failing', label: 'Failing' }
  }
}

async function checkAnthropic(): Promise<ServiceStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { status: 'failing', label: 'Failing', detail: 'No API key' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) return { status: 'ok', label: 'Operational' }
    if (res.status === 529) return { status: 'degraded', label: 'Degraded', detail: 'Overloaded' }
    return { status: 'degraded', label: 'Degraded', detail: `HTTP ${res.status}` }
  } catch {
    return { status: 'failing', label: 'Failing' }
  }
}

async function checkReplicate(): Promise<ServiceStatus> {
  const key = process.env.REPLICATE_API_TOKEN
  if (!key) return { status: 'failing', label: 'Failing', detail: 'No API key' }
  try {
    const res = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) return { status: 'ok', label: 'Operational' }
    return { status: 'degraded', label: 'Degraded', detail: `HTTP ${res.status}` }
  } catch {
    return { status: 'failing', label: 'Failing' }
  }
}

async function checkCron(): Promise<ServiceStatus> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { status: 'failing', label: 'Failing', detail: 'No config' }
  }
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data } = await supabase
      .from('admin_actions')
      .select('created_at')
      .eq('action_type', 'cron_digest_completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!data) return { status: 'degraded', label: 'No runs logged', detail: 'Cron has not run yet or logs missing' }

    const lastRun = new Date(data.created_at)
    const hoursAgo = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60)
    const label = `Last run ${Math.round(hoursAgo)}h ago`
    if (hoursAgo > 28) return { status: 'degraded', label, detail: 'Over 28 hours since last run' }
    return { status: 'ok', label }
  } catch {
    return { status: 'degraded', label: 'Unknown', detail: 'Could not query logs' }
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const [resend, supabase, anthropic, replicate, cron] = await Promise.all([
    checkResend(),
    checkSupabase(),
    checkAnthropic(),
    checkReplicate(),
    checkCron(),
  ])

  return NextResponse.json({ services: { resend, supabase, anthropic, replicate, cron } })
}
