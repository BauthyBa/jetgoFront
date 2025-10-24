import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getSession } from '@/services/supabase'
import { leaveTrip } from '@/services/trips'
import ROUTES from '@/config/routes'
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Edit,
  Trash2,
  MessageCircle,
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import BackButton from '@/components/BackButton'

export default function MisViajesPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [myTrips, setMyTrips] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [applications, setApplications] = useState([])
  const [members, setMembers] = useState([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [processingAppId, setProcessingAppId] = useState(null)

  // Cargar usuario y viajes
  useEffect(() => {
    loadUserAndTrips()
  }, [])

  const loadUserAndTrips = async () => {
    try {
      setLoading(true)
      const session = await getSession()
      
      if (!session?.user) {
        navigate(ROUTES.LOGIN)
        return
      }

      setUser(session.user)

      // Obtener viajes donde el usuario es creador
      const { data: createdTrips, error: createdError } = await supabase
        .from('trips')
        .select(`
          *,
          trip_members (
            user_id,
            User:user_id (
              userid,
              nombre,
              apellido,
              avatar_url
            )
          )
        `)
        .eq('creator_id', session.user.id)
        .order('created_at', { ascending: false })

      if (createdError) throw createdError

      // Obtener viajes donde el usuario es miembro
      const { data: membershipData, error: memberError } = await supabase
        .from('trip_members')
        .select(`
          trip_id,
          trips (
            *,
            User:creator_id (
              userid,
              nombre,
              apellido,
              avatar_url
            ),
            trip_members (
              user_id,
              User:user_id (
                userid,
                nombre,
                apellido,
                avatar_url
              )
            )
          )
        `)
        .eq('user_id', session.user.id)

      if (memberError) throw memberError

      // Combinar viajes creados y viajes donde es miembro
      const memberTrips = membershipData
        ?.map(m => m.trips)
        .filter(t => t && t.creator_id !== session.user.id) || []

      const allTrips = [
        ...(createdTrips || []).map(t => ({ ...t, isCreator: true })),
        ...memberTrips.map(t => ({ ...t, isCreator: false }))
      ]

      setMyTrips(allTrips)
    } catch (error) {
      console.error('Error cargando viajes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar solicitudes de un viaje
  const loadApplications = async (tripId) => {
    try {
      setLoadingApplications(true)
      
      // Obtener solicitudes del viaje
      const { data: apps, error } = await supabase
        .from('trip_applications')
        .select(`
          *,
          User:applicant_id (
            userid,
            nombre,
            apellido,
            avatar_url,
            bio
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setApplications(apps || [])
    } catch (error) {
      console.error('Error cargando solicitudes:', error)
      setApplications([])
    } finally {
      setLoadingApplications(false)
    }
  }

  // Cargar miembros de un viaje
  const loadMembers = async (tripId) => {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          joined_at,
          User:user_id (
            userid,
            nombre,
            apellido,
            avatar_url,
            bio
          )
        `)
        .eq('trip_id', tripId)

      if (error) throw error

      setMembers(data || [])
    } catch (error) {
      console.error('Error cargando miembros:', error)
      setMembers([])
    }
  }

  // Seleccionar un viaje
  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip)
    if (trip.isCreator) {
      await loadApplications(trip.id)
    }
    await loadMembers(trip.id)
  }

  // Aceptar solicitud
  const handleAcceptApplication = async (applicationId, applicantId) => {
    try {
      setProcessingAppId(applicationId)

      // Actualizar estado de la solicitud
      const { error: updateError } = await supabase
        .from('trip_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      if (updateError) throw updateError

      // Agregar al viajero a trip_members
      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: selectedTrip.id,
          user_id: applicantId,
          joined_at: new Date().toISOString()
        })

      if (memberError) throw memberError

      // Crear o encontrar chat room para el viaje
      let roomId
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('trip_id', selectedTrip.id)
        .eq('is_private', false)
        .single()

      if (existingRoom) {
        roomId = existingRoom.id
      } else {
        // Crear nueva sala de chat
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: selectedTrip.name || selectedTrip.destination,
            trip_id: selectedTrip.id,
            is_private: false,
            is_group: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (roomError) throw roomError
        roomId = newRoom.id
      }

      // Agregar al nuevo miembro al chat
      const { error: chatMemberError } = await supabase
        .from('chat_members')
        .insert({
          room_id: roomId,
          user_id: applicantId,
          joined_at: new Date().toISOString()
        })

      if (chatMemberError && !chatMemberError.message?.includes('duplicate')) {
        throw chatMemberError
      }

      // Recargar solicitudes y miembros
      await loadApplications(selectedTrip.id)
      await loadMembers(selectedTrip.id)
      await loadUserAndTrips()

      alert('Solicitud aceptada exitosamente')
    } catch (error) {
      console.error('Error aceptando solicitud:', error)
      alert('Error al aceptar la solicitud: ' + (error.message || 'Error desconocido'))
    } finally {
      setProcessingAppId(null)
    }
  }

  // Rechazar solicitud
  const handleRejectApplication = async (applicationId) => {
    try {
      if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return

      setProcessingAppId(applicationId)

      const { error } = await supabase
        .from('trip_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)

      if (error) throw error

      await loadApplications(selectedTrip.id)
      alert('Solicitud rechazada')
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      alert('Error al rechazar la solicitud')
    } finally {
      setProcessingAppId(null)
    }
  }

  // Eliminar viaje (solo creador)
  const handleDeleteTrip = async (trip) => {
    try {
      if (!confirm('¿Estás seguro de eliminar este viaje? Esta acción no se puede deshacer.')) return

      await leaveTrip(trip.id, user.id)
      await loadUserAndTrips()
      setSelectedTrip(null)
      alert('Viaje eliminado exitosamente')
    } catch (error) {
      console.error('Error eliminando viaje:', error)
      alert('Error al eliminar el viaje')
    }
  }

  // Abandonar viaje (miembro)
  const handleLeaveTrip = async (trip) => {
    try {
      if (!confirm('¿Estás seguro de abandonar este viaje?')) return

      await leaveTrip(trip.id, user.id)
      await loadUserAndTrips()
      setSelectedTrip(null)
      alert('Has abandonado el viaje')
    } catch (error) {
      console.error('Error abandonando viaje:', error)
      alert('Error al abandonar el viaje')
    }
  }

  // Ir al chat del viaje
  const handleGoToChat = async (trip) => {
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('is_private', false)
        .single()

      if (error || !room) {
        alert('No se encontró el chat de este viaje')
        return
      }

      navigate(`${ROUTES.MODERN_CHAT}?room=${room.id}`)
    } catch (error) {
      console.error('Error buscando chat:', error)
      alert('Error al buscar el chat del viaje')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Aceptado
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rechazado
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando tus viajes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <BackButton fallback={ROUTES.VIAJES} variant="ghost" />
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">
              Mis Viajes
            </h1>
            <p className="text-slate-400">
              Gestiona tus viajes, solicitudes y participantes
            </p>
          </div>

          {/* Contenido principal */}
          {myTrips.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold text-white mb-4">
                No tienes viajes aún
              </h3>
              <p className="text-slate-400 mb-6">
                Crea tu primer viaje o únete a uno existente
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate(ROUTES.CREAR_VIAJE)}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Crear Viaje
                </Button>
                <Button
                  onClick={() => navigate(ROUTES.VIAJES)}
                  variant="secondary"
                >
                  Buscar Viajes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de viajes */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-semibold text-white mb-4">
                  Tus viajes ({myTrips.length})
                </h2>
                {myTrips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    className={`w-full text-left bg-slate-800/50 hover:bg-slate-800 rounded-xl p-4 transition-all border-2 ${
                      selectedTrip?.id === trip.id
                        ? 'border-emerald-500'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">
                          {trip.name || trip.destination}
                        </h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.destination}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {trip.isCreator ? (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          Organizador
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                          Participante
                        </span>
                      )}
                      <span className="text-slate-500">
                        {trip.trip_members?.length || 0} miembros
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Detalles del viaje seleccionado */}
              <div className="lg:col-span-2">
                {selectedTrip ? (
                  <div className="space-y-6">
                    {/* Información del viaje */}
                    <div className="bg-slate-800/50 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {selectedTrip.name || selectedTrip.destination}
                          </h2>
                          {selectedTrip.isCreator && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                              Eres el organizador
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {selectedTrip.isCreator && (
                            <Button
                              onClick={() => navigate(`/trip/${selectedTrip.id}/edit`)}
                              variant="secondary"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleGoToChat(selectedTrip)}
                            className="bg-emerald-600 hover:bg-emerald-500"
                            size="sm"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-xs text-slate-500">Origen</p>
                            <p className="text-sm">{selectedTrip.origin || 'No especificado'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-xs text-slate-500">Destino</p>
                            <p className="text-sm">{selectedTrip.destination}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-xs text-slate-500">Fecha</p>
                            <p className="text-sm">{formatDate(selectedTrip.start_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <div>
                            <p className="text-xs text-slate-500">Presupuesto</p>
                            <p className="text-sm">
                              ${selectedTrip.budget_min || 0} - ${selectedTrip.budget_max || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedTrip.description && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <p className="text-slate-300 text-sm">{selectedTrip.description}</p>
                        </div>
                      )}

                      {selectedTrip.isCreator && (
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                          <Button
                            onClick={() => handleDeleteTrip(selectedTrip)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Viaje
                          </Button>
                        </div>
                      )}

                      {!selectedTrip.isCreator && (
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                          <Button
                            onClick={() => handleLeaveTrip(selectedTrip)}
                            variant="secondary"
                            size="sm"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Abandonar Viaje
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Solicitudes (solo para organizador) */}
                    {selectedTrip.isCreator && (
                      <div className="bg-slate-800/50 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          Solicitudes de Participación
                        </h3>
                        {loadingApplications ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                          </div>
                        ) : applications.length === 0 ? (
                          <p className="text-slate-400 text-center py-8">
                            No hay solicitudes pendientes
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {applications.map((app) => (
                              <div
                                key={app.id}
                                className="bg-slate-900/50 rounded-xl p-4 border border-slate-700"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                                      {app.User?.avatar_url ? (
                                        <img
                                          src={app.User.avatar_url}
                                          alt={app.User.nombre}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                          {app.User?.nombre?.charAt(0) || 'U'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-white font-semibold">
                                        {app.User?.nombre} {app.User?.apellido}
                                      </p>
                                      {app.message && (
                                        <p className="text-slate-400 text-sm mt-1">
                                          "{app.message}"
                                        </p>
                                      )}
                                      <p className="text-slate-500 text-xs mt-2">
                                        {formatDate(app.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(app.status)}
                                  </div>
                                </div>
                                {app.status === 'pending' && (
                                  <div className="flex gap-2 mt-4">
                                    <Button
                                      onClick={() => handleAcceptApplication(app.id, app.applicant_id)}
                                      disabled={processingAppId === app.id}
                                      className="flex-1 bg-green-600 hover:bg-green-500"
                                      size="sm"
                                    >
                                      {processingAppId === app.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <>
                                          <UserCheck className="w-4 h-4 mr-2" />
                                          Aceptar
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      onClick={() => handleRejectApplication(app.id)}
                                      disabled={processingAppId === app.id}
                                      variant="destructive"
                                      className="flex-1"
                                      size="sm"
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Rechazar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Miembros del viaje */}
                    <div className="bg-slate-800/50 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Participantes ({members.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {members.map((member) => (
                          <div
                            key={member.user_id}
                            className="bg-slate-900/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-900/70 transition-colors"
                            onClick={() => navigate(`/profile/${member.user_id}`)}
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-600 flex-shrink-0">
                              {member.User?.avatar_url ? (
                                <img
                                  src={member.User.avatar_url}
                                  alt={member.User.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                  {member.User?.nombre?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold truncate">
                                {member.User?.nombre} {member.User?.apellido}
                              </p>
                              {member.user_id === selectedTrip.creator_id && (
                                <span className="text-xs text-blue-400">Organizador</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">👈</div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Selecciona un viaje
                    </h3>
                    <p className="text-slate-400">
                      Elige un viaje de la lista para ver sus detalles
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

