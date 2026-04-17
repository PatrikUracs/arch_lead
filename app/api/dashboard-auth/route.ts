import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let password: string
  try {
    const body = await req.json()
    password = body.password
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) {
    // No password set — deny all access
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  return NextResponse.json({ ok: password === expected })
}
