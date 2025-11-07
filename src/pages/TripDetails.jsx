import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import { api } from '@/services/api'
import { listTrips, normalizeTrip } from '@/services/trips'
import { Button } from '@/components/ui/button'
import { getSession } from '@/services/supabase'
import { getUserApplications } from '@/services/applications'
import { listRoomsForUser } from '@/services/chat'
import ROUTES from '@/config/routes'
import ReportUserModal from '@/components/ReportUserModal'
import { formatDateRange } from '@/utils/dateFormat'
import {
  Star,
  MessageCircle,
  Flag,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Globe,
  Home,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { getParticipantStats, getRemainingSlots } from '@/utils/tripParticipants'

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
    return () => {
      mounted = false
    }
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
    return () => {
      mounted = false
    }
  }, [tripId])

  const dateRange = useMemo(() => {
    if (!trip?.startDate) return ''
    try {
      return formatDateRange(trip.startDate, trip.endDate)
    } catch {
      return ''
    }
  }, [trip])

  const formattedBudget = useMemo(() => {
    if (!trip) return null
    const min = trip.budgetMin != null ? `$${trip.budgetMin}` : null
    const max = trip.budgetMax != null ? `$${trip.budgetMax}` : null
    if (!min && !max) return null
    if (min && max) return `${min} - ${max}`
    return min || max
  }, [trip])

  const participantStats = useMemo(() => getParticipantStats(trip), [trip])
  const participantsInfo = useMemo(() => {
    if (!participantStats) return null
    const hasInfo = participantStats.hasCurrent || participantStats.hasMax
    if (!hasInfo) return null
    const remaining = getRemainingSlots(trip)
    return {
      label: participantStats.label,
      remaining,
      current: participantStats.current,
      max: participantStats.max,
    }
  }, [trip, participantStats])

  const occupancyPercent = useMemo(() => {
    if (!participantStats?.hasMax || !participantStats.hasCurrent) return null
    const { current, max } = participantStats
    if (max == null || max <= 0 || current == null) return null
    return Math.max(0, Math.min(100, Math.round((current / max) * 100)))
  }, [participantStats])

  const transportLabel = useMemo(() => {
    if (!trip?.tipo) return null
    const value = String(trip.tipo)
    return value.charAt(0).toUpperCase() + value.slice(1)
  }, [trip?.tipo])

  const infoItems = useMemo(() => {
    if (!trip) return []
    const items = []
    if (dateRange) items.push({ icon: Calendar, label: 'Fechas', value: dateRange })
    if (formattedBudget) items.push({ icon: DollarSign, label: 'Presupuesto estimado', value: formattedBudget })
    if (participantsInfo?.label) items.push({ icon: Users, label: 'Cupos disponibles', value: participantsInfo.label })
    if (trip.season) items.push({ icon: Clock, label: 'Temporada', value: trip.season })
    if (trip.roomType) items.push({ icon: Home, label: 'Alojamiento', value: trip.roomType })
    if (trip.country) items.push({ icon: Globe, label: 'País', value: trip.country })
    return items
  }, [trip, dateRange, formattedBudget, participantsInfo])

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
    const hasApplied = userApplications.some((app) => String(app.trip_id) === String(trip.id))

    return { isOwner, isMember, hasApplied }
  }, [currentUser, trip, userRooms, userApplications])

  // Manejar la acción principal según el estado del usuario
  const handlePrimaryAction = () => {
    if (userTripStatus.isMember || userTripStatus.isOwner) {
      // Si es miembro o dueño, ir al chat
      navigate(ROUTES.TRIP_CHAT(trip.id))
    } else {
      // Si no es miembro, ir a la página de aplicación (viajes)
      navigate(`${ROUTES.VIAJES}?view=search`)
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

  const primaryButton = getPrimaryButtonProps()

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>
  if (error) return <div className="container"><pre className="error">{error}</pre></div>
  if (!trip) return <div className="container"><p className="muted">No encontrado</p></div>

  return (
    <DashboardLayout showNav={false}>
      <div className="space-y-10 pb-16 pt-4 text-white md:pt-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            onClick={() => navigate(ROUTES.TRIP_REVIEWS(trip.id))}
            variant="secondary"
            className="h-11 rounded-2xl border border-white/10 bg-white/10 text-white transition hover:border-white/20 hover:bg-white/20"
          >
            <Star className="h-4 w-4" />
            Ver reseñas
          </Button>
          {currentUser && !userTripStatus.isOwner && trip.creatorId && (
            <Button
              onClick={() => {
                setReportedUserId(trip.creatorId)
                setReportedUserName('Organizador del viaje')
                setReportModalOpen(true)
              }}
              variant="secondary"
              className="h-11 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20"
            >
              <Flag className="h-4 w-4" />
              Reportar organizador
            </Button>
          )}
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl">
          {trip.imageUrl ? (
            <img
              src={trip.imageUrl}
              alt={trip.name}
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-emerald-500/25 via-sky-500/15 to-slate-900" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/85 via-slate-900/60 to-slate-950/75" />

          <div className="relative z-10 grid gap-8 p-8 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:p-12">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-200/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 font-medium text-emerald-200 shadow-lg shadow-emerald-500/10">
                  <MapPin className="h-4 w-4" />
                  {trip.origin || 'Origen ?'} → {trip.destination || 'Destino ?'}
                </span>
                {transportLabel && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-slate-100">
                    {transportLabel}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                  {trip.name}
                </h1>
                {dateRange && (
                  <div className="flex items-center gap-2 text-slate-200">
                    <Calendar className="h-5 w-5 text-emerald-300" />
                    <span className="text-base font-medium">{dateRange}</span>
                  </div>
                )}
              </div>

              {trip.description && (
                <p className="max-w-2xl text-base leading-relaxed text-slate-200/90">{trip.description}</p>
              )}

              {trip.tags && trip.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {trip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 rounded-2xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur md:p-7">
              <div className="flex items-center gap-3 text-emerald-200/90">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-100/70">
                    Tu participación
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {userTripStatus.isOwner
                      ? 'Eres el organizador'
                      : userTripStatus.isMember
                        ? 'Ya eres parte del viaje'
                        : userTripStatus.hasApplied
                          ? 'Solicitud en proceso'
                          : 'Únete a la aventura'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Cupos</p>
                    <p className="text-base font-semibold text-white">
                      {participantsInfo?.label ?? 'Por definir'}
                    </p>
                  </div>
                  {occupancyPercent != null && (
                    <div className="flex w-28 flex-col items-end gap-1 text-xs text-slate-300">
                      <span>{occupancyPercent}% ocupado</span>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {currentUser ? (
                <div className="space-y-4">
                  <Button
                    onClick={handlePrimaryAction}
                    disabled={primaryButton.disabled}
                    variant={primaryButton.variant}
                    className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-emerald-500/20 transition hover:shadow-emerald-500/40"
                  >
                    {primaryButton.text}
                  </Button>
                  {userTripStatus.isOwner && (
                    <p className="text-sm text-emerald-200/80">Gestiona a tu equipo y coordina desde el chat.</p>
                  )}
                  {userTripStatus.isMember && !userTripStatus.isOwner && (
                    <p className="text-sm text-emerald-200/80">Ya estás dentro. Revisa el chat grupal para las novedades.</p>
                  )}
                  {userTripStatus.hasApplied && !userTripStatus.isMember && (
                    <p className="text-sm text-slate-300">Te avisaremos cuando el organizador apruebe tu solicitud.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-200/90">
                    Inicia sesión para sumarte al viaje, chatear con el grupo y seguir todas las actualizaciones.
                  </p>
                  <Button
                    onClick={() => navigate(ROUTES.LOGIN)}
                    className="h-12 w-full rounded-2xl text-base font-semibold"
                  >
                    Iniciar sesión
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {infoItems.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-lg shadow-slate-900/20"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="text-base font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Participantes</h2>
              <p className="text-sm text-slate-400">Personas que ya se sumaron al viaje</p>
            </div>
            {participantsInfo?.label && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200">
                {participantsInfo.label}
              </span>
            )}
          </div>

          {(participants || []).length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">
              Aún no hay participantes confirmados. ¡Sé el primero en sumarte!
            </p>
          ) : (
            <div className="mt-6 grid gap-3">
              {participants.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  className="group flex items-center justify-between rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
                  onClick={() => {
                    try {
                      if (!m?.user_id) return
                      navigate(ROUTES.PUBLIC_PROFILE_BY_ID(m.user_id))
                    } catch (error) {
                      console.error('Error navegando a perfil:', error)
                    }
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{m.name || m.user_id}</p>
                    <p className="text-xs text-slate-300 transition group-hover:text-emerald-200">
                      Ver perfil
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-emerald-300 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </button>
              ))}
            </div>
          )}
        </section>

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
