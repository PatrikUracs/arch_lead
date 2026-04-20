import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!verifyAdminAuth(req)) return unauthorizedResponse()

  const { slug } = params
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const plaintext = generatePassword()
  const hash = await bcrypt.hash(plaintext, 10)

  const { error } = await supabase
    .from('designers')
    .update({ dashboard_password_hash: hash })
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'password_reset',
    target_type: 'designer',
    target_id: slug,
    details: { note: 'Password reset via admin panel' },
  })

  return NextResponse.json({ password: plaintext })
}
