import { useState, useEffect } from 'react'
import { getFriendRequests, respondFriendRequest, getFriends } from '@/services/friends'
import { UserPlus, Check, X, Clock, Users } from 'lucide-react'
import { loadMultipleAvatars } from '@/utils/avatarHelper'

export default function FriendRequestsPanel({ currentUser }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('received')
  const [friends, setFriends] = useState([]) // 'received' o 'sent'
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' })

  const showNotification = (title, message, type = 'success') => {
    setToast({ show: true, type, title, message })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2800)
  }

  useEffect(() => {
    if (!currentUser) return
    if (activeTab === 'friends') {
      loadFriends()
    } else {
      loadRequests()
    }
  }, [currentUser, activeTab])

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const userId = currentUser.userid || currentUser.user_id || currentUser.id
      console.log('🔍 FriendRequestsPanel - Cargando solicitudes para usuario:', userId)
      console.log('🔍 FriendRequestsPanel - Tipo de solicitud:', activeTab)
      console.log('🔍 FriendRequestsPanel - Usuario actual:', currentUser)
      console.log('🔍 FriendRequestsPanel - currentUser.userid:', currentUser.userid)
      console.log('🔍 FriendRequestsPanel - currentUser.user_id:', currentUser.user_id)
      console.log('🔍 FriendRequestsPanel - currentUser.id:', currentUser.id)
      console.log('🔍 FriendRequestsPanel - userId final:', userId)
      
      const response = await getFriendRequests(userId, activeTab)
      console.log('🔍 FriendRequestsPanel - Respuesta del backend:', response)
      
      if (response.ok) {
        setRequests(response.friend_requests || [])
        console.log('🔍 FriendRequestsPanel - Solicitudes cargadas:', response.friend_requests?.length || 0)
      } else {
        console.error('🔍 FriendRequestsPanel - Error en respuesta:', response.error)
        setError(response.error || 'Error cargando solicitudes')
      }
    } catch (err) {
      console.error('🔍 FriendRequestsPanel - Error cargando solicitudes:', err)
      setError('Error cargando solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      setLoading(true)
      setError('')
      const userId = currentUser.userid || currentUser.user_id || currentUser.id
      console.log('🔍 FriendRequestsPanel - Cargando amigos para usuario:', userId)
      
      const response = await getFriends(userId)
      console.log('🔍 FriendRequestsPanel - Respuesta de amigos:', response)
      
      if (response.ok) {
        let friendsList = response.friends || []

        try {
          const friendIds = friendsList
            .map((friend) => friend?.friend_id || friend?.userid || friend?.user_id || friend?.id)
            .filter(Boolean)

          if (friendIds.length > 0) {
            const avatarsMap = await loadMultipleAvatars(friendIds)
            friendsList = friendsList.map((friend) => {
              const candidateId = friend?.friend_id || friend?.userid || friend?.user_id || friend?.id
              const avatarFromResponse = friend?.avatar_url || friend?.avatar
              return {
                ...friend,
                avatar_url: avatarFromResponse || avatarsMap[candidateId] || null,
              }
            })
          }
        } catch (avatarError) {
          console.warn('FriendRequestsPanel - Error cargando avatares:', avatarError)
        }

        setFriends(friendsList)
        console.log('🔍 FriendRequestsPanel - Amigos cargados:', friendsList.length)
      } else {
        console.error('🔍 FriendRequestsPanel - Error en respuesta de amigos:', response.error)
        setError(response.error || 'Error cargando amigos')
      }
    } catch (err) {
      console.error('🔍 FriendRequestsPanel - Error cargando amigos:', err)
      setError('Error cargando amigos')
    } finally {
      setLoading(false)
    }
  }

  const handleRespondRequest = async (requestId, action) => {
    try {
      const response = await respondFriendRequest(requestId, action, currentUser.userid || currentUser.user_id || currentUser.id)
      if (response.ok) {
        showNotification(
          action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada',
          action === 'accept' ? 'Ahora son amigos 🎉' : 'La solicitud fue rechazada',
          action === 'accept' ? 'success' : 'error'
        )
        loadRequests() // Recargar lista
      } else {
        showNotification('Error', response.error || 'Error procesando solicitud', 'error')
      }
    } catch (err) {
      console.error('Error procesando solicitud:', err)
      showNotification('Error', 'Error procesando solicitud', 'error')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'accepted':
        return <Check className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <X className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'accepted':
        return 'Aceptada'
      case 'rejected':
        return 'Rechazada'
      default:
        return 'Desconocido'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500'
      case 'accepted':
        return 'text-green-500'
      case 'rejected':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Cargando solicitudes...</span>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header con tabs */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-white">Solicitudes de Amistad</h3>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'received'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Recibidas ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Enviadas
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Amigos ({friends.length})
          </button>
        </div>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'friends' ? (
        // Pestaña de Amigos
        error ? (
          <div className="glass-card p-4">
            <div className="text-red-400 text-center">
              <p>{error}</p>
              <button
                onClick={loadFriends}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : friends.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No tienes amigos aún</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center text-white font-semibold text-xs">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.full_name || 'Avatar de amigo'}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          const fallbackNode = event.currentTarget.nextElementSibling
                          if (fallbackNode) {
                            fallbackNode.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <span style={{ display: friend.avatar_url ? 'none' : 'flex' }}>
                      {friend.full_name
                        ? friend.full_name
                            .split(' ')
                            .filter(Boolean)
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'A'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">
                      {friend.full_name || 'Amigo'}
                    </h4>
                    <p className="text-sm text-gray-400">
                      Amigos desde {new Date(friend.friendship_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Pestañas de Solicitudes
        error ? (
          <div className="glass-card p-4">
            <div className="text-red-400 text-center">
              <p>{error}</p>
              <button
                onClick={loadRequests}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {activeTab === 'received' 
                ? 'No tienes solicitudes de amistad pendientes'
                : 'No has enviado solicitudes de amistad'
              }
            </p>
          </div>
        ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-500/10 border border-blue-400/40 flex items-center justify-center text-white font-semibold text-xs">
                    {request.other_user?.avatar_url ? (
                      <img
                        src={request.other_user.avatar_url}
                        alt={request.other_user?.full_name || 'Avatar de usuario'}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          const fallbackNode = event.currentTarget.nextElementSibling
                          if (fallbackNode) {
                            fallbackNode.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <span style={{ display: request.other_user?.avatar_url ? 'none' : 'flex' }}>
                      {request.other_user?.full_name
                        ? request.other_user.full_name
                            .split(' ')
                            .filter(Boolean)
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'U'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">
                      {request.other_user?.full_name || 'Usuario'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {getStatusIcon(request.status)}
                      <span className={getStatusColor(request.status)}>
                        {getStatusText(request.status)}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
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
            </div>
          ))}
        </div>
      )
      )}
    </div>

    {toast.show && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[120]">
        <div
          className={`min-w-[280px] max-w-[92vw] px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}
        >
          <div className="font-semibold text-sm">{toast.title}</div>
          {toast.message && (
            <div className="text-xs mt-0.5 text-white/80">{toast.message}</div>
          )}
        </div>
      </div>
    )}
    </>
  )
}
