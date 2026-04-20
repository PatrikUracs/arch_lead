import { createClient } from '@supabase/supabase-js'
import IntakeForm from '@/components/IntakeForm'

export const dynamic = 'force-dynamic'

function NotFound() {
  return (
    <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 48, fontWeight: 400, color: 'rgba(201,169,110,0.3)', margin: '0 0 16px' }}>404</p>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.1em' }}>
          This page does not exist.
        </p>
      </div>
    </div>
  )
}

export default async function DesignerIntakePage({ params }: { params: { slug: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <NotFound />
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: designer } = await supabase
    .from('designers')
    .select('slug, name, studio_name')
    .eq('slug', params.slug)
    .is('archived_at', null)
    .single()

  if (!designer) return <NotFound />

  return (
    <main>
      <IntakeForm designer={{ slug: designer.slug, name: designer.name, studio_name: designer.studio_name }} />
    </main>
  )
}
