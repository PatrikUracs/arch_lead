import { SupabaseClient } from '@supabase/supabase-js'

const DIACRITICS: Record<string, string> = {
  á: 'a', Á: 'a', é: 'e', É: 'e', í: 'i', Í: 'i',
  ó: 'o', Ó: 'o', ö: 'o', Ö: 'o', ő: 'o', Ő: 'o',
  ú: 'u', Ú: 'u', ü: 'u', Ü: 'u', ű: 'u', Ű: 'u',
}

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'dashboard', 'onboard', 'embed', 'embed-instructions',
  'results', 'a', 'about', 'pricing', 'contact', 'login', 'auth',
  'assets', 'static', 'public',
])

export function generateSlug(input: string): string {
  let s = input
    .split('')
    .map((c) => DIACRITICS[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (s.length > 40) {
    s = s.slice(0, 40).replace(/-[^-]*$/, '') || s.slice(0, 40)
    s = s.replace(/^-+|-+$/g, '')
  }

  return s || 'designer'
}

export async function generateUniqueSlug(
  baseName: string,
  supabase: SupabaseClient
): Promise<string> {
  let base = generateSlug(baseName)

  if (RESERVED_SLUGS.has(base)) {
    base = generateSlug(baseName + '-studio')
    if (RESERVED_SLUGS.has(base)) base = 'designer-studio'
  }

  const { data: existing } = await supabase
    .from('designers')
    .select('slug')
    .is('archived_at', null)
    .or(`slug.eq.${base},slug.like.${base}-%`)

  const taken = new Set((existing ?? []).map((r: { slug: string }) => r.slug))

  if (!taken.has(base)) return base

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!taken.has(candidate)) return candidate
  }

  return `${base}-${Date.now()}`
}
