import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { routes } from '@/app/router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('app routes', () => {
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
})
