import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import { AppLayout } from '@/app/layouts/AppLayout'
import { BudgetPage } from '@/features/budget/BudgetPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WishlistPage } from '@/features/wishlist/WishlistPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/budget', element: <BudgetPage /> },
      { path: '/wishlist', element: <WishlistPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
