import { PageTransition } from '@/components/PageTransition'

export function DashboardPage() {
  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Özet</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Aylık bütçe özetin ve tasarruf hedeflerin burada görünecek.
      </p>
    </PageTransition>
  )
}
