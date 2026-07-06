import { PiggyBank, Plane, ShoppingBag, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type { GoalWithWish, WishlistItem } from '@/features/wishlist/api'
import { ContributionForm } from '@/features/wishlist/ContributionForm'
import { ConvertForm } from '@/features/wishlist/ConvertForm'
import {
  useContributions,
  useDeleteWishlistItem,
  useGoals,
  useWishlistItems,
} from '@/features/wishlist/hooks'
import { WishForm } from '@/features/wishlist/WishForm'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const kindLabels = { purchase: 'Harcama', travel: 'Seyahat' } as const
const kindIcons = { purchase: ShoppingBag, travel: Plane } as const

export function WishlistPage() {
  const wishes = useWishlistItems()
  const goals = useGoals()
  const contributions = useContributions()

  const [addOpen, setAddOpen] = useState(false)
  const [convertItem, setConvertItem] = useState<WishlistItem | null>(null)
  const [contributeGoal, setContributeGoal] = useState<GoalWithWish | null>(
    null,
  )

  const activeWishes = (wishes.data ?? []).filter((w) => w.status === 'active')
  const activeGoals = (goals.data ?? []).filter((g) => g.status === 'active')

  const savedByGoal = new Map<string, number>()
  for (const contribution of contributions.data ?? []) {
    savedByGoal.set(
      contribution.savings_goal_id,
      (savedByGoal.get(contribution.savings_goal_id) ?? 0) +
        contribution.amount,
    )
  }

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">İstek Listesi</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Bir istek ekle, tarihini seç; aylık biriktirme tutarını hesaplayıp
        bütçene ekleyelim.
      </p>

      {activeGoals.length > 0 && (
        <Section title="Hedeflerim">
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  saved={savedByGoal.get(goal.id) ?? 0}
                  onContribute={() => setContributeGoal(goal)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </Section>
      )}

      <Section title="İstekler" onAdd={() => setAddOpen(true)}>
        {wishes.isPending ? (
          <SkeletonRows />
        ) : activeWishes.length === 0 ? (
          <EmptyState text="Henüz istek eklemedin. Bir gezi ya da almak istediğin bir şeyle başla." />
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {activeWishes.map((item) => (
                <WishRow
                  key={item.id}
                  item={item}
                  onConvert={() => setConvertItem(item)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Section>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="İstek ekle"
      >
        <WishForm onDone={() => setAddOpen(false)} />
      </Sheet>

      <Sheet
        open={convertItem !== null}
        onClose={() => setConvertItem(null)}
        title="Tasarruf hedefine dönüştür"
      >
        {convertItem && (
          <ConvertForm item={convertItem} onDone={() => setConvertItem(null)} />
        )}
      </Sheet>

      <Sheet
        open={contributeGoal !== null}
        onClose={() => setContributeGoal(null)}
        title="Katkı ekle"
      >
        {contributeGoal && (
          <ContributionForm
            goal={contributeGoal}
            onDone={() => setContributeGoal(null)}
          />
        )}
      </Sheet>
    </PageTransition>
  )
}

function GoalCard({
  goal,
  saved,
  onContribute,
}: {
  goal: GoalWithWish
  saved: number
  onContribute: () => void
}) {
  const name = goal.wishlist_items?.name ?? 'Hedef'
  const kind = goal.wishlist_items?.kind ?? 'purchase'
  const targetDate = goal.wishlist_items?.target_date
  const Icon = kindIcons[kind]
  const progress = Math.min(1, saved / goal.target_amount)
  const isComplete = saved >= goal.target_amount

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-zinc-400">
            {targetDate ? formatDate(targetDate) : kindLabels[kind]} · aylık{' '}
            {formatMoney(goal.monthly_amount, goal.currency)}
          </p>
        </div>
        {isComplete ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            Tamamlandı 🎉
          </span>
        ) : (
          <button
            onClick={onContribute}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
          >
            <PiggyBank size={14} />
            Katkı ekle
          </button>
        )}
      </div>

      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 22 }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-zinc-400">
        <span className="tabular-nums">
          {formatMoney(saved, goal.currency)} /{' '}
          {formatMoney(goal.target_amount, goal.currency)}
        </span>
        <span className="font-medium tabular-nums">
          %{Math.round(progress * 100)}
        </span>
      </div>
    </motion.li>
  )
}

function WishRow({
  item,
  onConvert,
}: {
  item: WishlistItem
  onConvert: () => void
}) {
  const deleteItem = useDeleteWishlistItem()
  const Icon = kindIcons[item.kind]

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-zinc-100 p-2.5 text-zinc-500">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-xs text-zinc-400">
            {kindLabels[item.kind]}
            {item.target_date ? ` · ${formatDate(item.target_date)}` : ''}
          </p>
        </div>
        <p className="font-semibold tabular-nums">
          {formatMoney(item.estimated_amount, item.currency)}
        </p>
        <button
          aria-label={`${item.name} isteğini sil`}
          onClick={() => deleteItem.mutate(item.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <button
        onClick={onConvert}
        className="mt-3 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
      >
        Tasarruf hedefine dönüştür
      </button>
    </motion.li>
  )
}
