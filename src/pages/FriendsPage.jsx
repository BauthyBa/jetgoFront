import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, supabase } from '@/services/supabase'
import { getFriendRequests, respondFriendRequest, getFriends, sendFriendRequest } from '@/services/friends'
import { UserPlus, Check, X, Clock, Users, ArrowLeft, Search } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
 

export default function FriendsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('received') // 'received', 'sent', 'friends'
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [friendshipStatuses, setFriendshipStatuses] = useState({})
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const showNotification = (title, message, type = 'success') => {
    setToast({ show: true, type, title, message })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2800)
  }

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
    loadSuggestions()
  }, [profile, activeTab])

  // Buscar en toda la base por nombre/apellido cuando hay query
  useEffect(() => {
    if (!profile?.userid) return
    const q = (searchQuery || '').trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(() => {
      loadSearchResults(q)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, profile])

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

  const handleSendFriend = async (receiverId) => {
    try {
      if (!profile?.userid) return
      if (!receiverId || receiverId === profile.userid) return
      setFriendshipStatuses(prev => ({ ...prev, [receiverId]: 'pending' }))
      await sendFriendRequest(profile.userid, receiverId)
      showNotification('Solicitud enviada', 'Tu solicitud de amistad fue enviada')
    } catch (e) {
      setFriendshipStatuses(prev => {
        const copy = { ...prev }
        delete copy[receiverId]
        return copy
      })
      showNotification('Error', 'No se pudo enviar la solicitud', 'error')
    }
  }

  const loadSuggestions = async () => {
    try {
      if (!profile?.userid) return

      const { data: accepted } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${profile.userid},receiver_id.eq.${profile.userid}`)
        .eq('status', 'accepted')

      const friendIds = new Set()
      accepted?.forEach(req => {
        friendIds.add(req.sender_id === profile.userid ? req.receiver_id : req.sender_id)
      })
      friendIds.add(profile.userid)

      let query = supabase
        .from('User')
        .select('userid, nombre, apellido, avatar_url, bio')

      if (friendIds.size > 0) {
        query = query.not('userid', 'in', `(${Array.from(friendIds).join(',')})`)
      }

      const { data: users } = await query.limit(10)
      const cleaned = (users || [])
        .filter(u => u?.userid && u.userid !== profile.userid)
        .filter(u => (u?.nombre || u?.apellido))
      setSuggestedUsers(cleaned)

      if (cleaned && cleaned.length > 0) {
        const statuses = {}
        for (const u of cleaned) {
          const { data: existing } = await supabase
            .from('friend_requests')
            .select('status')
            .or(`and(sender_id.eq.${profile.userid},receiver_id.eq.${u.userid}),and(sender_id.eq.${u.userid},receiver_id.eq.${profile.userid})`)
            .single()
          statuses[u.userid] = existing?.status || null
        }
        setFriendshipStatuses(statuses)
      }
    } catch (e) {
      // Silent fail for suggestions
    }
  }

  const loadSearchResults = async (q) => {
    try {
      if (!profile?.userid) return
      // Buscar por nombre o apellido en toda la tabla User
      let query = supabase
        .from('User')
        .select('userid, nombre, apellido, avatar_url, bio')
        .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%`)
        .limit(25)

      const { data: users, error } = await query
      if (error) throw error

      const results = (users || [])
        .filter(u => u?.userid && u.userid !== profile.userid)
      setSearchResults(results)

      // Calcular estados de amistad para los resultados
      if (results.length > 0) {
        const statuses = { ...friendshipStatuses }
        for (const u of results) {
          const { data: existing } = await supabase
            .from('friend_requests')
            .select('status')
            .or(`and(sender_id.eq.${profile.userid},receiver_id.eq.${u.userid}),and(sender_id.eq.${u.userid},receiver_id.eq.${profile.userid})`)
            .single()
          statuses[u.userid] = existing?.status || null
        }
        setFriendshipStatuses(statuses)
      }
    } catch (_e) {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
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
    <>
    <div className="min-h-screen bg-gradient-hero text-foreground">
      <div className="container mx-auto px-4 py-10 pt-28 max-w-3xl relative">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <h1 className="text-3xl font-bold text-white">Amigos</h1>
          <p className="text-white/70">Gestiona tus conexiones y solicitudes</p>
        </div>

        <div className="mb-6">
          <div className="relative w-full sm:w-3/4 md:w-2/3 mx-auto">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-700/50 bg-slate-800/60 px-11 text-white placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 shadow-inner"
            />
          </div>
        </div>

        {searchQuery.trim() && (
          <GlassCard className="p-6 mb-6 max-w-2xl mx-auto">
            <h3 className="text-white font-semibold mb-4">Resultados de usuarios</h3>
            <div className="space-y-3">
              {searchLoading ? (
                <p className="text-slate-400 text-sm">Buscando...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-slate-400 text-sm">Sin resultados</p>
              ) : (
                searchResults.map((u) => (
                  <div key={u.userid} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-700/80 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-slate-600/40">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <span>{u.nombre?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{u.nombre} {u.apellido}</p>
                        {u.bio && <p className="text-slate-400 text-xs truncate">{u.bio}</p>}
                      </div>
                    </div>
                    {friendshipStatuses[u.userid] === 'accepted' ? (
                      <span className="text-green-400 text-xs px-3 py-1.5 bg-green-500/10 rounded-lg">Amigos</span>
                    ) : friendshipStatuses[u.userid] === 'pending' ? (
                      <span className="text-yellow-400 text-xs px-3 py-1.5 bg-yellow-500/10 rounded-lg">Pendiente</span>
                    ) : (
                      <button
                        onClick={() => handleSendFriend(u.userid)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg shadow"
                      >
                        Agregar amigo
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        )}

        {!searchQuery.trim() && suggestedUsers.length > 0 && (
          <GlassCard className="p-6 mb-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-base">Usuarios recomendados</p>
            </div>
            <div className="space-y-3">
              {suggestedUsers.slice(0, 8).map((u) => (
                <div key={u.userid} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-700/80 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-slate-600/40">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <span>{u.nombre?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{u.nombre} {u.apellido}</p>
                      <p className="text-slate-400 text-xs truncate">{u.bio ? (u.bio.length > 24 ? u.bio.substring(0, 24) + '...' : u.bio) : 'Nuevo en JetGo'}</p>
                    </div>
                  </div>
                  {friendshipStatuses[u.userid] === 'accepted' ? (
                    <span className="text-green-400 text-xs px-3 py-1.5 bg-green-500/10 rounded-lg">Amigos</span>
                  ) : friendshipStatuses[u.userid] === 'pending' ? (
                    <span className="text-yellow-400 text-xs px-3 py-1.5 bg-yellow-500/10 rounded-lg">Pendiente</span>
                  ) : (
                    <button 
                      onClick={() => handleSendFriend(u.userid)}
                      className="text-blue-400 hover:text-blue-300 font-bold text-xs transition-colors px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Agregar amigo
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Tabs */}
        <GlassCard className="p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveTab('received')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                activeTab === 'received'
                  ? 'bg-blue-600/90 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60'
              }`}
            >
              Recibidas
              <span className={`ml-1 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-xs ${
                activeTab === 'received' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
              }`}>
                {requests.filter(r => r.status === 'pending').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                activeTab === 'sent'
                  ? 'bg-blue-600/90 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60'
              }`}
            >
              Enviadas
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                activeTab === 'friends'
                  ? 'bg-blue-600/90 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60'
              }`}
            >
              Amigos
              <span className={`ml-1 inline-flex items-center justify-center h-5 min-w-5 px-2 rounded-full text-xs ${
                activeTab === 'friends' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-200'
              }`}>
                {friends.length}
              </span>
            </button>
          </div>
        </GlassCard>

        {/* Content */}
        {activeTab === 'friends' ? (
          // Friends Tab
          error ? (
            <GlassCard className="p-6 max-w-2xl mx-auto">
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
            <GlassCard className="p-8 text-center max-w-2xl mx-auto">
              <div className="text-white">Cargando amigos...</div>
            </GlassCard>
          ) : friends.length === 0 ? (
            <GlassCard className="p-8 text-center max-w-2xl mx-auto">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No tienes amigos aún</p>
            </GlassCard>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
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
            <GlassCard className="p-6 max-w-2xl mx-auto">
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
            <GlassCard className="p-8 text-center max-w-2xl mx-auto">
              <div className="text-white">Cargando solicitudes...</div>
            </GlassCard>
          ) : requests.length === 0 ? (
            <GlassCard className="p-8 text-center max-w-2xl mx-auto">
              <UserPlus className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">
                {activeTab === 'received' 
                  ? 'No tienes solicitudes de amistad pendientes'
                  : 'No has enviado solicitudes de amistad'
                }
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto">
              {requests.map((request) => (
                <GlassCard key={request.id} className="p-5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-medium">
                          {request.other_user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {request.other_user?.full_name || 'Usuario'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)} {getStatusText(request.status)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {activeTab === 'received' && request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleRespondRequest(request.id, 'accept')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleRespondRequest(request.id, 'reject')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm shadow-sm"
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
        {toast.show && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[120]">
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
      </div>
    </div>
    </>
  )
}
