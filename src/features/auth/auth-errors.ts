import { AuthApiError } from '@supabase/supabase-js'

const errorMessages: Record<string, string> = {
  invalid_credentials: 'E-posta veya şifre hatalı.',
  user_already_exists: 'Bu e-posta ile zaten bir hesap var.',
  email_exists: 'Bu e-posta ile zaten bir hesap var.',
  weak_password: 'Şifre çok zayıf: en az 6 karakter kullan.',
  email_not_confirmed:
    'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.',
  over_request_rate_limit:
    'Çok fazla deneme yapıldı; biraz bekleyip tekrar dene.',
  over_email_send_rate_limit:
    'Kısa sürede çok fazla e-posta istendi; biraz bekleyip tekrar dene.',
  validation_failed: 'Geçerli bir e-posta adresi gir.',
  same_password: 'Yeni şifre eskisiyle aynı olamaz.',
}

export function translateAuthError(error: unknown): string {
  if (
    error instanceof AuthApiError &&
    error.code &&
    errorMessages[error.code]
  ) {
    return errorMessages[error.code]
  }
  return 'Bir şeyler ters gitti. Tekrar dener misin?'
}

export function isExistingEmailError(error: unknown): boolean {
  return (
    error instanceof AuthApiError &&
    (error.code === 'user_already_exists' || error.code === 'email_exists')
  )
}
