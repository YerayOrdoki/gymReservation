import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Booking = {
  id: string
  status: 'active' | 'cancelled'
  slot: {
    slot_date: string
    start_time: string
    end_time: string
    is_blocked: boolean
  } | null
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadBookings = async () => {
    setLoading(true)
    setError(null)

    const { data, error: loadError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        slot:slot_id (
          slot_date,
          start_time,
          end_time,
          is_blocked
        )
      `)
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }

    const normalizedBookings: Booking[] = (data ?? []).map((row: any) => {
      const rawSlot = Array.isArray(row.slot)
        ? row.slot[0] ?? null
        : row.slot ?? null

      return {
        id: row.id,
        status: row.status,
        slot: rawSlot
          ? {
              slot_date: rawSlot.slot_date,
              start_time: rawSlot.start_time,
              end_time: rawSlot.end_time,
              is_blocked: rawSlot.is_blocked,
            }
          : null,
      }
    })

    setBookings(normalizedBookings)
    setLoading(false)
  }

  useEffect(() => {
    void loadBookings()
  }, [])

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId)
    setError(null)

    const { error: cancelError } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
    })

    if (cancelError) {
      setError(cancelError.message)
      setCancellingId(null)
      return
    }

    await loadBookings()
    setCancellingId(null)
  }

  const visibleBookings = useMemo(() => {
    return bookings.filter((booking) => booking.slot !== null)
  }, [bookings])

  if (loading) {
    return <div className="screen-center">Cargando reservas...</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Mis reservas</h2>
        <p className="muted">
          Aquí puedes consultar y cancelar tus reservas activas.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="list-stack">
        {visibleBookings.map((booking) => {
          const slot = booking.slot!

          return (
            <div key={booking.id} className="card booking-card">
              <h3>{slot.slot_date}</h3>

              <p>
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
              </p>

              <p className="muted">
                Estado: {booking.status === 'active' ? 'Activa' : 'Cancelada'}
              </p>

              {slot.is_blocked && booking.status === 'active' && (
                <p className="muted">Este turno ya ha finalizado.</p>
              )}

              {booking.status === 'active' && !slot.is_blocked && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleCancel(booking.id)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id
                    ? 'Cancelando...'
                    : 'Cancelar reserva'}
                </button>
              )}
            </div>
          )
        })}

        {visibleBookings.length === 0 && (
          <div className="card">
            <p className="muted">Todavía no tienes reservas visibles.</p>
          </div>
        )}
      </div>
    </div>
  )
}