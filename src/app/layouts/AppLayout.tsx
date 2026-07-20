import {
  CalendarDays,
  Clapperboard,
  Home,
  LogOut,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/features/auth/useAuth'

const navItems = [
  { to: '/', label: 'Özet', icon: Home },
  { to: '/budget', label: 'Bütçe', icon: Wallet },
  { to: '/wishlist', label: 'İstekler', icon: Sparkles },
  { to: '/movies', label: 'Filmler', icon: Clapperboard },
  { to: '/calendar', label: 'Takvim', icon: CalendarDays },
  { to: '/family', label: 'Ailem', icon: Users },
]

export function AppLayout() {
  const { signOut } = useAuth()

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

        <nav aria-label="Ana gezinme" className="mt-8 space-y-1">
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

        <main className="mx-auto max-w-md px-5 pt-6 pb-28 md:max-w-3xl md:px-10 md:pt-10 md:pb-16">
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
