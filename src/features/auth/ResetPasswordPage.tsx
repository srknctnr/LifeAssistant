import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { SplashScreen } from '@/components/SplashScreen'
import { TextField } from '@/components/TextField'
import { translateAuthError } from '@/features/auth/auth-errors'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'

// Landing page of the password-recovery email link; Supabase turns the
// link's token into a session, so "no session" here means a broken or
// expired link
export function ResetPasswordPage() {
  const { session, isLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <SplashScreen />
  if (done) return <Navigate to="/" replace />

  if (!session) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
          className="h-14 w-14 rounded-2xl shadow-lg shadow-indigo-600/25"
        />
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Bağlantı geçersiz
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Şifre sıfırlama bağlantısının süresi dolmuş ya da bağlantı hatalı.
          Giriş ekranından yeni bir bağlantı isteyebilirsin.
        </p>
        <Link
          to="/auth"
          className="mt-5 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Girişe dön
        </Link>
      </div>
    )
  }

  const passwordValid = password.length >= 6

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setIsSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setIsSubmitting(false)

    if (updateError) {
      setError(translateAuthError(updateError))
      return
    }
    setDone(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
          className="h-14 w-14 rounded-2xl shadow-lg shadow-indigo-600/25"
        />
        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Yeni şifre belirle
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Hesabın için yeni bir şifre seç.
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <TextField
            label="Yeni şifre"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p
            className={`text-xs ${
              passwordValid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-400'
            }`}
          >
            {passwordValid ? '✓' : '•'} En az 6 karakter
          </p>
        </div>
        <div className="space-y-1.5">
          <TextField
            label="Yeni şifre (tekrar)"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Şifreler eşleşmiyor.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Şifreyi güncelle
        </Button>
      </form>
    </div>
  )
}
