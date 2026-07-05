import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '@/features/auth/useAuth'
import { SplashScreen } from '@/components/SplashScreen'

export function RequireAuth() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <SplashScreen />
  if (!session) return <Navigate to="/auth" replace />
  return <Outlet />
}
