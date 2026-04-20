import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

function safeStringEqual(a: string, b: string): boolean {
  // Pad shorter string so lengths match — timingSafeEqual requires equal-length Buffers.
  // Length mismatch still returns false; we just avoid leaking which side is shorter.
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba) // dummy call to keep timing consistent
    return false
  }
  return timingSafeEqual(ba, bb)
}

export function verifyAdminAuth(req: NextRequest): boolean {
  const header = req.headers.get('x-admin-auth')
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || !header) return false
  return safeStringEqual(header, expected)
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
