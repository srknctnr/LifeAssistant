import { useEffect } from 'react'

/**
 * Puts a count on the installed app's icon.
 *
 * This is the honest answer to "notify me when the app is closed". Real web
 * push needs VAPID keys and a server to POST to a push service, and this app
 * is a static bundle with neither — so instead of a notification the user
 * never gets, the home-screen icon carries the number, and it stays there
 * after the app is closed.
 *
 * ponytail: the badge only changes while the app is running, so a reminder
 * that comes due overnight shows up on the next visit rather than at
 * midnight. Real push needs an edge function and a cron job; until then the
 * .ics export is what reminds you with the app shut.
 *
 * Unsupported browsers get nothing, which is the correct amount of fuss.
 */
export function useAppBadge(count: number): void {
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    // Safari rejects when the PWA is not installed; there is nothing to do
    // about that and nothing worth telling the user.
    if (count > 0) void navigator.setAppBadge(count).catch(() => {})
    else void navigator.clearAppBadge().catch(() => {})
  }, [count])
}
