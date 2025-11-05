import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, MapPin, Calendar, Users, DollarSign, Car, Bus, Train, Plane, Home, Star, Globe, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { listTrips, normalizeTrip } from '@/services/trips'
import { supabase } from '@/services/supabase'
import ROUTES from '@/config/routes'
import { getFeaturedImage } from '@/services/wikipedia'
import { formatDateRange, formatDateDisplay } from '@/utils/dateFormat'

export default function TripDetailsModal({ isOpen, onClose, tripId, trip: tripProp }) {
  const [loading, setLoading] = useState(false)
  const [trip, setTrip] = useState(tripProp || null)
  const [participants, setParticipants] = useState([])
  const [imageUrl, setImageUrl] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [creatorName, setCreatorName] = useState('')
  const [creatorAvatar, setCreatorAvatar] = useState('')
  const [creatorId, setCreatorId] = useState('')
  const effectiveTripId = tripProp?.id || tripId

  useEffect(() => {
    if (!isOpen) return
    let mounted = true

    async function load() {
      setLoading(true)
      try {
        let t = tripProp || null
        if (!t && effectiveTripId) {
          try {
            const all = await listTrips()
            t = (all || []).find(x => String(x.id) === String(effectiveTripId)) || null
          } catch {}
          if (!t) {
            try {
              const { data } = await api.get('/trips/list/', { params: { id: effectiveTripId } })
              const one = Array.isArray(data?.trips) ? data.trips.find((x) => String(x?.id) === String(effectiveTripId)) : null
              if (one) t = normalizeTrip(one)
            } catch {}
          }
        }
        if (mounted) setTrip(t)
        // Enriquecer con detalle si falta descripción
        if (t?.id && !t?.description) {
          try {
            const detailResp = await api.get(`/trips/${t.id}/`)
            const detailRaw = detailResp?.data || null
            const normalizedDetail = detailRaw ? normalizeTrip(detailRaw) : null
            if (mounted && normalizedDetail) {
              setTrip(prev => ({ ...(prev || t), ...normalizedDetail }))
            }
          } catch {}
        }
        if (t?.creatorId && mounted) setCreatorId(t.creatorId)

        if (t?.id) {
          try {
            const normalizeMembers = (root) => {
              let arr = Array.isArray(root)
                ? root
                : Array.isArray(root?.members)
                  ? root.members
                  : Array.isArray(root?.participants)
                    ? root.participants
                    : Array.isArray(root?.data)
                      ? root.data
                      : Array.isArray(root?.data?.members)
                        ? root.data.members
                        : []
              if (!arr || arr.length === 0) {
                const firstArray = root && typeof root === 'object' 
                  ? Object.values(root).find((v) => Array.isArray(v))
                  : null
                if (Array.isArray(firstArray)) arr = firstArray
              }
              if ((!arr || arr.length === 0) && root?.data && typeof root.data === 'object') {
                const firstArray = Object.values(root.data).find((v) => Array.isArray(v))
                if (Array.isArray(firstArray)) arr = firstArray
              }
              const normalized = (arr || []).map((m) => {
                if (typeof m === 'string') {
                  return { user_id: m, name: '' }
                }
                const user_id = m?.user_id
                  ?? m?.userid
                  ?? m?.userId
                  ?? m?.member_id
                  ?? m?.profile_id
                  ?? m?.id
                  ?? m?.user?.userid
                  ?? m?.user?.id
                  ?? ''
                const displayName = m?.name
                  || m?.fullname
                  || m?.display_name
                  || m?.username
                  || [m?.nombre, m?.apellido].filter(Boolean).join(' ')
                  || [m?.user?.nombre, m?.user?.apellido].filter(Boolean).join(' ')
                  || m?.user?.username
                  || ''
                return { user_id, name: displayName }
              }).filter((m) => m.user_id)
              return normalized
            }

            // Intento 1: /trips/members/ con trip_id
            let response = await api.get('/trips/members/', { params: { trip_id: t.id } })
            let normalized = normalizeMembers(response?.data)

            // Intento 2: si está vacío, usar parámetro id
            if (!normalized || normalized.length === 0) {
              response = await api.get('/trips/members/', { params: { id: t.id } })
              normalized = normalizeMembers(response?.data)
            }

            // Intento 3: endpoint sin slash final
            if (!normalized || normalized.length === 0) {
              response = await api.get('/trips/members', { params: { trip_id: t.id } })
              normalized = normalizeMembers(response?.data)
            }

            // Intento 4: repetir con trip_id numérico
            if (!normalized || normalized.length === 0) {
              const tid = Number(t.id)
              if (!Number.isNaN(tid)) {
                response = await api.get('/trips/members/', { params: { trip_id: tid } })
                normalized = normalizeMembers(response?.data)
              }
            }

            // Intento 5: endpoint alternativo (por si existe)
            if (!normalized || normalized.length === 0) {
              response = await api.get('/trips/members/list/', { params: { trip_id: t.id } }).catch(() => null)
              normalized = normalizeMembers(response?.data)
            }

            if ((!normalized || normalized.length === 0) && t?.id) {
              // Fallback Supabase: obtener miembros del chat grupal del viaje
              try {
                const { data: rooms } = await supabase
                  .from('chat_rooms')
                  .select('id')
                  .eq('trip_id', t.id)
                  .eq('is_group', true)
                  .limit(1)
                const roomId = Array.isArray(rooms) && rooms[0]?.id ? rooms[0].id : null
                if (roomId) {
                  const { data: members } = await supabase
                    .from('chat_members')
                    .select('user_id')
                    .eq('room_id', roomId)
                  const ids = (members || []).map(m => m.user_id).filter(Boolean)
                  if (ids.length > 0) {
                    const { data: users } = await supabase
                      .from('User')
                      .select('userid, nombre, apellido')
                      .in('userid', ids)
                    normalized = (users || []).map(u => ({
                      user_id: u.userid,
                      name: [u?.nombre, u?.apellido].filter(Boolean).join(' ')
                    }))
                  }
                }
              } catch {}
            }

            if (mounted) setParticipants(Array.isArray(normalized) ? normalized : [])
          } catch {}
          // cargar nombre del creador desde supabase
          try {
            if (t.creatorId) {
              const { data, error } = await supabase
                .from('User')
                .select('nombre, apellido, avatar_url')
                .eq('userid', t.creatorId)
                .maybeSingle()
              if (!error && data) {
                const full = [data?.nombre, data?.apellido].filter(Boolean).join(' ')
                if (mounted) {
                  setCreatorName(full)
                  setCreatorAvatar(data?.avatar_url || '')
                }
              }
            }
          } catch {}
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()

    return () => { mounted = false }
  }, [isOpen, effectiveTripId])

  useEffect(() => {
    if (!isOpen) return
    if (!trip?.destination) return
    setImageLoading(true)
    getFeaturedImage(trip.destination)
      .then(url => setImageUrl(url))
      .catch(() => setImageUrl(null))
      .finally(() => setImageLoading(false))
  }, [isOpen, trip?.destination])

  const dateRange = useMemo(() => {
    if (!trip?.startDate) return ''
    try {
      return formatDateRange(trip.startDate, trip.endDate)
    } catch { return '' }
  }, [trip])

  const createdAtText = useMemo(() => {
    if (!trip?.createdAt) return ''
    try {
      return formatDateDisplay(trip.createdAt, { format: 'long' })
    } catch { return '' }
  }, [trip?.createdAt])

  const budget = useMemo(() => {
    if (!trip) return ''
    if (trip.budgetMin || trip.budgetMax) {
      return `${trip.budgetMin ? `$${trip.budgetMin}` : '?'}` + ' - ' + `${trip.budgetMax ? `$${trip.budgetMax}` : '?'}`
    }
    return ''
  }, [trip])

  const getTransportIcon = (type) => {
    switch (type) {
      case 'auto': return <Car className="w-5 h-5" />
      case 'bus': return <Bus className="w-5 h-5" />
      case 'tren': return <Train className="w-5 h-5" />
      case 'avion': return <Plane className="w-5 h-5" />
      default: return <Car className="w-5 h-5" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-4xl mx-auto bg-slate-900/90 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header image */}
        <div className="relative h-64 w-full overflow-hidden">
          {imageLoading ? (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            </div>
          ) : (imageUrl || trip?.imageUrl) ? (
            <img src={imageUrl || trip.imageUrl} alt={trip?.destination || trip?.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="w-16 h-16 text-emerald-400" />
            </div>
          )}

          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white">
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <h2 className="text-2xl font-bold text-white">{trip?.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-slate-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{trip?.origin} → {trip?.destination}</span>
              </div>
              {trip?.tipo && (
                <div className="flex items-center gap-2">
                  {getTransportIcon(trip.tipo)}
                  <span className="capitalize">{trip.tipo}</span>
                </div>
              )}
              {dateRange && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{dateRange}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {trip?.description && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Descripción</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{trip.description}</p>
              </div>
            )}

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Características</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                {trip?.country && <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><span>{trip.country}</span></div>}
                {trip?.roomType && <div className="flex items-center gap-2"><Home className="w-4 h-4" /><span>{trip.roomType}</span></div>}
                {trip?.season && <div className="flex items-center gap-2"><Star className="w-4 h-4" /><span>{trip.season}</span></div>}
                {budget && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span>Presupuesto: {budget}</span></div>}
                {(trip?.currentParticipants != null || trip?.maxParticipants != null) && (
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>{trip?.currentParticipants ?? '?'} / {trip?.maxParticipants ?? '?'} participantes</span></div>
                )}
                {createdAtText && (
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>Creado el {createdAtText}</span></div>
                )}
              </div>
              {Array.isArray(trip?.tags) && trip.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {trip.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Participantes</h3>
              {loading && participants.length === 0 && (
                <div className="text-slate-400 text-sm">Cargando participantes…</div>
              )}
              {!loading && participants.length === 0 && (
                <div className="text-slate-400 text-sm">
                  {typeof trip?.currentParticipants === 'number' && trip.currentParticipants > 0
                    ? `Participantes: ${trip.currentParticipants}`
                    : 'Sin participantes aún'}
                </div>
              )}
              {participants.length > 0 && (
                <div className="grid gap-2">
                  {participants.map((p) => (
                    <div key={p.user_id} className="flex items-center justify-between text-sm">
                      <div className="text-slate-200 font-medium">{p.name || p.user_id}</div>
                      {/* Placeholder for potential actions */}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(creatorName || trip?.creatorName) && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Organizador</h3>
                <Link
                  to={creatorId ? ROUTES.PUBLIC_PROFILE_BY_ID(creatorId) : '#'}
                  className="flex items-center gap-3 group"
                >
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName || trip?.creatorName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {(creatorName || trip?.creatorName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-slate-200 text-sm group-hover:text-white transition-colors">
                    {creatorName || trip?.creatorName}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
