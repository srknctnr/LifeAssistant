import { PageTransition } from '@/components/PageTransition'

export function BudgetPage() {
  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Bütçe</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Gelirlerin ve periyodik giderlerin burada yönetilecek.
      </p>
    </PageTransition>
  )
}
