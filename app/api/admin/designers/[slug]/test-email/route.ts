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
    .single()

  const recipientEmail = designer?.email
  if (!recipientEmail) return NextResponse.json({ error: 'No email address for this designer' }, { status: 400 })

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'DesignLead Admin <onboarding@resend.dev>',
    to: [recipientEmail],
    subject: 'Test email from DesignLead admin',
    text: 'This is a test email from DesignLead admin. If you\'re reading this, email delivery is working.',
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
