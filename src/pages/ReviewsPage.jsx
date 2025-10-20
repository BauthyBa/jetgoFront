import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, supabase } from '../services/supabase'
import { Star, ArrowLeft, MessageSquare, User, Calendar } from 'lucide-react'
import Navigation from '../components/Navigation'
import BackButton from '../components/BackButton'

export default function ReviewsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('received')
  const [userProfile, setUserProfile] = useState(null)
  const navigate = useNavigate()

  // Estados para reseñas reales
  const [receivedReviews, setReceivedReviews] = useState([])
  const [givenReviews, setGivenReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const session = await getSession()
        if (!session?.user) {
          navigate('/login')
          return
        }

        const user = session.user
        const meta = user?.user_metadata || {}
        
        const localMeta = (() => { 
          try { 
            return JSON.parse(localStorage.getItem('dni_meta') || 'null') 
          } catch { 
            return null 
          }
        })()

        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || null,
          email: user?.email || null,
          meta: mergedMeta,
        }

        setProfile(info)
        
        // Cargar perfil completo del usuario
        await loadUserProfile(info.user_id)
        
        // Cargar reseñas
        await loadReviews(info.user_id)
      } catch (e) {
        console.error('Error loading profile:', e)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('userid', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return
      }

      setUserProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const loadReviews = async (userId) => {
    try {
      setReviewsLoading(true)
      
      // Cargar reseñas recibidas
      const { data: receivedData, error: receivedError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(*)
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false })

      if (receivedError) {
        console.error('Error loading received reviews:', receivedError)
      } else {
        setReceivedReviews(receivedData || [])
      }

      // Cargar reseñas dadas
      const { data: givenData, error: givenError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewed_user:profiles!reviews_reviewed_user_id_fkey(*)
        `)
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false })

      if (givenError) {
        console.error('Error loading given reviews:', givenError)
      } else {
        setGivenReviews(givenData || [])
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const getUserAvatar = () => {
    if (userProfile?.avatar_url) return userProfile.avatar_url
    if (profile?.meta?.avatar_url) return profile.meta.avatar_url
    return null
  }

  const getUserDisplayName = () => {
    if (userProfile?.nombre && userProfile?.apellido) {
      return `${userProfile.nombre} ${userProfile.apellido}`
    }
    if (profile?.meta?.first_name && profile?.meta?.last_name) {
      return `${profile.meta.first_name} ${profile.meta.last_name}`
    }
    if (profile?.meta?.first_name) {
      return profile.meta.first_name
    }
    return profile?.email || 'Usuario'
  }

  const getAverageRating = (reviews) => {
    if (!reviews.length) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p>Cargando reseñas...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <p>Error al cargar el perfil</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn mt-4"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón de volver */}
        <div className="mb-6">
          <BackButton fallback="/profile" variant="ghost" />
        </div>
        
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4">
            {getUserAvatar() ? (
              <img 
                src={getUserAvatar()} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold ${getUserAvatar() ? 'hidden' : 'flex'}`}
            >
              {getUserDisplayName().charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reseñas</h1>
              <p className="text-slate-300">Gestiona tus reseñas de viajes</p>
            </div>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="glass-card p-1 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('received')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'received' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Star size={18} />
              Reseñas recibidas
            </button>
            <button
              onClick={() => setActiveTab('given')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'given' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <MessageSquare size={18} />
              Reseñas que di
            </button>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'received' && (
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Reseñas recibidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{receivedReviews.length}</div>
                  <div className="text-slate-400 text-sm">Total reseñas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">{getAverageRating(receivedReviews)}</div>
                  <div className="text-slate-400 text-sm">Promedio</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{receivedReviews.filter(r => r.rating >= 4).length}</div>
                  <div className="text-slate-400 text-sm">Positivas (4+ estrellas)</div>
                </div>
              </div>
            </div>

            {/* Lista de reseñas */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Últimas reseñas</h3>
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                  <span className="ml-3 text-slate-300">Cargando reseñas...</span>
                </div>
              ) : receivedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-400 text-lg">Aún no tienes reseñas</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Las reseñas aparecerán aquí cuando otros usuarios te evalúen
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start gap-4">
                        {review.reviewer?.avatar_url ? (
                          <img 
                            src={review.reviewer.avatar_url} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold ${review.reviewer?.avatar_url ? 'hidden' : 'flex'}`}
                        >
                          {(review.reviewer?.nombre || review.reviewer?.first_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-semibold">
                              {review.reviewer?.nombre || review.reviewer?.first_name || 'Anónimo'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={16} 
                                  className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-400'} 
                                />
                              ))}
                            </div>
                            <span className="text-slate-400 text-sm">
                              {new Date(review.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-slate-300">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'given' && (
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Reseñas que he dado</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">{givenReviews.length}</div>
                  <div className="text-slate-400 text-sm">Total reseñas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">{getAverageRating(givenReviews)}</div>
                  <div className="text-slate-400 text-sm">Promedio dado</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{givenReviews.filter(r => r.rating >= 4).length}</div>
                  <div className="text-slate-400 text-sm">Positivas (4+ estrellas)</div>
                </div>
              </div>
            </div>

            {/* Lista de reseñas */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Mis reseñas</h3>
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                  <span className="ml-3 text-slate-300">Cargando reseñas...</span>
                </div>
              ) : givenReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-400 text-lg">Aún no has dado reseñas</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Puedes evaluar a otros usuarios después de completar un viaje
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {givenReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start gap-4">
                        {review.reviewed_user?.avatar_url ? (
                          <img 
                            src={review.reviewed_user.avatar_url} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold ${review.reviewed_user?.avatar_url ? 'hidden' : 'flex'}`}
                        >
                          {(review.reviewed_user?.nombre || review.reviewed_user?.first_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-semibold">
                              {review.reviewed_user?.nombre || review.reviewed_user?.first_name || 'Anónimo'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={16} 
                                  className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-400'} 
                                />
                              ))}
                            </div>
                            <span className="text-slate-400 text-sm">
                              {new Date(review.created_at).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-slate-300">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
