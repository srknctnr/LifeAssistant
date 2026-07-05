import { AuthApiError } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { Segmented } from '@/components/Segmented'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signIn' | 'signUp'

const errorMessages: Record<string, string> = {
  invalid_credentials: 'E-posta veya şifre hatalı.',
  user_already_exists: 'Bu e-posta ile zaten bir hesap var.',
  email_exists: 'Bu e-posta ile zaten bir hesap var.',
  weak_password: 'Şifre çok zayıf: en az 6 karakter kullan.',
  email_not_confirmed:
    'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.',
  over_request_rate_limit:
    'Çok fazla deneme yapıldı; biraz bekleyip tekrar dene.',
  validation_failed: 'Geçerli bir e-posta adresi gir.',
}

function translateAuthError(error: unknown): string {
  if (
    error instanceof AuthApiError &&
    error.code &&
    errorMessages[error.code]
  ) {
    return errorMessages[error.code]
  }
  return 'Bir şeyler ters gitti. Tekrar dener misin?'
}

export function AuthPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setIsSubmitting(true)

    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) setError(translateAuthError(signInError))
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (signUpError) {
          setError(translateAuthError(signUpError))
        } else if (!data.session) {
          setInfo(
            'Hesabın oluşturuldu. E-postana gelen doğrulama bağlantısına tıkladıktan sonra giriş yapabilirsin.',
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
            src="/logo.svg"
            alt=""
            className="h-16 w-16 rounded-2xl shadow-lg shadow-indigo-600/25"
          />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Life Assistant
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
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
          <Segmented<AuthMode>
            options={[
              { value: 'signIn', label: 'Giriş yap' },
              { value: 'signUp', label: 'Hesap oluştur' },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setError(null)
              setInfo(null)
            }}
          />
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

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-600"
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
                className="text-sm text-emerald-600"
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {mode === 'signIn' ? 'Giriş yap' : 'Hesap oluştur'}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  )
}
