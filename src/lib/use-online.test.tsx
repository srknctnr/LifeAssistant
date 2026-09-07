import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useOnline } from '@/lib/use-online'

function Probe() {
  return <span>{useOnline() ? 'çevrimiçi' : 'çevrimdışı'}</span>
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('useOnline', () => {
  afterEach(() => setOnline(true))

  // Reading navigator during render rather than in an effect is the point:
  // with state + useEffect there is a first paint where an offline device
  // claims to be online, and that paint is exactly when the banner matters.
  it('reports offline on the very first render, with no effect having run', () => {
    setOnline(false)
    render(<Probe />)
    expect(screen.getByText('çevrimdışı')).toBeInTheDocument()
  })

  it('follows the browser events in both directions', () => {
    setOnline(true)
    render(<Probe />)
    expect(screen.getByText('çevrimiçi')).toBeInTheDocument()

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('çevrimdışı')).toBeInTheDocument()

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.getByText('çevrimiçi')).toBeInTheDocument()
  })

  it('stops listening once unmounted', () => {
    const { unmount } = render(<Probe />)
    unmount()
    // would throw on a setState after unmount if the listener survived
    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })
  })
})
