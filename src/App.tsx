import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SlotsPage } from './pages/SlotsPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { AdminPage } from './pages/AdminPage'

type Profile = {
  id: string
  full_name: string | null
  role: 'admin' | 'member'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user) {
        setProfile(null)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .single()

      if (!error && data) {
        setProfile(data)
      }
    }

    loadProfile()
  }, [session])

  if (loading) {
    return <div className="screen-center">Cargando...</div>
  }

  return (
    <div className="app-shell">
      {session && (
        <header className="topbar">
          <div>
            <h1 className="app-title">Gym Casa</h1>
            <p className="app-subtitle">Reservas del gimnasio</p>
          </div>

          <nav className="topbar-nav">
            <Link to="/slots">Horarios</Link>
            <Link to="/mis-reservas">Mis reservas</Link>
            {profile?.role === 'admin' && <Link to="/admin">Admin</Link>}
            <LogoutButton />
          </nav>
        </header>
      )}

      <main className="app-main">
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/slots" replace /> : <LoginPage />}
          />

          <Route
            path="/slots"
            element={
              <ProtectedRoute session={session}>
                <SlotsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mis-reservas"
            element={
              <ProtectedRoute session={session}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute session={session}>
                {profile?.role === 'admin' ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/slots" replace />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<Navigate to={session ? '/slots' : '/login'} replace />}
          />
        </Routes>
      </main>
    </div>
  )
}

function LogoutButton() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <button className="link-button" onClick={handleLogout}>
      Salir
    </button>
  )
}

export default App