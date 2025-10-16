import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Users, 
  MapPin, 
  Calendar, 
  Heart, 
  MessageCircle, 
  Share2, 
  Filter,
  RefreshCw,
  TrendingUp,
  Star,
  UserPlus,
  Plane,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { getFeedEvents, getFeedStats } from '@/services/feed'
import { getSession } from '@/services/supabase'
import GlassCard from './GlassCard'
import { Button } from './ui/button'

export default function SocialFeed() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [filters, setFilters] = useState({
    eventType: 'all',
    days: 30
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadFeed()
      loadStats()
    }
  }, [user, filters])

  const loadUser = async () => {
    try {
      const session = await getSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Error cargando usuario:', error)
      navigate('/login')
    }
  }

  const loadFeed = async () => {
    try {
      setLoading(true)
      setError('')
      const feedData = await getFeedEvents(filters)
      setEvents(feedData.results || feedData)
    } catch (error) {
      console.error('Error cargando feed:', error)
      setError('Error cargando el feed')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await getFeedStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getEventIcon = (eventType) => {
    const iconMap = {
      'trip_created': <Plane className="w-5 h-5" />,
      'trip_joined': <Users className="w-5 h-5" />,
      'application_received': <MessageCircle className="w-5 h-5" />,
      'application_accepted': <CheckCircle className="w-5 h-5" />,
      'application_rejected': <XCircle className="w-5 h-5" />,
      'friendship_request': <UserPlus className="w-5 h-5" />,
      'friendship_accepted': <Heart className="w-5 h-5" />,
      'trip_completed': <Star className="w-5 h-5" />,
      'trip_reviewed': <Star className="w-5 h-5" />,
      'user_joined': <TrendingUp className="w-5 h-5" />,
    }
    return iconMap[eventType] || <Activity className="w-5 h-5" />
  }

  const getEventColor = (eventType) => {
    const colorMap = {
      'trip_created': 'text-blue-400',
      'trip_joined': 'text-green-400',
      'application_received': 'text-yellow-400',
      'application_accepted': 'text-green-400',
      'application_rejected': 'text-red-400',
      'friendship_request': 'text-purple-400',
      'friendship_accepted': 'text-green-400',
      'trip_completed': 'text-emerald-400',
      'trip_reviewed': 'text-amber-400',
      'user_joined': 'text-pink-400',
    }
    return colorMap[eventType] || 'text-gray-400'
  }

  const getEventTypeLabel = (eventType) => {
    const labelMap = {
      'trip_created': 'Viaje Creado',
      'trip_joined': 'Se unió a viaje',
      'application_received': 'Nueva aplicación',
      'application_accepted': 'Aplicación aceptada',
      'application_rejected': 'Aplicación rechazada',
      'friendship_request': 'Solicitud de amistad',
      'friendship_accepted': 'Nueva amistad',
      'trip_completed': 'Viaje completado',
      'trip_reviewed': 'Viaje reseñado',
      'user_joined': 'Nuevo usuario',
    }
    return labelMap[eventType] || eventType
  }

  const formatTimeAgo = (timeString) => {
    if (!timeString) return ''
    return timeString
  }

  const eventTypes = [
    { value: 'all', label: 'Todos los eventos' },
    { value: 'trip_created', label: 'Viajes creados' },
    { value: 'trip_joined', label: 'Uniones a viajes' },
    { value: 'application_received', label: 'Aplicaciones' },
    { value: 'friendship_request', label: 'Solicitudes de amistad' },
    { value: 'friendship_accepted', label: 'Nuevas amistades' },
    { value: 'trip_completed', label: 'Viajes completados' },
    { value: 'user_joined', label: 'Nuevos usuarios' },
  ]

  const dayOptions = [
    { value: 7, label: 'Última semana' },
    { value: 30, label: 'Último mes' },
    { value: 90, label: 'Últimos 3 meses' },
    { value: 365, label: 'Último año' },
  ]

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Feed <span className="text-emerald-400">Social</span>
          </h1>
          <p className="text-lg text-slate-300">
            Mantente al día con la actividad de la comunidad JetGo
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {stats.total_events || 0}
              </div>
              <div className="text-slate-300">Eventos totales</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-2">
                {stats.events_by_type?.trip_created || 0}
              </div>
              <div className="text-slate-300">Viajes creados</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {stats.events_by_type?.friendship_accepted || 0}
              </div>
              <div className="text-slate-300">Nuevas amistades</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {stats.events_by_type?.user_joined || 0}
              </div>
              <div className="text-slate-300">Nuevos usuarios</div>
            </GlassCard>
          </div>
        )}

        {/* Filters */}
        <GlassCard className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filtros</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="secondary"
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Button
                onClick={loadFeed}
                variant="secondary"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de evento
                </label>
                <select
                  value={filters.eventType}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Período
                </label>
                <select
                  value={filters.days}
                  onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                >
                  {dayOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Feed Events */}
        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="flex items-center justify-center gap-3 text-white">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Cargando eventos...</span>
            </div>
          </GlassCard>
        ) : error ? (
          <GlassCard className="p-6">
            <div className="text-red-400 text-center">
              <p>{error}</p>
              <Button
                onClick={loadFeed}
                className="mt-4"
                variant="secondary"
              >
                Reintentar
              </Button>
            </div>
          </GlassCard>
        ) : events.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No hay eventos para mostrar</p>
            <p className="text-slate-500 text-sm mt-2">
              Prueba ajustar los filtros o espera a que haya más actividad
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <GlassCard key={event.id} className="p-6 hover:bg-slate-600/20 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Event Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center ${getEventColor(event.event_type)}`}>
                    {getEventIcon(event.event_type)}
                  </div>

                  {/* Event Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-slate-300 mb-2">
                            {event.description}
                          </p>
                        )}
                        
                        {/* Event Metadata */}
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTimeAgo(event.time_ago)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {getEventTypeLabel(event.event_type)}
                          </span>
                          {event.trip_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.trip_destination}
                            </span>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                            {event.user_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">
                              {event.user_name || 'Usuario'}
                            </div>
                            {event.target_user_name && (
                              <div className="text-slate-400 text-xs">
                                → {event.target_user_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Trip Link */}
                    {event.trip_name && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <Button
                          onClick={() => navigate(`/trip/${event.metadata?.trip_id}`)}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Ver viaje: {event.trip_name}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
