import { createClient } from '@supabase/supabase-js'

export async function logError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>
): Promise<void> {
  console.error(`[${context}]`, error, details ?? '')
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    await supabase.from('error_logs').insert({
      context,
      message: error instanceof Error ? error.message : String(error),
      details: details ?? null,
    })
  } catch {
    // intentionally silent — can't log the logger failing
  }
}
