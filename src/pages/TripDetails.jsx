import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import GlassCard from '@/components/GlassCard'
import BackButton from '@/components/BackButton'
import { api } from '@/services/api'
import { listTrips, normalizeTrip } from '@/services/trips'
import { Button } from '@/components/ui/button'
import { getSession } from '@/services/supabase'
import { getUserApplications } from '@/services/applications'
import { listRoomsForUser } from '@/services/chat'
import ROUTES from '@/config/routes'
import ReportUserModal from '@/components/ReportUserModal'
import { Star, MessageCircle, Flag } from 'lucide-react'

export default function TripDetails() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trip, setTrip] = useState(null)
  const [participants, setParticipants] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [userRooms, setUserRooms] = useState([])
  const [userApplications, setUserApplications] = useState([])
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportedUserId, setReportedUserId] = useState(null)
  const [reportedUserName, setReportedUserName] = useState('')

  // Cargar información del usuario actual
  useEffect(() => {
    let mounted = true
    async function loadUserInfo() {
      try {
        const session = await getSession()
        if (mounted && session?.user) {
          setCurrentUser(session.user)
          
          // Cargar rooms del usuario
          try {
            const rooms = await listRoomsForUser(session.user.id)
            if (mounted) setUserRooms(rooms)
          } catch (error) {
            console.error('Error cargando rooms:', error)
          }
          
          // Cargar aplicaciones del usuario
          try {
            const applications = await getUserApplications(session.user.id)
            if (mounted) setUserApplications(applications)
          } catch (error) {
            console.error('Error cargando aplicaciones:', error)
          }
        }
      } catch (error) {
        console.error('Error cargando sesión:', error)
      }
    }
    loadUserInfo()
    return () => { mounted = false }
  }, [])

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

  // Determinar el estado del usuario con respecto al viaje
  const userTripStatus = useMemo(() => {
    if (!currentUser || !trip) {
      return { isOwner: false, isMember: false, hasApplied: false }
    }

    // Verificar si es el creador del viaje
    const isOwner = trip.creatorId && trip.creatorId === currentUser.id

    // Verificar si es miembro (tiene acceso al chat grupal)
    const isMember = Array.isArray(userRooms) && userRooms.some((room) => (
      String(room?.trip_id) === String(trip.id) && 
      (room?.is_group === true || (!room?.is_private && !room?.application_id))
    ))

    // Verificar si ya aplicó al viaje
    const hasApplied = userApplications.some(app => String(app.trip_id) === String(trip.id))

    return { isOwner, isMember, hasApplied }
  }, [currentUser, trip, userRooms, userApplications])

  // Manejar la acción principal según el estado del usuario
  const handlePrimaryAction = () => {
    if (userTripStatus.isMember || userTripStatus.isOwner) {
      // Si es miembro o dueño, ir al chat
      navigate(ROUTES.TRIP_CHAT(trip.id))
    } else {
      // Si no es miembro, ir a la página de aplicación (viajes)
      navigate(ROUTES.VIAJES)
    }
  }

  // Obtener el texto y estilo del botón principal
  const getPrimaryButtonProps = () => {
    if (userTripStatus.isOwner) {
      return {
        text: 'Ir al chat del viaje',
        variant: 'default',
        disabled: false
      }
    } else if (userTripStatus.isMember) {
      return {
        text: 'Ir al chat del viaje',
        variant: 'default',
        disabled: false
      }
    } else if (userTripStatus.hasApplied) {
      return {
        text: 'Solicitud enviada - Esperando aprobación',
        variant: 'secondary',
        disabled: true
      }
    } else {
      return {
        text: 'Aplicar al viaje',
        variant: 'default',
        disabled: false
      }
    }
  }

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>
  if (error) return <div className="container"><pre className="error">{error}</pre></div>
  if (!trip) return <div className="container"><p className="muted">No encontrado</p></div>

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 text-white" style={{ display: 'grid', gap: 16 }}>
        {/* Botón de volver */}
        <div className="mb-4">
          <BackButton fallback="/viajes" variant="ghost" />
        </div>
        
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
              {currentUser && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <Button 
                    onClick={handlePrimaryAction}
                    disabled={getPrimaryButtonProps().disabled}
                    variant={getPrimaryButtonProps().variant}
                  >
                    {getPrimaryButtonProps().text}
                  </Button>
                  {userTripStatus.isOwner && (
                    <div className="text-sm text-emerald-400" style={{ marginTop: 4 }}>
                      ✓ Eres el organizador de este viaje
                    </div>
                  )}
                  {userTripStatus.isMember && !userTripStatus.isOwner && (
                    <div className="text-sm text-emerald-400" style={{ marginTop: 4 }}>
                      ✓ Eres participante de este viaje
                    </div>
                  )}
                </div>
              )}
              {!currentUser && (
                <div style={{ marginTop: 8 }}>
                  <Button onClick={() => navigate(ROUTES.LOGIN)}>
                    Inicia sesión para aplicar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Reseñas y Reportar */}
        {trip && (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* Botón Ver Reseñas */}
              <Button
                onClick={() => navigate(ROUTES.TRIP_REVIEWS(trip.id))}
                variant="secondary"
                style={{ flex: '1 1 auto', minWidth: 150 }}
              >
                <Star className="w-4 h-4 mr-2" />
                Ver Reseñas
              </Button>

              {/* Botón Reportar Organizador (solo si no eres el organizador) */}
              {currentUser && !userTripStatus.isOwner && trip.creatorId && (
                <Button
                  onClick={() => {
                    setReportedUserId(trip.creatorId)
                    setReportedUserName('Organizador del viaje')
                    setReportModalOpen(true)
                  }}
                  variant="secondary"
                  style={{ flex: '1 1 auto', minWidth: 150, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Reportar Organizador
                </Button>
              )}
            </div>
          </div>
        )}

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
                      // Navegar usando la ruta de perfil público por ID
                      navigate(ROUTES.PUBLIC_PROFILE_BY_ID(m.user_id))
                    } catch (error) {
                      console.error('Error navegando a perfil:', error)
                    }
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{m.name || m.user_id}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Ver perfil →</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Reportar Usuario */}
        {reportModalOpen && (
          <ReportUserModal
            isOpen={reportModalOpen}
            onClose={() => {
              setReportModalOpen(false)
              setReportedUserId(null)
              setReportedUserName('')
            }}
            reportedUserId={reportedUserId}
            reportedUserName={reportedUserName}
          />
        )}
      </div>
    </DashboardLayout>
  )
}


