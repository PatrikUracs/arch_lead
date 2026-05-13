export function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function isPro(designer: { is_paid: boolean }): boolean {
  return designer.is_paid === true
}

// Strip chars that break RFC 5322 display-name parsing. Falls back to `fallback` if empty after strip.
export function sanitizeFromName(name: string | null | undefined, fallback: string): string {
  const stripped = (name ?? '').replace(/[<>"\\]/g, '').trim()
  return stripped || fallback
}
