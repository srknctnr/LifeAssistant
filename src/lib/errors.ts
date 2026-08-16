// Supabase/PostgREST errors carry a useful message; surface it so a failed
// save never dead-ends in a generic warning
export function describeError(error: unknown): string | null {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return null
}

// Postgres unique_violation — worth its own Turkish message at call sites
export function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

export function saveErrorMessage(error: unknown): string {
  const detail = describeError(error)
  return detail
    ? `Kaydedilemedi: ${detail}`
    : 'Kaydedilemedi. Bağlantını kontrol edip tekrar dene.'
}
