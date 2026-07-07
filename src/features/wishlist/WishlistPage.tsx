import {
  MoreHorizontal,
  PiggyBank,
  Plane,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import type {
  GoalWithWish,
  SavingsContribution,
  WishlistItem,
} from '@/features/wishlist/api'
import { ContributionForm } from '@/features/wishlist/ContributionForm'
import { ConvertForm } from '@/features/wishlist/ConvertForm'
import {
  useCompleteGoal,
  useContributions,
  useDeleteContribution,
  useDeleteGoal,
  useDeleteWishlistItem,
  useGoals,
  useSetGoalPaused,
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
  const [editWish, setEditWish] = useState<WishlistItem | null>(null)
  const [convertItem, setConvertItem] = useState<WishlistItem | null>(null)
  const [contributeGoal, setContributeGoal] = useState<GoalWithWish | null>(
    null,
  )
  const [manageGoal, setManageGoal] = useState<GoalWithWish | null>(null)

  const activeWishes = (wishes.data ?? []).filter((w) => w.status === 'active')
  const visibleGoals = (goals.data ?? []).filter(
    (g) => g.status === 'active' || g.status === 'paused',
  )

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
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Bir istek ekle, tarihini seç; aylık biriktirme tutarını hesaplayıp
        bütçene ekleyelim.
      </p>

      {visibleGoals.length > 0 && (
        <Section title="Hedeflerim">
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {visibleGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  saved={savedByGoal.get(goal.id) ?? 0}
                  onContribute={() => setContributeGoal(goal)}
                  onManage={() => setManageGoal(goal)}
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
                  onEdit={() => setEditWish(item)}
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
        open={editWish !== null}
        onClose={() => setEditWish(null)}
        title="İsteği düzenle"
      >
        {editWish && (
          <WishForm item={editWish} onDone={() => setEditWish(null)} />
        )}
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

      <Sheet
        open={manageGoal !== null}
        onClose={() => setManageGoal(null)}
        title="Hedefi yönet"
      >
        {manageGoal && (
          <GoalManageActions
            goal={manageGoal}
            saved={savedByGoal.get(manageGoal.id) ?? 0}
            history={(contributions.data ?? []).filter(
              (c) => c.savings_goal_id === manageGoal.id,
            )}
            onDone={() => setManageGoal(null)}
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
  onManage,
}: {
  goal: GoalWithWish
  saved: number
  onContribute: () => void
  onManage: () => void
}) {
  const name = goal.wishlist_items?.name ?? 'Hedef'
  const kind = goal.wishlist_items?.kind ?? 'purchase'
  const targetDate = goal.wishlist_items?.target_date
  const Icon = kindIcons[kind]
  const progress = Math.min(1, saved / goal.target_amount)
  const isComplete = saved >= goal.target_amount
  const isPaused = goal.status === 'paused'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none ${
        isPaused ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-zinc-400">
            {targetDate ? formatDate(targetDate) : kindLabels[kind]} · aylık{' '}
            {formatMoney(goal.monthly_amount, goal.currency)}
          </p>
        </div>
        {isPaused ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Duraklatıldı
          </span>
        ) : isComplete ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            Tamamlandı 🎉
          </span>
        ) : (
          <button
            onClick={onContribute}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            <PiggyBank size={14} />
            Katkı ekle
          </button>
        )}
        <button
          onClick={onManage}
          aria-label={`${name} hedefini yönet`}
          className="-mr-1 rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
        >
          <MoreHorizontal size={17} />
        </button>
      </div>

      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
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

function GoalManageActions({
  goal,
  saved,
  history,
  onDone,
}: {
  goal: GoalWithWish
  saved: number
  history: SavingsContribution[]
  onDone: () => void
}) {
  const setPaused = useSetGoalPaused()
  const complete = useCompleteGoal()
  const remove = useDeleteGoal()
  const deleteContribution = useDeleteContribution()
  const [error, setError] = useState<string | null>(null)

  const isPaused = goal.status === 'paused'
  const canComplete = saved >= goal.target_amount
  const busy = setPaused.isPending || complete.isPending || remove.isPending

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      onDone()
    } catch {
      setError('İşlem tamamlanamadı. Tekrar dener misin?')
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
        <p className="font-medium">{goal.wishlist_items?.name ?? 'Hedef'}</p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {formatMoney(saved, goal.currency)} /{' '}
          {formatMoney(goal.target_amount, goal.currency)} birikti
        </p>
      </div>

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold tracking-tight">
            Katkı geçmişi
          </p>
          <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {history.map((contribution) => (
                <motion.li
                  key={contribution.id}
                  layout
                  exit={{ opacity: 0, x: -16 }}
                  className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-800"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">
                      {formatMoney(contribution.amount, goal.currency)}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {formatDate(contribution.contributed_on)}
                      {contribution.note ? ` · ${contribution.note}` : ''}
                    </p>
                  </div>
                  <button
                    aria-label="Katkıyı sil"
                    disabled={deleteContribution.isPending}
                    onClick={() => deleteContribution.mutate(contribution.id)}
                    className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {canComplete && !isPaused && (
        <Button
          className="w-full"
          isLoading={complete.isPending}
          disabled={busy}
          onClick={() => run(() => complete.mutateAsync(goal))}
        >
          Tamamlandı olarak işaretle 🎉
        </Button>
      )}

      <Button
        variant="ghost"
        className="w-full bg-zinc-100 dark:bg-zinc-800"
        isLoading={setPaused.isPending}
        disabled={busy}
        onClick={() =>
          run(() => setPaused.mutateAsync({ goal, paused: !isPaused }))
        }
      >
        {isPaused ? 'Hedefe devam et' : 'Hedefi duraklat'}
      </Button>
      <p className="text-center text-xs text-zinc-400">
        Duraklatınca bütçendeki aylık tasarruf kalemi de duraklar.
      </p>

      <button
        disabled={busy}
        onClick={() => run(() => remove.mutateAsync(goal))}
        className="w-full rounded-xl py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        Hedefi sil — istek listesine geri döner
      </button>
      <p className="text-center text-xs text-zinc-400">
        Katkı geçmişi ve bütçedeki kalemi silinir; istek yeniden
        dönüştürülebilir.
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

function WishRow({
  item,
  onEdit,
  onConvert,
}: {
  item: WishlistItem
  onEdit: () => void
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
      className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-zinc-100 p-2.5 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon size={18} />
        </span>
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-xs text-zinc-400">
            {kindLabels[item.kind]}
            {item.target_date ? ` · ${formatDate(item.target_date)}` : ''}
          </p>
        </button>
        <p className="font-semibold tabular-nums">
          {formatMoney(item.estimated_amount, item.currency)}
        </p>
        <button
          aria-label={`${item.name} isteğini sil`}
          onClick={() => deleteItem.mutate(item.id)}
          className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <button
        onClick={onConvert}
        className="mt-3 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
      >
        Tasarruf hedefine dönüştür
      </button>
    </motion.li>
  )
}
