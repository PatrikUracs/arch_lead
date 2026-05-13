import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/adminAuth'

export const runtime = 'nodejs'

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

  const recipientEmail = designer?.email
  if (!recipientEmail) return NextResponse.json({ error: 'No email address for this designer' }, { status: 400 })

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) return NextResponse.json({ error: 'RESEND_FROM_EMAIL not set' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: `Spacio Admin <${fromEmail}>`,
    to: [recipientEmail],
    subject: 'Test email from Spacio admin',
    text: 'This is a test email from Spacio admin. If you\'re reading this, email delivery is working.',
  })

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  await supabase.from('admin_actions').insert({
    action_type: 'test_email_sent',
    target_type: 'designer',
    target_id: slug,
    details: { recipient: recipientEmail },
  })

  return NextResponse.json({ success: true, sent_to: recipientEmail })
}
