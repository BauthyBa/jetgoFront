import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '@/services/supabase'
import { getFriendRequests, respondFriendRequest, getFriends } from '@/services/friends'
import { UserPlus, Check, X, Clock, Users, ArrowLeft } from 'lucide-react'
import Navigation from '@/components/Navigation'
import GlassCard from '@/components/GlassCard'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('received') // 'received', 'sent', 'friends'

  useEffect(() => {
    loadSession()
  }, [])

  useEffect(() => {
    if (!profile) return
    if (activeTab === 'friends') {
      loadFriends()
    } else {
      loadRequests()
    }
  }, [profile, activeTab])

  const loadSession = async () => {
    try {
      const session = await getSession()
      const user = session?.user || null
      
      if (!user) {
        navigate('/login')
        return
      }

      const profileData = {
        user_id: user.id,
        userid: user.id, // Para compatibilidad
        email: user.email,
        meta: user.user_metadata || {}
      }
      
      setProfile(profileData)
    } catch (err) {
      console.error('Error cargando sesión:', err)
      navigate('/login')
    }
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const userId = profile.userid || profile.user_id || profile.id
      console.log('🔍 FriendsPage - Cargando solicitudes para usuario:', userId)
      console.log('🔍 FriendsPage - Tipo de solicitud:', activeTab)
      
      const response = await getFriendRequests(userId, activeTab)
      console.log('🔍 FriendsPage - Respuesta del backend:', response)
      
      if (response.ok) {
        setRequests(response.friend_requests || [])
        console.log('🔍 FriendsPage - Solicitudes cargadas:', response.friend_requests?.length || 0)
      } else {
        console.error('🔍 FriendsPage - Error en respuesta:', response.error)
        setError(response.error || 'Error cargando solicitudes')
      }
    } catch (err) {
      console.error('🔍 FriendsPage - Error cargando solicitudes:', err)
      setError('Error cargando solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError('')
      const userId = profile.userid || profile.user_id || profile.id
      console.log('🔍 FriendsPage - Cargando amigos para usuario:', userId)
      
      const response = await getFriends(userId)
      console.log('🔍 FriendsPage - Respuesta de amigos:', response)
      
      if (response.ok) {
        setFriends(response.friends || [])
        console.log('🔍 FriendsPage - Amigos cargados:', response.friends?.length || 0)
      } else {
        console.error('🔍 FriendsPage - Error en respuesta de amigos:', response.error)
        setError(response.error || 'Error cargando amigos')
      }
    } catch (err) {
      console.error('🔍 FriendsPage - Error cargando amigos:', err)
      setError('Error cargando amigos')
    } finally {
      setLoading(false)
    }
  }

  const handleRespondRequest = async (requestId, action) => {
    try {
      const userId = profile.userid || profile.user_id || profile.id
      const response = await respondFriendRequest(requestId, action, userId)
      if (response.ok) {
        alert(`Solicitud ${action === 'accept' ? 'aceptada' : 'rechazada'} exitosamente`)
        loadRequests() // Recargar lista
      } else {
        alert(response.error || 'Error procesando solicitud')
      }
    } catch (err) {
      console.error('Error procesando solicitud:', err)
      alert('Error procesando solicitud')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-500'
      case 'accepted': return 'text-green-500'
      case 'rejected': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'accepted': return <Check className="w-4 h-4" />
      case 'rejected': return <X className="w-4 h-4" />
      default: return null
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'accepted': return 'Aceptada'
      case 'rejected': return 'Rechazada'
      default: return status
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-hero text-foreground">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Amigos</h1>
            <p className="text-white/70">Gestiona tus conexiones y solicitudes</p>
          </div>
        </div>

        {/* Tabs */}
        <GlassCard className="p-6 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'received'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Recibidas ({requests.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'sent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Enviadas
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Amigos ({friends.length})
            </button>
          </div>
        </GlassCard>

        {/* Content */}
        {activeTab === 'friends' ? (
          // Friends Tab
          error ? (
            <GlassCard className="p-6">
              <div className="text-red-400 text-center">
                <p>{error}</p>
                <button
                  onClick={loadFriends}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </GlassCard>
          ) : loading ? (
            <GlassCard className="p-8 text-center">
              <div className="text-white">Cargando amigos...</div>
            </GlassCard>
          ) : friends.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No tienes amigos aún</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <GlassCard key={friend.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium">
                      {friend.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        {friend.full_name || 'Amigo'}
                      </h4>
                      <p className="text-sm text-slate-400">
                        Amigos desde {new Date(friend.friendship_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        ) : (
          // Requests Tabs
          error ? (
            <GlassCard className="p-6">
              <div className="text-red-400 text-center">
                <p>{error}</p>
                <button
                  onClick={loadRequests}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </GlassCard>
          ) : loading ? (
            <GlassCard className="p-8 text-center">
              <div className="text-white">Cargando solicitudes...</div>
            </GlassCard>
          ) : requests.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <UserPlus className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">
                {activeTab === 'received' 
                  ? 'No tienes solicitudes de amistad pendientes'
                  : 'No has enviado solicitudes de amistad'
                }
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <GlassCard key={request.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                        {request.other_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {request.other_user?.full_name || 'Usuario'}
                        </h4>
                        <span className={`text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)} {getStatusText(request.status)}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {activeTab === 'received' && request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRespondRequest(request.id, 'accept')}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <Check className="w-4 h-4" />
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleRespondRequest(request.id, 'reject')}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            <X className="w-4 h-4" />
                            Rechazar
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'sent' && request.status === 'pending' && (
                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Esperando respuesta</span>
                        </div>
                      )}
                      
                      {request.status === 'accepted' && (
                        <div className="flex items-center gap-1 text-green-500 text-sm">
                          <Check className="w-4 h-4" />
                          <span>Amigos</span>
                        </div>
                      )}
                      
                      {request.status === 'rejected' && (
                        <div className="flex items-center gap-1 text-red-500 text-sm">
                          <X className="w-4 h-4" />
                          <span>Rechazada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
