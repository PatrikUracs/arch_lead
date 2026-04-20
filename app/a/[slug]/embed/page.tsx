import { createClient } from '@supabase/supabase-js'
import IntakeForm from '@/components/IntakeForm'

export const dynamic = 'force-dynamic'

export default async function DesignerEmbedPage({ params }: { params: { slug: string } }) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
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

  if (!designer) return null

  return (
    <IntakeForm
      designer={{ slug: designer.slug, name: designer.name, studio_name: designer.studio_name }}
      embed
    />
  )
}
