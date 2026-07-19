import {
  CalendarDays,
  Check,
  Clapperboard,
  Copy,
  KeyRound,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageTransition } from '@/components/PageTransition'
import { Section } from '@/components/Section'
import { Segmented } from '@/components/Segmented'
import { Sheet } from '@/components/Sheet'
import { SkeletonRows } from '@/components/SkeletonRows'
import { TextField } from '@/components/TextField'
import { useAuth } from '@/features/auth/useAuth'
import type { Family, FamilyModule as ModuleKey } from '@/features/family/api'
import {
  useAcceptInvite,
  useCancelInvite,
  useCreateFamily,
  useCreateInvite,
  useDeleteFamily,
  useInvites,
  useMemberships,
  useMyProfile,
  useRemoveMember,
  useSetShare,
  useShares,
  useUpsertProfile,
} from '@/features/family/hooks'
import { generateInviteCode } from '@/features/family/invite-code'
import { describeError } from '@/lib/errors'

const MODULES: { key: ModuleKey; label: string; icon: LucideIcon }[] = [
  { key: 'budget', label: 'Bütçe', icon: Wallet },
  { key: 'wishlist', label: 'İstekler', icon: Sparkles },
  { key: 'movies', label: 'Filmler', icon: Clapperboard },
  { key: 'calendar', label: 'Takvim', icon: CalendarDays },
]

const MODULE_LABELS = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label]),
) as Record<ModuleKey, string>

type ShareChoice = 'off' | 'summary' | 'full'

