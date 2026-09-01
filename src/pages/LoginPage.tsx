import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error

        setMessage(
          'Cuenta creada. Si tienes confirmación de email activada en Supabase, revisa tu correo antes de entrar.',
        )
      }
    } catch (err: any) {
      setError(err.message ?? 'Ha ocurrido un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-center">
      <div className="card auth-card">
        <h2>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</h2>
        <p className="muted">Reserva horas en el gimnasio de casa.</p>

        <form onSubmit={handleSubmit} className="form-stack">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? 'Cargando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <button
          className="secondary-button"
          onClick={() =>
            setMode((prev) => (prev === 'login' ? 'register' : 'login'))
          }
        >
          {mode === 'login'
            ? 'No tengo cuenta'
            : 'Ya tengo cuenta, quiero entrar'}
        </button>
      </div>
    </div>
  )
}