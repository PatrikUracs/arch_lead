import { NextRequest, NextResponse } from 'next/server'

type WindowEntry = { count: number; resetAt: number }

// In-memory rate limiter — suitable for low traffic. Upgrade to Upstash Redis after May 2026.
const windows = new Map<string, WindowEntry>()

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/submit':  { max: 5,  windowMs: 60_000 },
  '/api/upload':  { max: 10, windowMs: 60_000 },
  '/api/onboard': { max: 3,  windowMs: 3_600_000 },
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const limit = LIMITS[pathname]
  if (!limit) return NextResponse.next()

  const ip = getIp(req)
  const key = `${pathname}:${ip}`
  const now = Date.now()

  // Prune expired entries to avoid unbounded memory growth
  windows.forEach((v, k) => {
    if (now >= v.resetAt) windows.delete(k)
  })

  const entry = windows.get(key)
  if (!entry || now >= entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + limit.windowMs })
    return NextResponse.next()
  }

  if (entry.count >= limit.max) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  entry.count++
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/submit', '/api/upload', '/api/onboard'],
}
