import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { routes } from '@/app/router'
import { AuthProvider } from '@/features/auth/AuthProvider'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}))

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('auth flow (no session)', () => {
  it('redirects protected routes to the auth page', async () => {
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Life Assistant' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument()
    expect(screen.getByLabelText('Şifre')).toBeInTheDocument()
  })

  it('renders sign-in and sign-up modes', async () => {
    renderAt('/auth')
    // mode tab
    expect(
      await screen.findByRole('button', { name: 'Hesap oluştur' }),
    ).toBeInTheDocument()
    // mode tab + submit button share the label in sign-in mode
    expect(screen.getAllByRole('button', { name: 'Giriş yap' })).toHaveLength(2)
  })

  it('asks for password confirmation in sign-up mode', async () => {
    const user = userEvent.setup()
    renderAt('/auth')
    await user.click(
      await screen.findByRole('button', { name: 'Hesap oluştur' }),
    )
    expect(screen.getByLabelText('Şifre (tekrar)')).toBeInTheDocument()
    expect(screen.getByText(/en az 6 karakter/i)).toBeInTheDocument()
  })

  it('switches to the forgot-password form', async () => {
    const user = userEvent.setup()
    renderAt('/auth')
    await user.click(
      await screen.findByRole('button', { name: 'Şifremi unuttum' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Şifreni sıfırla' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sıfırlama bağlantısı gönder' }),
    ).toBeInTheDocument()
  })

  it('shows an invalid-link message on /reset-password without a session', async () => {
    renderAt('/reset-password')
    expect(
      await screen.findByRole('heading', { name: 'Bağlantı geçersiz' }),
    ).toBeInTheDocument()
  })
})
