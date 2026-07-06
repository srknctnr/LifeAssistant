import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { BudgetPage } from '@/features/budget/BudgetPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WishlistPage } from '@/features/wishlist/WishlistPage'

export const routes: RouteObject[] = [
  { path: '/auth', element: <AuthPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/budget', element: <BudgetPage /> },
          { path: '/wishlist', element: <WishlistPage /> },
        ],
      },
    ],
  },
]

// '/LifeAssistant' on GitHub Pages, '/' elsewhere
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const router = createBrowserRouter(routes, { basename })
