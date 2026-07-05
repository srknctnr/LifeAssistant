import { Home, Sparkles, Wallet } from 'lucide-react'
import { motion } from 'motion/react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Özet', icon: Home },
  { to: '/budget', label: 'Bütçe', icon: Wallet },
  { to: '/wishlist', label: 'İstekler', icon: Sparkles },
]

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 px-5 pt-8 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 border-t border-zinc-200/70 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-zinc-400 transition-colors aria-[current=page]:text-indigo-600"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -top-px h-0.5 w-10 rounded-full bg-indigo-600"
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
