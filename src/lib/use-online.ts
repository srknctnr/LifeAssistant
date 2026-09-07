import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Whether the browser thinks it has a connection.
 *
 * useSyncExternalStore rather than state plus an effect: the value is read
 * during render from navigator itself, so there is no first paint where an
 * offline device claims to be online.
 *
 * It only knows about the network interface, not about whether Supabase is
 * reachable — so it is used to EXPLAIN failures, never to predict them. Every
 * surface still shows its own load failure; this only tells the user why they
 * are all failing at once.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // the server render has no navigator; assume online
  )
}
