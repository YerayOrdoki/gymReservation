import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type Props = {
  session: Session | null
  children: ReactNode
}

export function ProtectedRoute({ session, children }: Props) {
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}