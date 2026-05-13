import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'

function safeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  const len = Math.max(ba.length, bb.length)
  const pa = Buffer.concat([ba, Buffer.alloc(len - ba.length)])
  const pb = Buffer.concat([bb, Buffer.alloc(len - bb.length)])
  const equal = timingSafeEqual(pa, pb)
  return equal && ba.length === bb.length
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

  const ok = safeStringEqual(password, expected)
  if (!ok) {
    // Slow down brute-force attempts — 1.5s penalty on every wrong password
    await sleep(1500)
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
