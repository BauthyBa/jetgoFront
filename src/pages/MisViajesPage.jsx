import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getSession } from '@/services/supabase'
import { listTrips, deleteTrip } from '@/services/trips'
import { getApplicationsByTrip, updateApplicationStatus } from '@/services/applications'
import ROUTES from '@/config/routes'
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Edit2,
  Trash2,
  Check,
  X,
  MessageCircle,
  UserCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings,
  Eye,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import BackButton from '@/components/BackButton'
import { formatDateDisplay } from '@/utils/dateFormat'

export default function MisViajesPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [myTrips, setMyTrips] = useState([])
  const [participatingTrips, setParticipatingTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showApplicationsPanel, setShowApplicationsPanel] = useState(false)
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false)
  const [applications, setApplications] = useState([])
  const [participants, setParticipants] = useState([])
  const [expandedTrip, setExpandedTrip] = useState(null)
  const [processingAction, setProcessingAction] = useState(false)

  // Cargar usuario actual
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await getSession()
        if (session?.user) {
          setUser(session.user)
        } else {
          navigate(ROUTES.LOGIN)
        }
      } catch (error) {
        console.error('Error cargando usuario:', error)
        navigate(ROUTES.LOGIN)
      }
    }
    loadUser()
  }, [navigate])

  // Cargar viajes del usuario
  useEffect(() => {
    if (!user?.id) return
    loadMyTrips()
  }, [user])

  const loadMyTrips = async () => {
    setLoading(true)
    try {
      const allTrips = await listTrips()
      console.log('🔍 Todos los viajes cargados:', allTrips)
      
      // Viajes creados por el usuario
      const created = allTrips.filter(trip => trip.creatorId === user.id)
      console.log('✅ Viajes creados por el usuario:', created)
      
      // Viajes en los que participa (obteniendo los rooms del usuario)
      const { data: rooms } = await supabase
        .from('chat_members')
        .select('room_id, chat_rooms(trip_id)')
        .eq('user_id', user.id)
      
      const tripIdsParticipating = rooms
        ?.map(r => r.chat_rooms?.trip_id)
        .filter(Boolean) || []
      
      const participating = allTrips.filter(
        trip => tripIdsParticipating.includes(trip.id) && trip.creatorId !== user.id
      )
      
      setMyTrips(created)
      setParticipatingTrips(participating)
    } catch (error) {
      console.error('Error cargando viajes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar solicitudes de un viaje
  const loadApplications = async (tripId) => {
    try {
      const apps = await getApplicationsByTrip(tripId)
      
      // Enriquecer con datos del usuario
      const enrichedApps = await Promise.all(
        apps.map(async (app) => {
          const { data: userData } = await supabase
            .from('User')
            .select('userid, nombre, apellido, avatar_url, bio')
            .eq('userid', app.user_id)
            .single()
          
          return {
            ...app,
            user: userData
          }
        })
      )
      
      setApplications(enrichedApps)
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
      setApplications([])
    }
  }

  // Cargar participantes de un viaje
  const loadParticipants = async (tripId) => {
    try {
      // Obtener room del viaje
      const { data: roomData } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('trip_id', tripId)
        .eq('is_group', true)
        .single()
      
      if (!roomData) {
        setParticipants([])
        return
      }
      
      // Obtener miembros del room
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('room_id', roomData.id)
      
      const userIds = members?.map(m => m.user_id) || []
      
      if (userIds.length === 0) {
        setParticipants([])
        return
      }
      
      // Obtener datos de los usuarios
      const { data: users } = await supabase
        .from('User')
        .select('userid, nombre, apellido, avatar_url, bio')
        .in('userid', userIds)
      
      setParticipants(users || [])
    } catch (error) {
      console.error('Error cargando participantes:', error)
      setParticipants([])
    }
  }

  // Abrir panel de solicitudes
  const handleViewApplications = async (trip) => {
    setSelectedTrip(trip)
    setShowApplicationsPanel(true)
    setShowParticipantsPanel(false)
    await loadApplications(trip.id)
  }

  // Abrir panel de participantes
  const handleViewParticipants = async (trip) => {
    setSelectedTrip(trip)
    setShowParticipantsPanel(true)
    setShowApplicationsPanel(false)
    await loadParticipants(trip.id)
  }

  // Aceptar/Rechazar solicitud
  const handleApplicationAction = async (applicationId, status) => {
    setProcessingAction(true)
    try {
      await updateApplicationStatus(applicationId, status)
      
      // Recargar solicitudes
      if (selectedTrip) {
        await loadApplications(selectedTrip.id)
      }
      
      // Recargar viajes para actualizar contadores
      await loadMyTrips()
    } catch (error) {
      console.error('Error actualizando solicitud:', error)
      alert('Error al procesar la solicitud')
    } finally {
      setProcessingAction(false)
    }
  }

  // Abrir modal de eliminación
  const handleDeleteTrip = (trip) => {
    setSelectedTrip(trip)
    setShowDeleteModal(true)
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!selectedTrip) return
    
    setProcessingAction(true)
    try {
      await deleteTrip(selectedTrip.id)
      setShowDeleteModal(false)
      await loadMyTrips()
    } catch (error) {
      console.error('Error eliminando viaje:', error)
      alert('Error al eliminar el viaje')
    } finally {
      setProcessingAction(false)
    }
  }

  // Navegar al chat del viaje
  const handleGoToChat = (tripId) => {
    navigate(ROUTES.TRIP_CHAT(tripId))
  }

  // Componente TripCard
  const TripCard = ({ trip, isOwner }) => {
    const isExpanded = expandedTrip === trip.id

    return (
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/50 transition-all duration-300 shadow-xl">
        {/* Header del viaje */}
        <div 
          className="p-6 cursor-pointer"
          onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                {trip.name}
                {isOwner && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                    Organizador
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{trip.origin || 'N/A'} → {trip.destination}</span>
                </div>
                {trip.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateDisplay(trip.startDate)}</span>
                  </div>
                )}
              </div>
            </div>
            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="flex flex-wrap gap-4 text-sm">
            {trip.budgetMin && (
              <div className="flex items-center gap-1 text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span>Desde ${trip.budgetMin}</span>
              </div>
            )}
            {trip.maxParticipants && (
              <div className="flex items-center gap-1 text-slate-400">
                <Users className="w-4 h-4" />
                <span>Hasta {trip.maxParticipants} personas</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel expandido */}
        {isExpanded && (
          <div className="border-t border-slate-700/50 p-6 space-y-4 bg-slate-900/50">
            {/* Descripción */}
            {trip.description && (
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Descripción</h4>
                <p className="text-slate-300 text-sm">{trip.description}</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                onClick={() => navigate(`/trip/${trip.id}`)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver detalles
              </Button>
              
              <Button
                onClick={() => handleGoToChat(trip.id)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir chat
              </Button>

              {isOwner && (
                <>
                  <Button
                    onClick={() => handleViewApplications(trip)}
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Clock className="w-4 h-4" />
                    Solicitudes
                  </Button>
                  
                  <Button
                    onClick={() => handleViewParticipants(trip)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <UserCheck className="w-4 h-4" />
                    Participantes
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (!trip.id) {
                        console.error('❌ Error: trip.id es undefined', trip)
                        alert('Error: No se puede editar este viaje (ID no disponible)')
                        return
                      }
                      console.log('📝 Navegando a editar viaje:', trip.id)
                      navigate(ROUTES.EDITAR_VIAJE(trip.id))
                    }}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                  
                  <Button
                    onClick={() => handleDeleteTrip(trip)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-lg">Cargando tus viajes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <BackButton fallback={ROUTES.VIAJES} variant="ghost" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-2">
            Mis Viajes
          </h1>
          <p className="text-slate-300">
            Gestiona tus viajes creados y aquellos en los que participas
          </p>
        </div>

        {/* Viajes creados */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-500" />
            Viajes que organizas ({myTrips.length})
          </h2>
          
          {myTrips.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No has creado ningún viaje aún
              </h3>
              <p className="text-slate-400 mb-6">
                ¡Empieza a organizar tu próxima aventura!
              </p>
              <Button
                onClick={() => navigate(ROUTES.CREAR_VIAJE)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
              >
                Crear mi primer viaje
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {myTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} isOwner={true} />
              ))}
            </div>
          )}
        </div>

        {/* Viajes en los que participa */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Viajes en los que participas ({participatingTrips.length})
          </h2>
          
          {participatingTrips.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
              <div className="text-6xl mb-4">🎒</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No estás participando en ningún viaje
              </h3>
              <p className="text-slate-400 mb-6">
                Explora viajes disponibles y únete a uno
              </p>
              <Button
                onClick={() => navigate(ROUTES.VIAJES)}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
              >
                Explorar viajes
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {participatingTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} isOwner={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de solicitudes */}
      {showApplicationsPanel && selectedTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Solicitudes para "{selectedTrip.name}"
              </h3>
              <button
                onClick={() => setShowApplicationsPanel(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de solicitudes */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div
                      key={app.id}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-blue-600 flex-shrink-0">
                            {app.user?.avatar_url ? (
                              <img
                                src={app.user.avatar_url}
                                alt={app.user.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {app.user?.nombre?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>

                          {/* Info del usuario */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold">
                              {app.user?.nombre} {app.user?.apellido}
                            </p>
                            {app.user?.bio && (
                              <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                                {app.user.bio}
                              </p>
                            )}
                            {app.message && (
                              <div className="mt-2 bg-slate-900/50 rounded-lg p-3">
                                <p className="text-sm text-slate-300">{app.message}</p>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2">
                              Solicitó el {new Date(app.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Acciones */}
                        {app.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApplicationAction(app.id, 'accepted')}
                              disabled={processingAction}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleApplicationAction(app.id, 'rejected')}
                              disabled={processingAction}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {app.status === 'accepted' && (
                          <span className="text-green-400 text-sm font-semibold px-3 py-1 bg-green-500/10 rounded-full">
                            Aceptada
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="text-red-400 text-sm font-semibold px-3 py-1 bg-red-500/10 rounded-full">
                            Rechazada
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de participantes */}
      {showParticipantsPanel && selectedTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Participantes de "{selectedTrip.name}"
              </h3>
              <button
                onClick={() => setShowParticipantsPanel(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de participantes */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No hay participantes aún</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {participants.map(participant => (
                    <div
                      key={participant.userid}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-emerald-500/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/profile/${participant.userid}`)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 flex-shrink-0">
                          {participant.avatar_url ? (
                            <img
                              src={participant.avatar_url}
                              alt={participant.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                              {participant.nombre?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">
                            {participant.nombre} {participant.apellido}
                          </p>
                          {participant.bio && (
                            <p className="text-slate-400 text-sm truncate">
                              {participant.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-500/50 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 bg-red-500/10">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Eliminar viaje</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                ¿Estás seguro de que quieres eliminar el viaje <strong className="text-white">"{selectedTrip.name}"</strong>?
              </p>
              <p className="text-sm text-red-400">
                Esta acción no se puede deshacer. Se eliminará el viaje, su chat y todas las solicitudes asociadas.
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 flex gap-3 justify-end">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="secondary"
                disabled={processingAction}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={processingAction}
                className="bg-red-600 hover:bg-red-700"
              >
                {processingAction ? 'Eliminando...' : 'Eliminar viaje'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

