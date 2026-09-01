import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function AdminPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { data, error } = await supabase.rpc('generate_slots_range_admin', {
      p_start_date: startDate,
      p_end_date: endDate,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMessage(`Slots generados: ${data}`)
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Admin</h2>
        <p className="muted">Generación de slots y gestión básica.</p>
      </div>

      <div className="card">
        <form onSubmit={handleGenerate} className="form-stack">
          <label>
            Fecha inicio
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>

          <label>
            Fecha fin
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Generando...' : 'Generar slots'}
          </button>
        </form>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}