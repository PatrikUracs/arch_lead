import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

function safeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  const len = Math.max(ba.length, bb.length)
  const pa = Buffer.concat([ba, Buffer.alloc(len - ba.length)])
  const pb = Buffer.concat([bb, Buffer.alloc(len - bb.length)])
  const equal = timingSafeEqual(pa, pb)
  return equal && ba.length === bb.length
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
