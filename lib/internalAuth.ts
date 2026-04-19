import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

export function verifyInternalAuth(req: Request | NextRequest): boolean {
  const header = req.headers.get('x-internal-secret')
  const expected = process.env.INTERNAL_API_SECRET
  if (!expected || !header) return false
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  } catch {
    return false
  }
}
