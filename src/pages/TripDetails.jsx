import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import GlassCard from '@/components/GlassCard'
import { api } from '@/services/api'
import { listTrips, normalizeTrip } from '@/services/trips'
import { Button } from '@/components/ui/button'

export default function TripDetails() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trip, setTrip] = useState(null)
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        // Try to find trip from existing list for faster UX, fallback to backend by id
        let found = null
        try {
          const all = await listTrips()
          found = (all || []).find((t) => String(t.id) === String(tripId)) || null
        } catch {}
        if (!found) {
          try {
            const { data } = await api.get('/trips/list/', { params: { id: tripId } })
            const one = Array.isArray(data?.trips) ? data.trips.find((x) => String(x?.id) === String(tripId)) : null
            if (one) found = normalizeTrip(one)
          } catch {}
        }
        if (!found) throw new Error('No se encontró el viaje')
        if (mounted) setTrip(found)

        // Load participants
        try {
          const res = await api.get('/trips/members/', { params: { trip_id: tripId } })
          const members = Array.isArray(res?.data?.members) ? res.data.members : []
          if (mounted) setParticipants(members)
        } catch {}
      } catch (e) {
        if (mounted) setError(e?.message || 'No se pudo cargar el viaje')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (tripId) load()
    return () => { mounted = false }
  }, [tripId])

  const dateRange = useMemo(() => {
    if (!trip?.startDate) return ''
    try {
      return trip?.endDate
        ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`
        : new Date(trip.startDate).toLocaleDateString()
    } catch { return '' }
  }, [trip])

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>
  if (error) return <div className="container"><pre className="error">{error}</pre></div>
  if (!trip) return <div className="container"><p className="muted">No encontrado</p></div>

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 text-white" style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {trip.imageUrl && (
              <img src={trip.imageUrl} alt={trip.name} style={{ width: 160, height: 160, borderRadius: 16, objectFit: 'cover' }} />
            )}
            <div style={{ display: 'grid', gap: 6 }}>
              <h2 className="page-title" style={{ margin: 0 }}>{trip.name}</h2>
              <div className="muted">{trip.origin || 'Origen ?'} → {trip.destination || 'Destino ?'}</div>
              {dateRange && <div className="muted">{dateRange}</div>}
              {trip.country && <div className="muted">{trip.country}</div>}
              {(trip.budgetMin != null || trip.budgetMax != null) && (
                <div className="muted">Presupuesto: ${trip.budgetMin ?? '?'} - ${trip.budgetMax ?? '?'}</div>
              )}
              {(trip.currentParticipants != null || trip.maxParticipants != null) && (
                <div className="muted">Cupos: {trip.currentParticipants ?? '?'} / {trip.maxParticipants ?? '?'}</div>
              )}
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => navigate(`/modern-chat?trip=${encodeURIComponent(trip.id)}`)}>Ir al chat del viaje</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 16 }}>
          <h3 className="page-title" style={{ margin: 0 }}>Participantes</h3>
          {(participants || []).length === 0 && <p className="muted" style={{ marginTop: 8 }}>Sin participantes aún</p>}
          {(participants || []).length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {participants.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  className="glass-card"
                  style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', width: '100%' }}
                  onClick={() => {
                    try {
                      if (!m?.user_id) return
                      // Intentar navegar por username si está disponible, sino por user_id
                      if (m.username) {
                        navigate(`/u/${m.username}`)
                      } else {
                        navigate(`/u/${m.user_id}`)
                      }
                    } catch {}
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{m.name || m.user_id}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Ver perfil →</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}


