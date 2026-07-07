import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import {
  isExistingEmailError,
  translateAuthError,
} from '@/features/auth/auth-errors'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signIn' | 'signUp' | 'forgot'

const submitLabels: Record<AuthMode, string> = {
  signIn: 'Giriş yap',
  signUp: 'Hesap oluştur',
  forgot: 'Sıfırlama bağlantısı gönder',
}

export function AuthPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [existingEmail, setExistingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  const passwordValid = password.length >= 6

  function switchMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setInfo(null)
    setExistingEmail(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setExistingEmail(false)

    if (mode === 'signUp' && password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) setError(translateAuthError(signInError))
      } else if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        })
        if (signUpError) {
          if (isExistingEmailError(signUpError)) setExistingEmail(true)
          else setError(translateAuthError(signUpError))
        } else if (data.user && data.user.identities?.length === 0) {
          // with email confirmation on, Supabase doesn't error for a known
          // address (anti-enumeration); an empty identities list reveals it
          setExistingEmail(true)
        } else if (!data.session) {
          setInfo(
            'Hesabın oluşturuldu. E-postana gelen doğrulama bağlantısına tıkladıktan sonra giriş yapabilirsin.',
          )
        }
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
          },
        )
        if (resetError) setError(translateAuthError(resetError))
        else {
          setInfo(
            'Sıfırlama bağlantısını e-postana gönderdik. Gelen kutunu (ve spam klasörünü) kontrol et.',
          )
        }
      }
    } catch (unexpected) {
      setError(translateAuthError(unexpected))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0 },
          }}
          className="flex flex-col items-center text-center"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="h-16 w-16 rounded-2xl shadow-lg shadow-indigo-600/25"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Life Assistant
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Hedeflerin, bütçenle buluşsun.
          </p>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0 },
          }}
          className="mt-10"
        >
          {mode === 'forgot' ? (
            <div className="text-center">
              <h2 className="text-lg font-semibold tracking-tight">
                Şifreni sıfırla
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Kayıtlı e-postana bir sıfırlama bağlantısı gönderelim.
              </p>
            </div>
          ) : (
            <Segmented<'signIn' | 'signUp'>
              options={[
                { value: 'signIn', label: 'Giriş yap' },
                { value: 'signUp', label: 'Hesap oluştur' },
              ]}
              value={mode}
              onChange={switchMode}
            />
          )}
        </motion.div>

        <motion.form
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0 },
          }}
          className="mt-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <TextField
            label="E-posta"
            type="email"
            autoComplete="email"
            required
            placeholder="sen@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <TextField
                label="Şifre"
                type="password"
                autoComplete={
                  mode === 'signIn' ? 'current-password' : 'new-password'
                }
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'signUp' && (
                <p
                  className={`text-xs ${
                    passwordValid
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {passwordValid ? '✓' : '•'} En az 6 karakter
                </p>
              )}
            </div>
          )}

          {mode === 'signUp' && (
            <div className="space-y-1.5">
              <TextField
                label="Şifre (tekrar)"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Şifreler eşleşmiyor.
                </p>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {existingEmail && (
              <motion.div
                key="existing"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-amber-50 p-3.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              >
                Bu e-posta zaten bir hesaba bağlı.
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="mt-1 block font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Şifreni mi unuttun? Sıfırlama bağlantısı gönder →
                </button>
              </motion.div>
            )}
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </motion.p>
            )}
            {info && (
              <motion.p
                key="info"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-emerald-600 dark:text-emerald-400"
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {submitLabels[mode]}
          </Button>

          {mode === 'signIn' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="mx-auto block text-sm font-medium text-zinc-500 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
            >
              Şifremi unuttum
            </button>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('signIn')}
              className="mx-auto block text-sm font-medium text-zinc-500 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
            >
              ← Girişe dön
            </button>
          )}
        </motion.form>
      </motion.div>
    </div>
  )
}
