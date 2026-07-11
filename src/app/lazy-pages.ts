import { lazy } from 'react'

// Route-level code splitting: every page ships as its own chunk, keeping the
// initial bundle flat as modules grow

export const AuthPage = lazy(() =>
  import('@/features/auth/AuthPage').then((m) => ({ default: m.AuthPage })),
)

export const ResetPasswordPage = lazy(() =>
  import('@/features/auth/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
)

export const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)

export const BudgetPage = lazy(() =>
  import('@/features/budget/BudgetPage').then((m) => ({
    default: m.BudgetPage,
  })),
)

export const WishlistPage = lazy(() =>
  import('@/features/wishlist/WishlistPage').then((m) => ({
    default: m.WishlistPage,
  })),
)

export const MoviesPage = lazy(() =>
  import('@/features/movies/MoviesPage').then((m) => ({
    default: m.MoviesPage,
  })),
)

export const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({
    default: m.CalendarPage,
  })),
)
