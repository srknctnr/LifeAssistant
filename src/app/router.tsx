import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import {
  AuthPage,
  BudgetPage,
  CalendarPage,
  DashboardPage,
  MoviesPage,
  ResetPasswordPage,
  WishlistPage,
} from '@/app/lazy-pages'
import { AppLayout } from '@/app/layouts/AppLayout'
import { SplashScreen } from '@/components/SplashScreen'
import { RequireAuth } from '@/features/auth/RequireAuth'

// Pages inside AppLayout suspend into the layout's skeleton fallback; the
// standalone auth pages get a full-screen one
function fullScreen(node: ReactNode) {
  return <Suspense fallback={<SplashScreen />}>{node}</Suspense>
}

export const routes: RouteObject[] = [
  { path: '/auth', element: fullScreen(<AuthPage />) },
  { path: '/reset-password', element: fullScreen(<ResetPasswordPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/budget', element: <BudgetPage /> },
          { path: '/wishlist', element: <WishlistPage /> },
          { path: '/movies', element: <MoviesPage /> },
          { path: '/calendar', element: <CalendarPage /> },
        ],
      },
    ],
  },
]

// '/LifeAssistant' on GitHub Pages, '/' elsewhere
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const router = createBrowserRouter(routes, { basename })
