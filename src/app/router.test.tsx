import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { routes } from '@/app/router'
import { AuthProvider } from '@/features/auth/AuthProvider'

vi.mock('@/lib/supabase', () => {
  const session = {
    user: { id: 'user-1', email: 'test@example.com' },
    access_token: 'fake-token',
  }
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    },
  }
})

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

describe('app routes (authenticated)', () => {
  it('renders the dashboard at /', async () => {
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Özet' }),
    ).toBeInTheDocument()
  })

  it('renders the budget page at /budget', async () => {
    renderAt('/budget')
    expect(
      await screen.findByRole('heading', { name: 'Bütçe' }),
    ).toBeInTheDocument()
  })

  it('renders the wishlist page at /wishlist', async () => {
    renderAt('/wishlist')
    expect(
      await screen.findByRole('heading', { name: 'İstek Listesi' }),
    ).toBeInTheDocument()
  })

  it('renders the movies page at /movies', async () => {
    renderAt('/movies')
    expect(
      await screen.findByRole('heading', { name: 'Filmler' }),
    ).toBeInTheDocument()
  })

  it('renders the calendar page at /calendar', async () => {
    renderAt('/calendar')
    expect(
      await screen.findByRole('heading', { name: 'Takvim' }),
    ).toBeInTheDocument()
  })
})
