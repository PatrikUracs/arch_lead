import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
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

  const { data: designer } = await supabase
    .from('designers')
    .select('email, name')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!designer?.email) {
    return NextResponse.json({ error: 'Designer not found or has no email' }, { status: 404 })
  }

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

  // Email the new password directly to the designer — plaintext never leaves the server in the response
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    await resend.emails.send({
      from: `Spacio <${process.env.RESEND_FROM_EMAIL}>`,
      to: [designer.email],
      subject: 'Your Spacio dashboard password has been reset',
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:6px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111;">Dashboard password reset</h2>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 8px;">Your Spacio dashboard password has been reset by an administrator.</p>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">Your new temporary password is:</p>
    <div style="background:#f3f4f6;border-radius:4px;padding:16px;font-family:monospace;font-size:18px;letter-spacing:0.05em;color:#111;text-align:center;">${plaintext}</div>
    <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">Log in at <a href="${appUrl}/dashboard/${slug}" style="color:#376E6F;">${appUrl}/dashboard/${slug}</a> and change this password in your settings.</p>
  </div>
</body></html>`,
    }).catch((err) => console.error('Password reset email failed:', err))
  }

  return NextResponse.json({ success: true })
}
