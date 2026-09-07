import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoadFailure } from '@/components/LoadFailure'

describe('LoadFailure', () => {
  it('names what could not be loaded rather than claiming it is empty', () => {
    render(<LoadFailure what="İstekler" />)
    expect(screen.getByText(/İstekler yüklenemedi/)).toBeInTheDocument()
  })

  it('offers no retry button when there is nothing to retry', () => {
    render(<LoadFailure what="İstekler" />)
    expect(
      screen.queryByRole('button', { name: /Tekrar dene/ }),
    ).not.toBeInTheDocument()
  })

  it('retries on demand', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<LoadFailure what="Filmlerin" onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: /Tekrar dene/ }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('falls back to a plain sentence when the error says nothing useful', () => {
    render(<LoadFailure what="Hatırlatmalar" error={undefined} />)
    expect(screen.getByText(/Bağlantını kontrol et/)).toBeInTheDocument()
  })
})
