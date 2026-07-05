import { PageTransition } from '@/components/PageTransition'

export function WishlistPage() {
  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">İstek Listesi</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Hedeflerini ekle; aylık biriktirme tutarını birlikte hesaplayalım.
      </p>
    </PageTransition>
  )
}
