import { RotateCw } from 'lucide-react'

import { describeError } from '@/lib/errors'

/**
 * What a section shows when it could not ask, rather than what it shows when
 * the answer was "nothing".
 *
 * Those two were the same render almost everywhere: `data ?? []` turns a
 * dropped request into an empty array, and the empty state then tells the user
 * they have no wishes, no films, no reminders — about their own data, on a
 * phone that simply lost signal. This is the third branch.
 */
export function LoadFailure({
  what,
  error,
  onRetry,
}: {
  /** what could not be loaded, in Turkish and capitalised: "İstekler" */
  what: string
  error?: unknown
  onRetry?: () => void
}) {
  const detail = describeError(error)

  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-center dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {what} yüklenemedi
      </p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-400">
        {detail ??
          'Bağlantını kontrol et; olmayan veriyi varmış gibi göstermiyoruz.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <RotateCw size={13} /> Tekrar dene
        </button>
      )}
    </div>
  )
}
