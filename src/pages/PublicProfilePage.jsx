import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Navigation from '../components/Navigation'
import GlassCard from '../components/GlassCard'
import API_CONFIG from '../config/api'
import { sendFriendRequest, checkFriendshipStatus } from '../services/friends'
import { getOrCreateDirectRoom } from '../services/chat'
import TripHistory from '../components/TripHistory'
import { 
  MapPin, 
  Calendar, 
  Star, 
  Users, 
  MessageCircle, 
  ArrowLeft, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Globe,
  Lock,
  Camera,
  Grid3X3,
  List,
  Filter,
  X,
  UserPlus,
  UserMinus,
  UserCheck
} from 'lucide-react'

const PublicProfilePage = () => {
  const { username, userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userTrips, setUserTrips] = useState([])
  const [reviews, setReviews] = useState([])
  const [userPosts, setUserPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [viewMode, setViewMode] = useState('grid')
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [showComments, setShowComments] = useState({})
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState({})
  const [selectedImage, setSelectedImage] = useState(null)
  const [friends, setFriends] = useState([])
  const [friendsCount, setFriendsCount] = useState(0)
  const [friendshipStatus, setFriendshipStatus] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingFriendship, setLoadingFriendship] = useState(false)

  useEffect(() => {
    async function loadPublicProfile() {
      try {
        setLoading(true)
        setError('')

        // Buscar usuario por userId o username
        let userData = null
        let userError = null

        // Si tenemos userId, buscar directamente por ID
        if (userId) {
          const { data: userById, error: idError } = await supabase
            .from('User')
            .select('*')
            .eq('userid', userId)
            .single()

          console.log('Buscando usuario por userId:', userId)
          console.log('Resultado por userId:', { userById, idError })

          if (userById && !idError) {
            userData = userById
          } else {
            userError = idError
          }
        } else if (username) {
          // Si tenemos username, buscar por username
          const { data: userByUsername, error: usernameError } = await supabase
            .from('User')
            .select('*')
            .eq('username', username)
            .single()

          console.log('Buscando usuario por username:', username)
          console.log('Resultado por username:', { userByUsername, usernameError })

          if (userByUsername && !usernameError) {
            userData = userByUsername
          } else {
            // Si no se encuentra por username, intentar por ID (en caso de que se pase un ID como username)
            const { data: userById, error: idError } = await supabase
              .from('User')
              .select('*')
              .eq('userid', username)
              .single()

            console.log('Buscando usuario por ID (fallback):', username)
            console.log('Resultado por ID:', { userById, idError })

            if (userById && !idError) {
              userData = userById
            } else {
              userError = usernameError || idError
            }
          }
        }

        if (userError) {
          console.error('Error en búsqueda:', userError)
          setError(`Error al buscar usuario: ${userError.message}`)
          return
        }

        if (!userData) {
          setError('Usuario no encontrado')
          return
        }

        setProfile(userData)

        // Usar userid en lugar de id
        const userIdToUse = userData.userid || userData.id

        // Cargar viajes del usuario usando creator_id de la tabla trips
        const { data: tripsData } = await supabase
          .from('trips')
          .select('*')
          .eq('creator_id', userIdToUse)
          .order('created_at', { ascending: false })
          .limit(5)

        setUserTrips(tripsData || [])

        // Cargar reseñas recibidas
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:User!reviews_reviewer_id_fkey(nombre, apellido, avatar_url)
          `)
          .eq('reviewed_user_id', userIdToUse)
          .order('created_at', { ascending: false })
          .limit(3)

        setReviews(reviewsData || [])

        // Cargar posts del usuario
        console.log('👤 Loading posts for user:', {
          id: userData.id,
          userid: userData.userid,
          username: userData.username,
          nombre: userData.nombre
        })
        console.log('🔍 User ID being passed to loadUserPosts:', userData.id, 'Type:', typeof userData.id)
        await loadUserPosts(userIdToUse)

      } catch (e) {
        setError('Error al cargar el perfil')
        console.error('Error loading public profile:', e)
      } finally {
        setLoading(false)
      }
    }

    if (username || userId) {
      loadPublicProfile()
    }
  }, [username, userId])

  // Cargar usuario actual
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
        }
      } catch (error) {
        console.error('Error loading current user:', error)
      }
    }
    loadCurrentUser()
  }, [])

  // Cargar amigos y estado de amistad
  useEffect(() => {
    async function loadFriendsAndStatus() {
      if (!profile?.userid) return

      try {
        // Cargar amigos usando friend_requests
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${profile.userid},receiver_id.eq.${profile.userid}`)
          .eq('status', 'accepted')

        const friendIds = new Set()
        friendRequests?.forEach(req => {
          const friendId = req.sender_id === profile.userid ? req.receiver_id : req.sender_id
          friendIds.add(friendId)
        })

        setFriendsCount(friendIds.size)

        // Cargar datos de amigos - si estamos en el tab de amigos, cargar todos, sino solo 6
        if (friendIds.size > 0) {
          const limit = activeTab === 'friends' ? friendIds.size : 6
          const { data: friendsData } = await supabase
            .from('User')
            .select('userid, nombre, apellido, avatar_url, bio')
            .in('userid', Array.from(friendIds))
            .limit(limit)

          setFriends(friendsData || [])
        }

        // Verificar estado de amistad con el usuario actual
        if (currentUser?.id && currentUser.id !== profile.userid) {
          const { data: existingRequest } = await supabase
            .from('friend_requests')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.userid}),and(sender_id.eq.${profile.userid},receiver_id.eq.${currentUser.id})`)
            .single()

          if (existingRequest) {
            setFriendshipStatus(existingRequest.status)
          } else {
            setFriendshipStatus(null)
          }
        }
      } catch (error) {
        console.error('Error loading friends:', error)
      }
    }

    loadFriendsAndStatus()
  }, [profile, currentUser, activeTab])

  const getTripLevel = (tripCount) => {
    if (tripCount >= 20) return { level: 'Maestro', color: 'text-purple-400' }
    if (tripCount >= 10) return { level: 'Experto', color: 'text-blue-400' }
    if (tripCount >= 3) return { level: 'Viajero', color: 'text-green-400' }
    return { level: 'Principiante', color: 'text-yellow-400' }
  }

  const getAverageRating = () => {
    if (!reviews.length) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  // Helper function to safely get array data
  const getArrayData = (data) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (typeof data === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        // If not JSON, split by comma
        return data.split(',').map(item => item.trim()).filter(Boolean)
      }
    }
    return []
  }

  const handleFriendRequest = async () => {
    if (!currentUser?.id || !profile?.userid) {
      alert('Debes iniciar sesión para enviar solicitudes de amistad')
      return
    }

    setLoadingFriendship(true)
    try {
      // Primero verificar si existe una solicitud rechazada
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.userid}),and(sender_id.eq.${profile.userid},receiver_id.eq.${currentUser.id})`)
        .maybeSingle()

      if (existingRequest) {
        // Si existe y está rechazada, actualizar a pending
        if (existingRequest.status === 'rejected') {
          const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ 
              status: 'pending',
              sender_id: currentUser.id,
              receiver_id: profile.userid,
              created_at: new Date().toISOString()
            })
            .eq('id', existingRequest.id)

          if (updateError) {
            console.error('Error actualizando solicitud:', updateError)
            throw updateError
          }
        } else if (existingRequest.status === 'pending') {
          // Ya está pendiente, no hacer nada
          return
        }
      } else {
        // No existe, crear una nueva
        await sendFriendRequest(currentUser.id, profile.userid)
      }
      
      // Cambiar el estado sin mostrar alert
      setFriendshipStatus('pending')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Error al enviar la solicitud')
    } finally {
      setLoadingFriendship(false)
    }
  }

  const handleOpenChat = async () => {
    if (!currentUser?.id || !profile?.userid) {
      alert('Debes iniciar sesión para enviar mensajes')
      return
    }

    try {
      console.log('Opening chat with user:', profile.userid)
      const room = await getOrCreateDirectRoom(currentUser.id, profile.userid)
      console.log('Room created/retrieved:', room)
      
      // Navegar al chat con el room ID
      navigate(`/modern-chat?room=${room.id}`)
    } catch (error) {
      console.error('Error opening chat:', error)
      alert('Error al abrir el chat. Por favor, intenta nuevamente.')
    }
  }

  const loadUserPosts = async (userId) => {
    try {
      setPostsLoading(true)
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)
      console.log('🔍 Loading user posts from:', url, 'for user:', userId)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Posts received from API:', data)
      
      if (!data.posts || data.posts.length === 0) {
        console.log('❌ No posts in API response')
        setUserPosts([])
        return
      }
      
      // SIMPLIFICAR: Solo mostrar posts que coincidan exactamente
      const userPosts = data.posts.filter(post => {
        console.log('🔍 Checking post:', {
          postId: post.id,
          postUserId: post.user_id,
          targetUserId: userId,
          exactMatch: post.user_id === userId
        })
        return post.user_id === userId
      })
      
      console.log('✅ FILTERED RESULT:', userPosts.length, 'posts for user', userId)
      setUserPosts(userPosts)
      
    } catch (error) {
      console.error('❌ Error loading user posts:', error)
      setUserPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const likePost = async (postId) => {
    try {
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/like/`
      console.log('Liking post at:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: profile?.id }),
        mode: 'cors',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Like response:', data)
      
      // Update liked posts state
      if (data.action === 'liked') {
        setLikedPosts(prev => new Set([...prev, postId]))
      } else if (data.action === 'unliked') {
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      }
      
      // Reload posts to update like count
      loadUserPosts(profile?.id)
      
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const loadComments = async (postId) => {
    try {
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/comments/`
      console.log('Loading comments from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Comments received:', data)
      
      // Procesar comentarios para obtener información del usuario
      const processedComments = (data.comments || []).map(comment => {
        // Si el comentario no tiene información del usuario, intentar obtenerla
        if (!comment.user || !comment.user.name) {
          return {
            ...comment,
            user: {
              name: comment.user_name || 'Usuario',
              id: comment.user_id || comment.user_id
            }
          }
        }
        return comment
      })
      
      setComments(prev => ({ ...prev, [postId]: processedComments }))
      
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const createComment = async (postId) => {
    try {
      if (!newComment[postId]?.trim()) return
      
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/comments/`
      console.log('Creating comment at:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: profile?.id,
          content: newComment[postId]
        }),
        mode: 'cors',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      // Clear comment input
      setNewComment(prev => ({ ...prev, [postId]: '' }))
      
      // Reload comments
      loadComments(postId)
      
    } catch (error) {
      console.error('Error creating comment:', error)
    }
  }

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }))
    if (!showComments[postId] && !comments[postId]) {
      loadComments(postId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Cargando perfil...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-center">
              <div className="text-6xl mb-4">😞</div>
              <h2 className="text-2xl font-bold mb-2">Usuario no encontrado</h2>
              <p className="text-slate-300 mb-6">{error}</p>
              <button
                onClick={() => navigate(-1)}
                className="btn secondary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tripLevel = getTripLevel(userTrips.length)
  const averageRating = getAverageRating()

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con botón de volver */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
        </div>

        {/* Información principal */}
        <GlassCard className="mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar y info básica */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative mb-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${[profile.nombre, profile.apellido].filter(Boolean).join(' ')} avatar`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center border-4 border-white/20">
                    <span className="text-2xl font-bold text-white">
                      {[profile.nombre, profile.apellido].filter(Boolean).join(' ').charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-white mb-1">
                  {[profile.nombre, profile.apellido].filter(Boolean).join(' ') || 'Usuario'}
                </h1>
                <p className="text-slate-300 mb-2">@{profile.username || profile.userid}</p>
                
                {/* Nivel de viajero */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-semibold ${tripLevel.color}`}>
                    {tripLevel.level}
                  </span>
                  <span className="text-slate-400 text-sm">
                    • {userTrips.length} viajes
                  </span>
                </div>

                {/* Rating promedio */}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(averageRating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-slate-300 text-sm">
                      {averageRating} ({reviews.length} reseñas)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Información adicional */}
            <div className="flex-1 space-y-4">
              {/* Ubicación */}
              {profile.country && (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.country}</span>
                  {profile.city && <span>• {profile.city}</span>}
                </div>
              )}

              {/* Fecha de registro */}
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4" />
                <span>Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long' 
                })}</span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-300">{profile.bio}</p>
                </div>
              )}

              {/* Intereses */}
              {getArrayData(profile.interests).length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Intereses</h3>
                  <div className="flex flex-wrap gap-2">
                    {getArrayData(profile.interests).map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Estilos de viaje favoritos */}
              {getArrayData(profile.favorite_trips).length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Estilos de viaje</h3>
                  <div className="flex flex-wrap gap-2">
                    {getArrayData(profile.favorite_trips).map((style, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              {currentUser && currentUser.id !== profile.userid && (
                <div className="flex gap-3">
                  {/* Botón de amistad */}
                  {friendshipStatus === 'accepted' ? (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-semibold hover:bg-green-500/30 transition-colors"
                    >
                      <UserCheck className="w-5 h-5" />
                      Amigos
                    </button>
                  ) : friendshipStatus === 'pending' ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg font-semibold cursor-not-allowed"
                    >
                      <UserCheck className="w-5 h-5" />
                      Solicitud enviada
                    </button>
                  ) : (
                    <button
                      onClick={handleFriendRequest}
                      disabled={loadingFriendship}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5" />
                      {loadingFriendship ? 'Enviando...' : 'Agregar amigo'}
                    </button>
                  )}

                  {/* Botón de mensaje */}
                  <button
                    onClick={handleOpenChat}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Mensaje
                  </button>
                </div>
              )}

              {/* Sección de amigos - Solo botón */}
              {friendsCount > 0 && (
                <div>
                  <button
                    onClick={() => setActiveTab('friends')}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                      <span className="text-white font-semibold">Amigos</span>
                    </div>
                    <span className="text-slate-400 group-hover:text-slate-300 font-semibold transition-colors">
                      {friendsCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Tabs de contenido */}
          <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'posts'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Posts ({userPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('trips')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'trips'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Viajes ({userTrips.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'reviews'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Reseñas ({reviews.length})
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'friends'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Amigos ({friendsCount})
              </button>
            </div>

            {/* Controles de vista para posts */}
            {activeTab === 'posts' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Contenido de posts */}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                    <p className="text-slate-300">Cargando posts...</p>
                  </div>
                </div>
              ) : userPosts.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                  {userPosts.map((post) => (
                    <div key={post.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
                      {post.file_url && (
                        <div className="relative group">
                          {post.file_type === 'image' ? (
                            <div className="relative overflow-hidden cursor-pointer">
                              <img
                                src={post.file_url}
                                alt="Post content"
                                className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                                onClick={() => setSelectedImage(post.file_url)}
                                onError={(e) => {
                                  console.error('Error loading image:', post.file_url)
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully:', post.file_url)
                                }}
                              />
                              <div className="w-full h-48 bg-slate-700 flex items-center justify-center hidden">
                                <ImageIcon className="w-12 h-12 text-slate-400" />
                                <span className="text-slate-400 text-xs ml-2">Error cargando imagen</span>
                              </div>
                              {/* Overlay de zoom */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="w-8 h-8 text-white" />
                                </div>
                              </div>
                            </div>
                          ) : post.file_type === 'video' ? (
                            <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                              <Video className="w-12 h-12 text-slate-400" />
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-slate-400" />
                            </div>
                          )}
                          
                          {/* Indicador de privacidad */}
                          <div className="absolute top-2 right-2">
                            {post.is_public ? (
                              <Globe className="w-4 h-4 text-green-400" />
                            ) : (
                              <Lock className="w-4 h-4 text-yellow-400" />
                            )}
                          </div>
                          
                          {/* Overlay con información del archivo */}
                          <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1">
                            <span className="text-white text-xs">
                              {post.file_type === 'image' ? '📷 Imagen' : 
                               post.file_type === 'video' ? '🎥 Video' : 
                               '📎 Archivo'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ').charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">
                                {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || 'Usuario'}
                              </p>
                              <p className="text-slate-400 text-xs">
                                {new Date(post.created_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <button className="text-slate-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {post.content && (
                          <p className="text-slate-300 text-sm mb-3 whitespace-pre-wrap">
                            {post.content}
                          </p>
                        )}

                        {post.location && (
                          <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
                            <MapPin className="w-3 h-3" />
                            <span>{post.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => likePost(post.id)}
                              className={`flex items-center gap-1 text-sm transition-colors ${
                                likedPosts.has(post.id)
                                  ? 'text-red-400'
                                  : 'text-slate-400 hover:text-red-400'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                              <span>{post.likes_count || 0}</span>
                            </button>
                            
                            <button
                              onClick={() => toggleComments(post.id)}
                              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments_count || 0}</span>
                            </button>
                            
                            <button className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Comentarios */}
                        {showComments[post.id] && (
                          <div className="mt-4 border-t border-slate-700 pt-4">
                            <div className="space-y-3 mb-4">
                              {comments[post.id]?.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white font-semibold text-sm">
                                      {comment.user?.name?.charAt(0) || comment.user_name?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-white text-sm font-medium">
                                        {comment.user?.name || comment.user_name || 'Usuario'}
                                      </p>
                                      <span className="text-slate-400 text-xs">
                                        {new Date(comment.created_at).toLocaleDateString('es-ES', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <p className="text-slate-300 text-sm">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Escribe un comentario..."
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                                onKeyPress={(e) => e.key === 'Enter' && createComment(post.id)}
                              />
                              <button
                                onClick={() => createComment(post.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Enviar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No hay posts aún</h3>
                  <p className="text-slate-400 text-sm">
                    {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || 'Este usuario'} no ha compartido ningún post todavía.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contenido de viajes */}
          {activeTab === 'trips' && (
            <div>
              {userTrips.length > 0 ? (
            <div className="space-y-3">
                  {userTrips.map((trip) => (
                <div key={trip.id} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-semibold">{trip.title}</h3>
                      <p className="text-slate-300 text-sm">{trip.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-slate-400 text-sm">
                        <span>{trip.origin} → {trip.destination}</span>
                        <span>{new Date(trip.departure_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {trip.passengers?.length || 0} pasajeros
                    </span>
                  </div>
                </div>
              ))}
            </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No hay viajes</h3>
                  <p className="text-slate-400 text-sm">
                    {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || 'Este usuario'} no ha creado ningún viaje todavía.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Contenido de historial de viajes */}
          {activeTab === 'history' && (
            <div>
              <TripHistory userId={profile?.userid || profile?.user_id} />
            </div>
          )}

          {/* Contenido de reseñas */}
          {activeTab === 'reviews' && (
            <div>
              {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {[review.reviewer?.nombre, review.reviewer?.apellido].filter(Boolean).join(' ').charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">
                          {[review.reviewer?.nombre, review.reviewer?.apellido].filter(Boolean).join(' ') || 'Anónimo'}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-slate-400'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-slate-300 text-sm">{review.comment}</p>
                      )}
                      <p className="text-slate-400 text-xs mt-2">
                        {new Date(review.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No hay reseñas</h3>
                  <p className="text-slate-400 text-sm">
                    {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || 'Este usuario'} no ha recibido reseñas todavía.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab de Amigos */}
          {activeTab === 'friends' && (
            <div>
              {friends.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.userid}
                      onClick={() => navigate(`/profile/${friend.userid}`)}
                      className="bg-slate-800/50 rounded-xl p-4 cursor-pointer hover:bg-slate-700/50 transition-all hover:scale-105"
                    >
                      <div className="relative mb-3">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url}
                            alt={friend.nombre}
                            className="w-full aspect-square rounded-lg object-cover border-2 border-slate-700"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-slate-700">
                            <span className="text-white font-bold text-3xl">
                              {friend.nombre?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      <h4 className="text-white font-semibold text-sm truncate text-center">
                        {friend.nombre} {friend.apellido}
                      </h4>
                      {friend.bio && (
                        <p className="text-slate-400 text-xs mt-1 line-clamp-2 text-center">
                          {friend.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No tiene amigos todavía</h3>
                  <p className="text-slate-400 text-sm">
                    {[profile?.nombre, profile?.apellido].filter(Boolean).join(' ') || 'Este usuario'} aún no ha agregado amigos.
                  </p>
                </div>
              )}
            </div>
          )}
          </GlassCard>

        {/* Botón de contacto */}
        <div className="mt-6 text-center">
          <button className="btn">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contactar
          </button>
        </div>
      </div>

      {/* Modal para ver imagen en tamaño completo */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicProfilePage
