import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'

function safeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba)
    return false
  }
  return timingSafeEqual(ba, bb)
}

export async function POST(req: NextRequest) {
  let password: string
  try {
    const body = await req.json()
    password = body.password
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return NextResponse.json({ ok: false }, { status: 401 })

  return NextResponse.json({ ok: safeStringEqual(password, expected) })
}
