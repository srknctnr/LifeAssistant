import {
  CalendarDays,
  Clapperboard,
  Home,
  LogOut,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { QuickTransactionForm } from '@/app/lazy-pages'
import { Sheet } from '@/components/Sheet'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/auth/useAuth'

const navItems = [
  { to: '/', label: 'Özet', icon: Home },
  { to: '/budget', label: 'Bütçe', icon: Wallet },
  { to: '/wishlist', label: 'İstekler', icon: Sparkles },
  { to: '/movies', label: 'Filmler', icon: Clapperboard },
  { to: '/calendar', label: 'Takvim', icon: CalendarDays },
  { to: '/family', label: 'Gruplar', icon: Users },
]

export function AppLayout() {
  const { signOut } = useAuth()
  // Logging a spend is the thing done most often and it used to be the
  // deepest: six tabs, no add button anywhere, and the only way in was a
  // section header on the budget page below two cards. It lives in the layout
  // so it is one touch from wherever you happen to be.
  const [spendOpen, setSpendOpen] = useState(false)

  const signOutButton = (
    <button
      onClick={() => void signOut()}
      aria-label="Çıkış yap"
      className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
    >
      <LogOut size={18} />
    </button>
  )

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-zinc-200/70 px-4 py-6 md:flex dark:border-zinc-800/70">
        <div className="flex items-center gap-2.5 px-2">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="h-8 w-8 rounded-lg"
          />
          <span className="font-semibold tracking-tight">Life Assistant</span>
        </div>

        <button
          onClick={() => setSpendOpen(true)}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-transform hover:-translate-y-0.5"
        >
          <Plus size={17} />
          Harcama ekle
        </button>

        <nav aria-label="Ana gezinme" className="mt-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 aria-[current=page]:text-indigo-600 dark:text-zinc-400 dark:hover:text-zinc-200 dark:aria-[current=page]:text-indigo-400"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-desktop"
                      className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}
                  <Icon size={19} className="relative" />
                  <span className="relative">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between px-2">
          <ThemeToggle />
          {signOutButton}
        </div>
      </aside>

      <div className="flex-1">
        <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6 md:hidden">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              className="h-7 w-7 rounded-lg"
            />
            <span className="text-sm font-semibold tracking-tight">
              Life Assistant
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            {signOutButton}
          </div>
        </header>

        {/* the bottom padding has to clear the FAB, not just the nav bar:
            76px of offset + the 56px button + a little room, plus the safe
            area, or the last control on a long page sits under it */}
        <main className="mx-auto max-w-md px-5 pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))] md:max-w-3xl md:px-10 md:pt-10 md:pb-16">
          <Suspense
            fallback={
              <div className="mt-2 space-y-4">
                <div className="h-8 w-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-40 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-800" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* sits just above the bottom bar and below the Sheet's overlay (z-40),
          so opening the form covers it like everything else */}
      <motion.button
        onClick={() => setSpendOpen(true)}
        aria-label="Harcama ekle"
        whileTap={{ scale: 0.92 }}
        className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 md:hidden"
      >
        <Plus size={26} />
      </motion.button>

      <Sheet
        open={spendOpen}
        onClose={() => setSpendOpen(false)}
        title="Harcama ekle"
      >
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            </div>
          }
        >
          <QuickTransactionForm onDone={() => setSpendOpen(false)} />
        </Suspense>
      </Sheet>

      <nav
        aria-label="Alt gezinme"
        className="fixed inset-x-0 bottom-0 border-t border-zinc-200/70 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden dark:border-zinc-800/70 dark:bg-zinc-950/80"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-zinc-400 transition-colors aria-[current=page]:text-indigo-600 dark:text-zinc-500 dark:aria-[current=page]:text-indigo-400"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-mobile"
                      className="absolute -top-px h-0.5 w-10 rounded-full bg-indigo-600 dark:bg-indigo-400"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