export function FamilyPage() {
  const { session } = useAuth()
  const profile = useMyProfile()
  const memberships = useMemberships()
  const shares = useShares()
  const invites = useInvites()

  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(() =>
    localStorage.getItem('la-family'),
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const userId = session?.user.id
  const allRows = memberships.data ?? []
  const myRows = allRows.filter((m) => m.user_id === userId)
  const myFamilies = myRows
    .map((m) => m.families)
    .filter((f): f is Family => f !== null)
  const selected =
    myFamilies.find((f) => f.id === selectedFamilyId) ?? myFamilies[0] ?? null

  useEffect(() => {
    if (selected) localStorage.setItem('la-family', selected.id)
  }, [selected])

  const familyMembers = selected
    ? allRows.filter((m) => m.family_id === selected.id)
    : []
  const isOwner =
    myRows.find((m) => m.family_id === selected?.id)?.role === 'owner'
  const familyShares = (shares.data ?? []).filter(
    (s) => s.family_id === selected?.id,
  )
  const pendingInvites = (invites.data ?? []).filter(
    (i) => i.family_id === selected?.id && i.status === 'pending',
  )

  const isLoading = profile.isPending || memberships.isPending

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">Ailem</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Aileni kur, üyeleri davet et; modüllerini istediğin ayrıntıda paylaş.
      </p>

      {isLoading ? (
        <div className="mt-6">
          <SkeletonRows />
        </div>
      ) : !profile.data ? (
        <ProfileGate />
      ) : myFamilies.length === 0 ? (
        <div className="mt-6 space-y-3">
          <button
            onClick={() => setCreateOpen(true)}
            className="block w-full rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
          >
            <p className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
              <Plus size={17} /> Aile kur
            </p>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Bir aile (ya da grup) oluştur, sevdiklerini davet et.
            </p>
          </button>
          <button
            onClick={() => setJoinOpen(true)}
            className="block w-full rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
          >
            <p className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
              <KeyRound size={17} /> Davet kodum var
            </p>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Sana gönderilen 6 haneli kodla aileye katıl.
            </p>
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {myFamilies.map((family) => (
              <button
                key={family.id}
                onClick={() => setSelectedFamilyId(family.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selected?.id === family.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {family.name}
              </button>
            ))}
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Yeni aile kur"
              className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setJoinOpen(true)}
              aria-label="Kod ile katıl"
              className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <KeyRound size={16} />
            </button>
          </div>

          {selected && (
            <>
              <Section title="Üyeler">
                <ul className="space-y-1.5">
                  {familyMembers.map((member) => {
                    const memberShares = familyShares.filter(
                      (s) => s.user_id === member.user_id,
                    )
                    const isSelf = member.user_id === userId
                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {member.profiles?.display_name ?? 'Üye'}
                            {isSelf && (
                              <span className="text-zinc-400"> · sen</span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {member.role === 'owner' ? 'Yönetici' : 'Üye'}
                            {memberShares.length > 0 &&
                              ` · paylaşıyor: ${memberShares
                                .map(
                                  (s) =>
                                    `${MODULE_LABELS[s.module]}${s.module === 'budget' && s.level === 'summary' ? ' (özet)' : ''}`,
                                )
                                .join(', ')}`}
                          </p>
                        </div>
                        {isOwner && !isSelf && (
                          <RemoveMemberButton
                            memberRowId={member.id}
                            name={member.profiles?.display_name ?? 'Üye'}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Section>

              {isOwner && (
                <Section title="Davetler" onAdd={() => setInviteOpen(true)}>
                  {pendingInvites.length === 0 ? (
                    <EmptyState text="Bekleyen davet yok. + ile e-posta adresine kod oluştur." />
                  ) : (
                    <ul className="space-y-1.5">
                      {pendingInvites.map((invite) => (
                        <InviteRow key={invite.id} invite={invite} />
                      ))}
                    </ul>
                  )}
                </Section>
              )}

              <Section title="Paylaşımlarım">
                <p className="mb-3 text-xs text-zinc-400">
                  Bu ailenin üyeleri seçtiğin modülleri görebilecek; bütçede
                  ayrıca ayrıntı seviyesini sen belirliyorsun. Görüntüleme
                  ekranları bir sonraki güncellemeyle üyelere açılacak.
                </p>
                <ul className="space-y-2.5">
                  {MODULES.map((module) => (
                    <ShareRow
                      key={module.key}
                      familyId={selected.id}
                      module={module}
                      current={
                        familyShares.find(
                          (s) =>
                            s.module === module.key && s.user_id === userId,
                        ) ?? null
                      }
                    />
                  ))}
                </ul>
              </Section>

              <div className="mt-8">
                {isOwner ? (
                  <DangerButton
                    label="Aileyi sil"
                    note="Üyelikler, davetler ve paylaşım ayarları silinir; kişisel veriler etkilenmez."
                    onConfirm={() => {}}
                    familyId={selected.id}
                    mode="delete"
                  />
                ) : (
                  <DangerButton
                    label="Aileden ayrıl"
                    note="Paylaşımların kapanır; kişisel verilerin etkilenmez."
                    onConfirm={() => {}}
                    memberRowId={
                      myRows.find((m) => m.family_id === selected.id)?.id
                    }
                    mode="leave"
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Aile kur"
      >
        <CreateFamilyForm onDone={() => setCreateOpen(false)} />
      </Sheet>
      <Sheet
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Kod ile katıl"
      >
        <JoinForm onDone={() => setJoinOpen(false)} />
      </Sheet>
      <Sheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Üye davet et"
      >
        {selected && (
          <InviteForm
            familyId={selected.id}
            onDone={() => setInviteOpen(false)}
          />
        )}
      </Sheet>
    </PageTransition>
  )
}

// Membership needs a display name (members see each other by name)
function ProfileGate() {
  const { session } = useAuth()
  const upsert = useUpsertProfile()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    try {
      await upsert.mutateAsync({
        userId: session.user.id,
        displayName: name.trim(),
      })
    } catch (e) {
      setError(describeError(e) ?? 'Kaydedilemedi, tekrar dene.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 rounded-3xl bg-white p-5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none"
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Aile üyeleri seni bu adla görecek. Önce kendini tanıtalım:
      </p>
      <TextField
        label="Görünen adın"
        required
        placeholder="Serkan"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="submit" isLoading={upsert.isPending} className="w-full">
        Devam et
      </Button>
    </form>
  )
}

function CreateFamilyForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const create = useCreateFamily()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    try {
      await create.mutateAsync({ userId: session.user.id, name: name.trim() })
      onDone()
    } catch (e) {
      setError(describeError(e) ?? 'Kaydedilemedi, tekrar dene.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Aile / grup adı"
        required
        placeholder="Çetiner Ailesi"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="submit" isLoading={create.isPending} className="w-full">
        Kur
      </Button>
    </form>
  )
}

function JoinForm({ onDone }: { onDone: () => void }) {
  const accept = useAcceptInvite()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await accept.mutateAsync(code.trim())
      onDone()
    } catch (e) {
      setError(describeError(e) ?? 'Katılım başarısız, kodu kontrol et.')
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Davet kodu"
        required
        placeholder="ör. K7M2PX"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <p className="text-xs text-zinc-400">
        Kod, davetin gönderildiği e-posta adresiyle giriş yapmış olmanı
        gerektirir.
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="submit" isLoading={accept.isPending} className="w-full">
        Katıl
      </Button>
    </form>
  )
}

function InviteForm({
  familyId,
  onDone,
}: {
  familyId: string
  onDone: () => void
}) {
  const { session } = useAuth()
  const create = useCreateInvite()
  const [email, setEmail] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setError(null)
    const code = generateInviteCode()
    try {
      await create.mutateAsync({
        family_id: familyId,
        invited_email: email.trim().toLowerCase(),
        code,
        invited_by: session.user.id,
      })
      setCreatedCode(code)
    } catch (e) {
      setError(describeError(e) ?? 'Davet oluşturulamadı, tekrar dene.')
    }
  }

  if (createdCode) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Davet hazır! Bu kodu {email} adresinin sahibiyle paylaş — uygulamaya
          kayıt olup Ailem → kod ile katılabilir. Kod 7 gün geçerli.
        </p>
        <p className="text-3xl font-bold tracking-[0.3em] tabular-nums">
          {createdCode}
        </p>
        <CopyButton text={createdCode} />
        <Button onClick={onDone} variant="ghost" className="w-full">
          Tamam
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Davet edilecek e-posta"
        type="email"
        required
        placeholder="es@ornek.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <p className="text-xs text-zinc-400">
        Kod yalnızca bu e-postayla giriş yapan kişi tarafından kullanılabilir.
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <Button type="submit" isLoading={create.isPending} className="w-full">
        Kod oluştur
      </Button>
    </form>
  )
}

function InviteRow({
  invite,
}: {
  invite: { id: string; invited_email: string; code: string }
}) {
  const cancel = useCancelInvite()
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invite.invited_email}</p>
        <p className="text-xs text-zinc-400 tabular-nums">Kod: {invite.code}</p>
      </div>
      <CopyButton text={invite.code} compact />
      <button
        aria-label="Daveti iptal et"
        onClick={() => cancel.mutate(invite.id)}
        className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

function CopyButton({ text, compact }: { text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — user can copy manually
    }
  }

  if (compact) {
    return (
      <button
        aria-label="Kodu kopyala"
        onClick={copy}
        className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    )
  }

  return (
    <Button onClick={copy} className="w-full">
      {copied ? 'Kopyalandı ✓' : 'Kodu kopyala'}
    </Button>
  )
}

function ShareRow({
  familyId,
  module,
  current,
}: {
  familyId: string
  module: { key: ModuleKey; label: string; icon: LucideIcon }
  current: { level: 'summary' | 'full' } | null
}) {
  const { session } = useAuth()
  const setShare = useSetShare()
  const Icon = module.icon
  const value: ShareChoice = current ? current.level : 'off'
  const options =
    module.key === 'budget'
      ? [
          { value: 'off' as const, label: 'Kapalı' },
          { value: 'summary' as const, label: 'Özet' },
          { value: 'full' as const, label: 'Tam' },
        ]
      : [
          { value: 'off' as const, label: 'Kapalı' },
          { value: 'full' as const, label: 'Açık' },
        ]

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm shadow-zinc-200/60 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={16} className="text-indigo-500" />
        <p className="text-sm font-medium">{module.label}</p>
      </div>
      <Segmented<ShareChoice>
        options={options}
        value={value}
        onChange={(next) =>
          session &&
          setShare.mutate({
            userId: session.user.id,
            familyId,
            module: module.key,
            level: next === 'off' ? null : next,
          })
        }
      />
    </li>
  )
}

function RemoveMemberButton({
  memberRowId,
  name,
}: {
  memberRowId: string
  name: string
}) {
  const remove = useRemoveMember()
  return (
    <button
      aria-label={`${name} üyesini çıkar`}
      onClick={() => remove.mutate(memberRowId)}
      disabled={remove.isPending}
      className="rounded-full p-1.5 text-zinc-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <Trash2 size={15} />
    </button>
  )
}

function DangerButton({
  label,
  note,
  familyId,
  memberRowId,
  mode,
}: {
  label: string
  note: string
  onConfirm: () => void
  familyId?: string
  memberRowId?: string
  mode: 'delete' | 'leave'
}) {
  const deleteFamily = useDeleteFamily()
  const removeMember = useRemoveMember()
  const [armed, setArmed] = useState(false)
  const isPending = deleteFamily.isPending || removeMember.isPending

  function handleClick() {
    if (!armed) {
      setArmed(true)
      setTimeout(() => setArmed(false), 4000)
      return
    }
    if (mode === 'delete' && familyId) deleteFamily.mutate(familyId)
    if (mode === 'leave' && memberRowId) removeMember.mutate(memberRowId)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-xl py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        {armed ? `Emin misin? Tekrar dokun: ${label}` : label}
      </button>
      <p className="mt-1 text-center text-xs text-zinc-400">{note}</p>
    </div>
  )
}
