import {
  ArrowRight,
  CalendarPlus,
  Check,
  HandCoins,
  PiggyBank,
  Users,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { Sheet } from '@/components/Sheet'
import { TextField } from '@/components/TextField'
import { useEvents } from '@/features/calendar/hooks'
import type { Family } from '@/features/family/api'
import { useMemberships } from '@/features/family/hooks'
import type { Trip, TripItem } from '@/features/travel/api'
import {
  useCreateTripEvent,
  useCreateTripWish,
  useUpdateTripEvent,
} from '@/features/travel/hooks'
import { TripForm } from '@/features/travel/TripForm'
import { TripItemForm } from '@/features/travel/TripItemForm'
import { TripPlan } from '@/features/travel/TripPlan'
import {
  daysUntil,
  tripDayNumber,
  tripLength,
  tripNights,
  tripPhase,
} from '@/features/travel/trip-dates'
import { ConvertForm } from '@/features/wishlist/ConvertForm'
import type { WishlistItem } from '@/features/wishlist/api'
import {
  useContributions,
  useGoals,
  useWishlistItems,
} from '@/features/wishlist/hooks'
import { formatDate, todayISO } from '@/lib/dates'
import { saveErrorMessage } from '@/lib/errors'
import { formatMoney, parseAmountInput } from '@/lib/money'

interface TripSheetProps {
  trip: Trip
  open: boolean
  onClose: () => void
}

// Where the three threads of a trip meet: what it costs you, what the group
// is spending, and when it lands in your calendar. The trip itself owns none
// of that data — it only points at it.
export function TripSheet({ trip, open, onClose }: TripSheetProps) {
  const navigate = useNavigate()
  const wishes = useWishlistItems()
  const goals = useGoals()
  const contributions = useContributions()
  const events = useEvents()
  const memberships = useMemberships()
  const createEvent = useCreateTripEvent()
  const updateEvent = useUpdateTripEvent()

  const [editOpen, setEditOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [convertItem, setConvertItem] = useState<WishlistItem | null>(null)
  // the notebook's sheets are owned here, as siblings of the trip sheet:
  // a sheet rendered inside it would unmount as soon as it steps aside
  const [planAddOpen, setPlanAddOpen] = useState(false)
  const [planEditItem, setPlanEditItem] = useState<TripItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const phase = tripPhase(trip)
  const days = daysUntil(trip.starts_on)
  const dayNumber = tripDayNumber(trip)

  const myWish = (wishes.data ?? []).find((w) => w.trip_id === trip.id)
  const myGoal = (goals.data ?? []).find(
    (g) => g.wishlist_item_id === myWish?.id,
  )
  const saved = (contributions.data ?? [])
    .filter((c) => c.savings_goal_id === myGoal?.id)
    .reduce((sum, c) => sum + c.amount, 0)
  const progress = myGoal ? Math.min(1, saved / myGoal.target_amount) : 0

  const anchor = (events.data ?? []).find((e) => e.trip_id === trip.id)
  const anchorStale =
    anchor !== undefined && anchor.starts_on !== trip.starts_on
  const group = (memberships.data ?? [])
    .map((m) => m.families)
    .find((f): f is Family => f?.id === trip.family_id)

  // One anchor per person per trip, so moving the trip updates the existing
  // event rather than trying to insert a second one
  async function writeAnchor() {
    setError(null)
    const values = {
      tripId: trip.id,
      title: `${trip.cover_emoji ?? '✈️'} ${trip.title}`,
      startsOn: trip.starts_on,
    }
    try {
      if (anchor) {
        await updateEvent.mutateAsync(values)
      } else {
        await createEvent.mutateAsync(values)
      }
    } catch (e) {
      setError(saveErrorMessage(e))
    }
  }

  function openLedger() {
    if (!trip.family_id) return
    localStorage.setItem('la-family', trip.family_id)
    navigate('/family?view=expenses')
  }

  return (
    <>
      <Sheet
        open={
          open &&
          !editOpen &&
          !saveOpen &&
          !planAddOpen &&
          planEditItem === null &&
          convertItem === null
        }
        onClose={onClose}
        title={trip.title}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 p-4 text-white">
            <p className="text-3xl">{trip.cover_emoji ?? '✈️'}</p>
            <p className="mt-2 text-sm text-sky-100">
              {trip.destination ? `${trip.destination} · ` : ''}
              {formatDate(trip.starts_on)} – {formatDate(trip.ends_on)}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {phase === 'upcoming'
                ? days === 0
                  ? 'Bugün yola çıkıyorsun 🎉'
                  : `${days} gün kaldı`
                : phase === 'ongoing'
                  ? `${dayNumber}. gün / ${tripLength(trip)}`
                  : 'Tamamlandı'}
            </p>
            <p className="mt-1 text-xs text-sky-100">
              {tripNights(trip.starts_on, trip.ends_on)} gece
              {group ? ` · ${group.name}` : ' · yalnız'}
            </p>
          </div>

          {trip.note && (
            <p className="rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {trip.note}
            </p>
          )}

          <TripPlan
            trip={trip}
            onAdd={() => setPlanAddOpen(true)}
            onEdit={setPlanEditItem}
          />

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <PiggyBank size={15} className="text-indigo-500" /> Birikim
            </p>
            {myGoal ? (
              <div className="rounded-xl bg-white p-3.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoney(saved)} / {formatMoney(myGoal.target_amount)}
                  </p>
                  <p className="text-xs text-zinc-400 tabular-nums">
                    %{Math.round(progress * 100)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 90, damping: 22 }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Aylık {formatMoney(myGoal.monthly_amount)} · bütçende gider
                  kalemi olarak duruyor
                </p>
              </div>
            ) : myWish ? (
              <button
                onClick={() => setConvertItem(myWish)}
                className="flex w-full items-center justify-between rounded-xl bg-indigo-50 px-3.5 py-3 text-left text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                Hedefe çevir, bütçene ekle
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={() => setSaveOpen(true)}
                className="flex w-full items-center justify-between rounded-xl bg-indigo-50 px-3.5 py-3 text-left text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                Bu gezi için biriktir
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {group && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                <Users size={15} className="text-indigo-500" /> {group.name}
              </p>
              <button
                onClick={openLedger}
                className="flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-3 text-left text-sm font-medium shadow-sm shadow-zinc-200/60 transition-colors hover:bg-indigo-50 dark:bg-zinc-900 dark:shadow-none dark:hover:bg-indigo-500/10"
              >
                <span className="flex items-center gap-2">
                  <HandCoins size={15} className="text-indigo-500" />
                  Ortak Kasa’yı aç
                </span>
                <ArrowRight size={15} className="text-zinc-400" />
              </button>
              <p className="mt-1.5 text-xs text-zinc-400">
                Masraflar grubun ortak defterinde tutulur — bu geziye özel
                filtre henüz yok.
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
              <CalendarPlus size={15} className="text-indigo-500" /> Takvim
            </p>
            {anchor && !anchorStale ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Check size={15} /> Takvimine eklendi
              </p>
            ) : (
              <>
                <button
                  onClick={writeAnchor}
                  disabled={createEvent.isPending || updateEvent.isPending}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-3 text-left text-sm font-medium shadow-sm shadow-zinc-200/60 transition-colors hover:bg-indigo-50 disabled:opacity-60 dark:bg-zinc-900 dark:shadow-none dark:hover:bg-indigo-500/10"
                >
                  {anchorStale ? 'Takvimi güncelle' : 'Takvime ekle'}
                  <ArrowRight size={15} className="text-zinc-400" />
                </button>
                {anchorStale && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Takvimdeki kayıt {formatDate(anchor.starts_on)} tarihinde
                    kaldı.
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            variant="ghost"
            onClick={() => setEditOpen(true)}
            className="w-full"
          >
            Geziyi düzenle
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={planAddOpen}
        onClose={() => setPlanAddOpen(false)}
        title="Plana ekle"
      >
        <TripItemForm trip={trip} onDone={() => setPlanAddOpen(false)} />
      </Sheet>

      <Sheet
        open={planEditItem !== null}
        onClose={() => setPlanEditItem(null)}
        title="Kaydı düzenle"
      >
        {planEditItem && (
          <TripItemForm
            trip={trip}
            item={planEditItem}
            onDone={() => setPlanEditItem(null)}
          />
        )}
      </Sheet>

      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Geziyi düzenle"
      >
        <TripForm
          trip={trip}
          onDone={() => {
            setEditOpen(false)
            onClose()
          }}
        />
      </Sheet>

      <Sheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Bu gezi için biriktir"
      >
        <TripSavingForm
          trip={trip}
          onDone={(wish) => {
            setSaveOpen(false)
            setConvertItem(wish)
          }}
        />
      </Sheet>

      <Sheet
        open={convertItem !== null}
        onClose={() => setConvertItem(null)}
        title="Tasarruf hedefine çevir"
      >
        {convertItem && (
          <ConvertForm item={convertItem} onDone={() => setConvertItem(null)} />
        )}
      </Sheet>
    </>
  )
}

// Creates the travel wish stamped with the trip, then hands straight over to
// the existing ConvertForm so the core loop is untouched
function TripSavingForm({
  trip,
  onDone,
}: {
  trip: Trip
  onDone: (wish: WishlistItem) => void
}) {
  const createWish = useCreateTripWish()
  const wishes = useWishlistItems()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const parsed = parseAmountInput(amount)
    if (!parsed) {
      setError('Geçerli bir tutar gir (örn. 45000).')
      return
    }
    try {
      const id = await createWish.mutateAsync({
        tripId: trip.id,
        name: trip.title,
        amount: parsed,
        targetDate: trip.starts_on < todayISO() ? todayISO() : trip.starts_on,
      })
      const created = await wishes.refetch()
      const wish = (created.data ?? []).find((w) => w.id === id)
      if (wish) onDone(wish)
    } catch (e) {
      setError(saveErrorMessage(e))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Gezi ne kadara mal olacak? Sonraki adımda bunu aylık birikime çevirip
        bütçene ekleyeceğiz.
      </p>
      <TextField
        label="Tahmini tutar (₺)"
        required
        autoFocus
        inputMode="decimal"
        placeholder="45000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="submit" isLoading={createWish.isPending} className="w-full">
        Devam
      </Button>
    </form>
  )
}
