import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Slot = {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  is_blocked: boolean
}

type BookingRow = {
  id: string
  slot_id: string
  user_id: string
  status: 'active' | 'cancelled'
  profile:
    | {
        full_name: string | null
      }
    | {
        full_name: string | null
      }[]
    | null
}

type DayGroup = {
  date: string
  weekdayLabel: string
  dateLabel: string
  slots: Slot[]
}

export function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [activeBookings, setActiveBookings] = useState<BookingRow[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reserving, setReserving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [openMobileDay, setOpenMobileDay] = useState<string | null>(null)

  const getTodayString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const getLastDayString = () => {
    const date = new Date()
    date.setDate(date.getDate() + 6)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    await supabase.auth.refreshSession()

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id ?? null
    setCurrentUserId(userId)

    const startDate = getTodayString()
    const endDate = getLastDayString()

    const [
      { data: slotsData, error: slotsError },
      { data: bookingsData, error: bookingsError },
    ] = await Promise.all([
      supabase
        .from('slots')
        .select('id, slot_date, start_time, end_time, is_blocked')
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true }),

      supabase
        .from('bookings')
        .select(`
          id,
          slot_id,
          user_id,
          status,
          profile:profiles!bookings_user_id_fkey (
            full_name
          )
        `)
        .eq('status', 'active'),
    ])

    if (slotsError || bookingsError) {
      setError(
        slotsError?.message ||
          bookingsError?.message ||
          'Errorea datuak kargatzean'
      )
      setLoading(false)
      return
    }

    const nextSlots = (slotsData ?? []) as Slot[]

    setSlots(nextSlots)
    setActiveBookings((bookingsData as BookingRow[] | null) ?? [])

    setSelectedSlots((previousSelected) =>
      previousSelected.filter((slotId) =>
        nextSlots.some((slot) => slot.id === slotId)
      )
    )

    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const getBookingForSlot = (slotId: string) => {
    return activeBookings.find((booking) => booking.slot_id === slotId)
  }

  const getBookingName = (booking: BookingRow | undefined) => {
    if (!booking?.profile) {
      return 'erabiltzaile bat'
    }

    if (Array.isArray(booking.profile)) {
      return booking.profile[0]?.full_name ?? 'erabiltzaile bat'
    }

    return booking.profile.full_name ?? 'erabiltzaile bat'
  }

  const toggleSelectSlot = (slot: Slot) => {
    const booking = getBookingForSlot(slot.id)

    if (slot.is_blocked || booking) {
      return
    }

    setSelectedSlots((previousSelected) =>
      previousSelected.includes(slot.id)
        ? previousSelected.filter((id) => id !== slot.id)
        : [...previousSelected, slot.id]
    )
  }

  const handleReserveSelected = async () => {
    if (selectedSlots.length === 0) {
      return
    }

    setReserving(true)
    setMessage(null)
    setError(null)

    try {
      for (const slotId of selectedSlots) {
        const { error: reserveError } = await supabase.rpc('reserve_slot', {
          p_slot_id: slotId,
        })

        if (reserveError) {
          throw reserveError
        }
      }

      setMessage('Erreserba ondo egin da')
      setSelectedSlots([])
      await loadData()
    } catch (err: any) {
      setError(err.message ?? 'Ezin izan da erreserba egin')
    } finally {
      setReserving(false)
    }
  }

  const handleCancelOwnBooking = async (bookingId: string) => {
    setCancellingId(bookingId)
    setMessage(null)
    setError(null)

    try {
      const { error: cancelError } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
      })

      if (cancelError) {
        throw cancelError
      }

      setMessage('Erreserba ezeztatu da')
      await loadData()
    } catch (err: any) {
      setError(err.message ?? 'Ezin izan da erreserba ezeztatu')
    } finally {
      setCancellingId(null)
    }
  }

  const dayGroups = useMemo<DayGroup[]>(() => {
    const weekdaysEu = [
      'Igandea',
      'Astelehena',
      'Asteartea',
      'Asteazkena',
      'Osteguna',
      'Ostirala',
      'Larunbata',
    ]

    const formatterDate = new Intl.DateTimeFormat('eu-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Madrid',
    })

    const slotsByDate = new Map<string, Slot[]>()

    for (const slot of slots) {
      const currentDaySlots = slotsByDate.get(slot.slot_date) ?? []
      currentDaySlots.push(slot)
      slotsByDate.set(slot.slot_date, currentDaySlots)
    }

    const groups = Array.from(slotsByDate.entries()).map(([date, daySlots]) => {
      const jsDate = new Date(`${date}T12:00:00`)

      return {
        date,
        weekdayLabel: weekdaysEu[jsDate.getDay()],
        dateLabel: formatterDate.format(jsDate),
        slots: [...daySlots].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        ),
      }
    })

    return groups
  }, [slots])

  useEffect(() => {
    if (dayGroups.length > 0 && !openMobileDay) {
      setOpenMobileDay(dayGroups[0].date)
    }
  }, [dayGroups, openMobileDay])

  const renderSlotCard = (slot: Slot) => {
    const booking = getBookingForSlot(slot.id)
    const isMine = booking?.user_id === currentUserId
    const isSelected = selectedSlots.includes(slot.id)

    let className = 'slot-card slot-free'

    if (slot.is_blocked) {
      className = 'slot-card slot-past'
    } else if (isMine) {
      className = 'slot-card slot-mine'
    } else if (booking) {
      className = 'slot-card slot-reserved'
    } else if (isSelected) {
      className = 'slot-card slot-selected'
    }

    return (
      <div key={slot.id} className={className}>
        {slot.is_blocked ? (
          <div className="slot-card-static">
            <span className="slot-time">
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
            <span className="slot-state">Amaituta</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="slot-card-button"
              onClick={() => toggleSelectSlot(slot)}
              disabled={Boolean(booking)}
            >
              <span className="slot-time">
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
              </span>

              <span className="slot-state">
                {isMine
                  ? 'Nire erreserba'
                  : booking
                    ? `${getBookingName(booking)}-k erreserbatuta`
                    : isSelected
                      ? 'Hautatuta'
                      : 'Erabilgarri'}
              </span>
            </button>

            {isMine && booking && (
              <button
                type="button"
                className="secondary-button slot-action-button"
                onClick={() => handleCancelOwnBooking(booking.id)}
                disabled={cancellingId === booking.id}
              >
                {cancellingId === booking.id ? 'Ezeztatzen...' : 'Ezeztatu'}
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="screen-center">Ordutegiak kargatzen...</div>
  }

  return (
    <div className="page">
      <div className="page-header weekly-header">
        <h2>Hurrengo 7 egunak</h2>
        <p className="muted">
          Gaurtik aurrerako egunak erakusten dira. Amaitutako orduak beltzez
          agertzen dira.
        </p>
      </div>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="week-grid desktop-only">
        {dayGroups.map((day) => (
          <section key={day.date} className="day-column card">
            <header className="day-header">
              <h3 className="day-weekday">{day.weekdayLabel}</h3>
              <p className="day-date">{day.dateLabel}</p>
            </header>

            <div className="day-slots">
              {day.slots.map((slot) => renderSlotCard(slot))}
            </div>
          </section>
        ))}
      </div>

      <div className="mobile-days mobile-only">
        {dayGroups.map((day) => {
          const isOpen = openMobileDay === day.date
          const buttonId = `day-button-${day.date}`
          const panelId = `day-panel-${day.date}`

          return (
            <section key={day.date} className="mobile-day card">
              <h3 className="mobile-day-heading">
                <button
                  id={buttonId}
                  type="button"
                  className="mobile-day-toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenMobileDay((current) =>
                      current === day.date ? null : day.date
                    )
                  }
                >
                  <span>
                    <span className="mobile-day-weekday">{day.weekdayLabel}</span>
                    <span className="mobile-day-date">{day.dateLabel}</span>
                  </span>

                  <span className="mobile-day-icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`mobile-day-panel ${isOpen ? 'is-open' : ''}`}
              >
                <div className="mobile-day-panel-inner">
                  <div className="day-slots">
                    {day.slots.map((slot) => renderSlotCard(slot))}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="reserve-bar">
        <button
          type="button"
          className="primary-button"
          onClick={handleReserveSelected}
          disabled={selectedSlots.length === 0 || reserving}
        >
          {reserving
            ? 'Erreserbatzen...'
            : `Hautatutakoak erreserbatu${
                selectedSlots.length ? ` (${selectedSlots.length})` : ''
              }`}
        </button>
      </div>
    </div>
  )
}