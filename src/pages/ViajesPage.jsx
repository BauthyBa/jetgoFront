import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { listTrips, joinTrip, leaveTrip } from '@/services/trips'
import { applyToTrip, getUserApplications } from '@/services/applications'
import { listRoomsForUser } from '@/services/chat'
import { supabase, getSession } from '@/services/supabase'
import { 
  MapPin, 
  Calendar, 
  Car,
  Bus,
  Train,
  Plane,
  Users,
  DollarSign,
  Star,
  SlidersHorizontal,
  Loader2,
  RotateCcw,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TarjetaViaje from '@/components/TarjetaViaje'
import TripGrid from '@/components/TripGrid'
import TripListHorizontal from '@/components/TripListHorizontal'
import ApplyToTripModal from '@/components/ApplyToTripModal'

export default function ViajesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [tripsBase, setTripsBase] = useState([])
  const [loading, setLoading] = useState(true)
  const [creatorsInfo, setCreatorsInfo] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const [joiningId, setJoiningId] = useState(null)
  const [leavingId, setLeavingId] = useState(null)
  const [applyModal, setApplyModal] = useState({ open: false, trip: null })
  const [joinDialog, setJoinDialog] = useState({ open: false, title: '', message: '' })
  const [userApplications, setUserApplications] = useState([])
  
  // Estados de búsqueda
  const [searchFrom, setSearchFrom] = useState('')
  const [searchTo, setSearchTo] = useState('')
  const [searchDate, setSearchDate] = useState('')
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    sortBy: 'date_asc',
    transportType: 'all',
    priceRange: [],
    participants: [],
    rating: false
  })

  // Obtener parámetros de URL
  const urlFrom = searchParams.get('desde') || ''
  const urlTo = searchParams.get('hasta') || ''
  const urlDate = searchParams.get('fecha') || ''

  // Inicializar búsqueda con parámetros de URL
  useEffect(() => {
    if (urlFrom) setSearchFrom(urlFrom)
    if (urlTo) setSearchTo(urlTo)
    if (urlDate) setSearchDate(urlDate)
  }, [urlFrom, urlTo, urlDate])

  // Cargar información de creadores
  const fetchCreatorsInfo = async (tripsData) => {
    const creatorIds = tripsData
      .map(trip => trip.creatorId)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index)
    
    if (creatorIds.length === 0) return {}
    
    try {
      const { data, error } = await supabase
        .from('User')
        .select('userid, nombre, apellido')
        .in('userid', creatorIds)
      
      if (error) throw error
      
      const map = {}
      for (const row of data || []) {
        const fullName = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && fullName) {
          map[row.userid] = fullName
        }
      }
      return map
    } catch (error) {
      console.error('Error cargando información de creadores:', error)
      return {}
    }
  }

  // Cargar perfil de usuario
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await getSession()
        if (session?.user) {
          setProfile(session.user)
          // Cargar rooms del usuario
          try {
            const userRooms = await listRoomsForUser(session.user.id)
            setRooms(userRooms)
          } catch (error) {
            console.error('Error cargando rooms:', error)
          }
          // Cargar aplicaciones del usuario
          try {
            const applications = await getUserApplications(session.user.id)
            setUserApplications(applications)
          } catch (error) {
            console.error('Error cargando aplicaciones:', error)
          }
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      }
    }

    loadProfile()
  }, [])

  // Cargar viajes
  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true)
      try {
        const tripsData = await listTrips()
        setTrips(tripsData)
        setTripsBase(tripsData)
        
        const creators = await fetchCreatorsInfo(tripsData)
        setCreatorsInfo(creators)
      } catch (error) {
        console.error('Error cargando viajes:', error)
        setTrips([])
        setTripsBase([])
      } finally {
        setLoading(false)
      }
    }

    loadTrips()
  }, [])

  // Filtrar y ordenar viajes
  const filteredTrips = useMemo(() => {
    let result = [...trips]

    // Filtro por búsqueda
    if (searchFrom) {
      result = result.filter(trip => 
        trip.origin?.toLowerCase().includes(searchFrom.toLowerCase())
      )
    }
    
    if (searchTo) {
      result = result.filter(trip => 
        trip.destination?.toLowerCase().includes(searchTo.toLowerCase())
      )
    }
    
    if (searchDate) {
      const searchDateObj = new Date(searchDate)
      result = result.filter(trip => {
        if (!trip.startDate) return true
        const tripDate = new Date(trip.startDate)
        return tripDate.toDateString() === searchDateObj.toDateString()
      })
    }

    // Filtro por tipo de transporte
    if (filters.transportType !== 'all') {
      result = result.filter(trip => trip.tipo === filters.transportType)
    }

    // Filtro por rango de precio
    if (filters.priceRange.length > 0) {
      result = result.filter(trip => {
        const price = trip.budgetMin || trip.budgetMax || 0
        return filters.priceRange.some(range => {
          const [min, max] = range.split('-').map(Number)
          return price >= min && (max ? price <= max : true)
        })
      })
    }

    // Filtro por participantes
    if (filters.participants.length > 0) {
      result = result.filter(trip => {
        const participants = trip.maxParticipants || 0
        return filters.participants.some(range => {
          const [min, max] = range.split('-').map(Number)
          return participants >= min && (max ? participants <= max : true)
        })
      })
    }

    // Filtro por calificación
    if (filters.rating) {
      result = result.filter(trip => trip.rating >= 4.5)
    }

    // Ordenamiento
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_asc':
          return new Date(a.startDate) - new Date(b.startDate)
        case 'date_desc':
          return new Date(b.startDate) - new Date(a.startDate)
        case 'price_asc':
          return (a.budgetMin || 0) - (b.budgetMin || 0)
        case 'price_desc':
          return (b.budgetMin || 0) - (a.budgetMin || 0)
        case 'participants_asc':
          return (a.maxParticipants || 0) - (b.maxParticipants || 0)
        case 'participants_desc':
          return (b.maxParticipants || 0) - (a.maxParticipants || 0)
        default:
          return 0
      }
    })

    return result
  }, [trips, searchFrom, searchTo, searchDate, filters])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      sortBy: 'date_asc',
      transportType: 'all',
      priceRange: [],
      participants: [],
      rating: false
    })
  }

  // Funciones de manejo de viajes
  const loadTrips = async () => {
    try {
      const tripsData = await listTrips()
      setTrips(tripsData)
      setTripsBase(tripsData)
      
      const creators = await fetchCreatorsInfo(tripsData)
      setCreatorsInfo(creators)
    } catch (error) {
      console.error('Error cargando viajes:', error)
    }
  }

  const handleJoin = async (trip) => {
    setApplyModal({ open: true, trip })
  }

  const handleLeave = async (trip) => {
    try {
      if (!profile?.id) throw new Error('Sin usuario')
      const confirmMsg = (trip.creatorId && trip.creatorId === profile.id)
        ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
        : '¿Seguro que querés abandonar este viaje?'
      if (!confirm(confirmMsg)) return
      
      setLeavingId(trip.id)
      const data = await leaveTrip(trip.id, profile.id)
      if (data?.ok !== false) {
        await loadTrips()
        // refrescar salas de chat por si cambió membresía o se eliminó
        try { 
          const r = await listRoomsForUser(profile.id)
          setRooms(r) 
        } catch {}
        setJoinDialog({ 
          open: true, 
          title: (trip.creatorId && trip.creatorId === profile.id) ? 'Viaje eliminado' : 'Saliste del viaje', 
          message: (trip.creatorId && trip.creatorId === profile.id) ? 'Se eliminó el viaje y su chat.' : 'Ya no sos parte del viaje.' 
        })
      } else {
        alert(data?.error || 'No se pudo abandonar/eliminar el viaje')
      }
    } catch (e) {
      alert(e?.message || 'Error al abandonar/eliminar')
    } finally {
      setLeavingId(null)
    }
  }

  const handleApply = (trip) => {
    setApplyModal({ open: true, trip })
  }

  const isMemberFn = (trip) => {
    try {
      return Array.isArray(rooms) && rooms.some((r) => (
        String(r?.trip_id) === String(trip.id) && (r?.is_group === true || (!r?.is_private && !r?.application_id))
      ))
    } catch { 
      return false 
    }
  }

  const isOwnerFn = (trip) => {
    return trip.creatorId && trip.creatorId === profile?.id
  }

  const hasAppliedFn = (trip) => {
    return userApplications.some(app => app.trip_id === trip.id)
  }

  const transportTypes = [
    { value: 'all', label: 'Todos', icon: null },
    { value: 'auto', label: 'Auto', icon: Car },
    { value: 'bus', label: 'Bus', icon: Bus },
    { value: 'tren', label: 'Tren', icon: Train },
    { value: 'avion', label: 'Avión', icon: Plane }
  ]

  const priceRanges = [
    { value: '0-100', label: 'Hasta $100' },
    { value: '100-500', label: '$100 - $500' },
    { value: '500-1000', label: '$500 - $1000' },
    { value: '1000-9999', label: 'Más de $1000' }
  ]

  const participantRanges = [
    { value: '1-2', label: '1-2 personas' },
    { value: '3-5', label: '3-5 personas' },
    { value: '6-10', label: '6-10 personas' },
    { value: '10-999', label: 'Más de 10 personas' }
  ]

  const sortOptions = [
    { value: 'date_asc', label: 'Fecha más temprana' },
    { value: 'date_desc', label: 'Fecha más tardía' },
    { value: 'price_asc', label: 'Precio más bajo' },
    { value: 'price_desc', label: 'Precio más alto' },
    { value: 'participants_asc', label: 'Menos participantes' },
    { value: 'participants_desc', label: 'Más participantes' }
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              Descubre tu próximo <span className="text-emerald-400">viaje</span>
            </h1>
            <p className="text-lg text-slate-300">
              Conecta con personas que van al mismo destino y comparte la aventura
            </p>
          </div>

          {/* Barra de búsqueda */}
          <div className="bg-slate-800 rounded-lg p-4 mb-8">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Desde dónde"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Hacia dónde"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={() => setFiltersOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="flex gap-8">
            {/* Sidebar de filtros - Solo desktop */}
            <div className="hidden lg:block w-72">
              <div className="bg-slate-800 rounded-lg p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Filtros</h3>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpiar
                  </button>
                </div>

                {/* Botones de filtrado de viajes */}
                {profile && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Tipo de viajes</h4>
                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowMineOnly(false)
                          setTrips(tripsBase || [])
                          setVisibleCount(6)
                        }}
                        className="w-full justify-start"
                      >
                        Viajes disponibles
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const mine = (tripsBase || []).filter((t) => t.creatorId && t.creatorId === profile.id)
                          setTrips(mine)
                          setShowMineOnly(true)
                          setVisibleCount(6)
                        }}
                        className="w-full justify-start"
                      >
                        Mis viajes
                      </Button>
                    </div>
                  </div>
                )}

                {/* Ordenar por */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Ordenar por</h4>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de transporte */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Tipo de transporte</h4>
                  <div className="space-y-2">
                    {transportTypes.map(type => {
                      const Icon = type.icon
                      return (
                        <label
                          key={type.value}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                        >
                          <input
                            type="radio"
                            name="transportType"
                            value={type.value}
                            checked={filters.transportType === type.value}
                            onChange={(e) => updateFilter('transportType', e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-200 flex items-center gap-2">
                            {Icon && <Icon className="w-4 h-4" />}
                            {type.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Rango de precio */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Rango de precio
                  </h4>
                  <div className="space-y-2">
                    {priceRanges.map(range => (
                      <label
                        key={range.value}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.priceRange.includes(range.value)}
                          onChange={(e) => {
                            const newRanges = e.target.checked
                              ? [...filters.priceRange, range.value]
                              : filters.priceRange.filter(r => r !== range.value)
                            updateFilter('priceRange', newRanges)
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-200">
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Número de participantes */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Participantes
                  </h4>
                  <div className="space-y-2">
                    {participantRanges.map(range => (
                      <label
                        key={range.value}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.participants.includes(range.value)}
                          onChange={(e) => {
                            const newRanges = e.target.checked
                              ? [...filters.participants, range.value]
                              : filters.participants.filter(r => r !== range.value)
                            updateFilter('participants', newRanges)
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-200">
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Calificación */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Calificación
                  </h4>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={filters.rating}
                      onChange={(e) => updateFilter('rating', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-200">
                      Solo viajes con buena calificación
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Lista de viajes */}
            <div className="flex-1 max-w-4xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {showMineOnly ? 'Mis Viajes' : 'Viajes Disponibles'} ({filteredTrips.length})
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex items-center gap-3 text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Cargando viajes...</span>
                  </div>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-20">
                  <div className="bg-slate-800 rounded-lg p-12 max-w-lg mx-auto">
                    <div className="text-6xl mb-4">😕</div>
                    <h3 className="text-xl font-semibold text-white mb-4">
                      No se encontraron viajes
                    </h3>
                    <p className="text-slate-300">
                      No hay viajes que coincidan con tu búsqueda. Prueba ajustar los filtros.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {profile ? (
                    <TripListHorizontal
                      trips={(showMineOnly ? filteredTrips : filteredTrips.filter((t) => !(t.creatorId && t.creatorId === profile.id))).slice(0, visibleCount)}
                      joiningId={joiningId}
                      leavingId={leavingId}
                      onJoin={handleJoin}
                      onApply={handleApply}
                      onLeave={handleLeave}
                      canEdit={(t) => t.creatorId && t.creatorId === profile.id}
                      isMemberFn={isMemberFn}
                      isOwnerFn={isOwnerFn}
                      hasAppliedFn={hasAppliedFn}
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredTrips.map((trip) => (
                        <TarjetaViaje 
                          key={trip.id} 
                          viaje={trip} 
                          creadorNombre={creatorsInfo[trip.creatorId] || 'Usuario'}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Botón cargar más */}
                  {(() => { 
                    const list = showMineOnly ? filteredTrips : filteredTrips.filter((t) => !(t.creatorId && t.creatorId === profile?.id))
                    return list.length > 0 && visibleCount < list.length 
                  })() && (
                    <div className="flex justify-center mt-8">
                      <Button 
                        onClick={() => setVisibleCount((v) => v + 6)}
                        variant="secondary"
                      >
                        Cargar más
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de filtros para móvil */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFiltersOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-slate-800 shadow-xl">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Filtros</h3>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 hover:bg-slate-700 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 h-full overflow-y-auto">
              {/* Contenido de filtros móvil */}
              <div className="space-y-6">
                {/* Ordenar por */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Ordenar por</h4>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de transporte */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Tipo de transporte</h4>
                  <div className="space-y-2">
                    {transportTypes.map(type => {
                      const Icon = type.icon
                      return (
                        <label
                          key={type.value}
                          className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                        >
                          <input
                            type="radio"
                            name="transportType"
                            value={type.value}
                            checked={filters.transportType === type.value}
                            onChange={(e) => updateFilter('transportType', e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-200 flex items-center gap-2">
                            {Icon && <Icon className="w-4 h-4" />}
                            {type.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Rango de precio */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Rango de precio
                  </h4>
                  <div className="space-y-2">
                    {priceRanges.map(range => (
                      <label
                        key={range.value}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.priceRange.includes(range.value)}
                          onChange={(e) => {
                            const newRanges = e.target.checked
                              ? [...filters.priceRange, range.value]
                              : filters.priceRange.filter(r => r !== range.value)
                            updateFilter('priceRange', newRanges)
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-200">
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Número de participantes */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Participantes
                  </h4>
                  <div className="space-y-2">
                    {participantRanges.map(range => (
                      <label
                        key={range.value}
                        className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={filters.participants.includes(range.value)}
                          onChange={(e) => {
                            const newRanges = e.target.checked
                              ? [...filters.participants, range.value]
                              : filters.participants.filter(r => r !== range.value)
                            updateFilter('participants', newRanges)
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-200">
                          {range.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Calificación */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Calificación
                  </h4>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={filters.rating}
                      onChange={(e) => updateFilter('rating', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-200">
                      Solo viajes con buena calificación
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de aplicación */}
      {applyModal.open && (
        <ApplyToTripModal
          trip={applyModal.trip}
          onClose={() => setApplyModal({ open: false, trip: null })}
          onSuccess={async () => {
            setApplyModal({ open: false, trip: null })
            await loadTrips()
            // Recargar aplicaciones del usuario
            if (profile?.id) {
              try {
                const applications = await getUserApplications(profile.id)
                setUserApplications(applications)
              } catch (error) {
                console.error('Error recargando aplicaciones:', error)
              }
            }
          }}
        />
      )}

      {/* Dialog de confirmación */}
      {joinDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setJoinDialog({ open: false, title: '', message: '' })} />
          <div className="relative bg-slate-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">{joinDialog.title}</h3>
            <p className="text-slate-300 mb-6">{joinDialog.message}</p>
            <div className="flex justify-end">
              <Button 
                onClick={() => setJoinDialog({ open: false, title: '', message: '' })}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}