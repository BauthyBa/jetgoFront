import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../services/supabase'
import { Star, ArrowLeft, MessageSquare, User, Calendar } from 'lucide-react'
import Navigation from '../components/Navigation'

export default function ReviewsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('received')
  const navigate = useNavigate()

  // Datos de ejemplo para las reseñas
  const [receivedReviews, setReceivedReviews] = useState([])
  const [givenReviews, setGivenReviews] = useState([])

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
      } catch (e) {
        console.error('Error loading profile:', e)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

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
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
              {profile?.meta?.first_name ? profile.meta.first_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reseñas</h1>
              <p className="text-slate-300">Gestiona tus reseñas como conductor y pasajero</p>
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
              Reseñas que me dieron
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
              Reseñas que yo di
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
                  <div className="text-3xl font-bold text-emerald-400 mb-2">0</div>
                  <div className="text-slate-400 text-sm">Total reseñas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">0.0</div>
                  <div className="text-slate-400 text-sm">Promedio</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
                  <div className="text-slate-400 text-sm">Como conductor</div>
                </div>
              </div>
            </div>

            {/* Lista de reseñas */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Últimas reseñas</h3>
              {receivedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-400 text-lg">Aún no tienes reseñas</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Las reseñas aparecerán aquí cuando otros usuarios te evalúen
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedReviews.map((review, index) => (
                    <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-semibold">{review.userName}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={16} 
                                  className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-400'} 
                                />
                              ))}
                            </div>
                            <span className="text-slate-400 text-sm">{review.date}</span>
                          </div>
                          <p className="text-slate-300">{review.comment}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                            <span>Viaje: {review.tripName}</span>
                            <span>•</span>
                            <span>{review.role}</span>
                          </div>
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
                  <div className="text-3xl font-bold text-emerald-400 mb-2">0</div>
                  <div className="text-slate-400 text-sm">Total reseñas</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">0.0</div>
                  <div className="text-slate-400 text-sm">Promedio dado</div>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
                  <div className="text-slate-400 text-sm">Como pasajero</div>
                </div>
              </div>
            </div>

            {/* Lista de reseñas */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Mis reseñas</h3>
              {givenReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-400 text-lg">Aún no has dado reseñas</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Puedes evaluar a otros usuarios después de completar un viaje
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {givenReviews.map((review, index) => (
                    <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white font-semibold">{review.userName}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={16} 
                                  className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-slate-400'} 
                                />
                              ))}
                            </div>
                            <span className="text-slate-400 text-sm">{review.date}</span>
                          </div>
                          <p className="text-slate-300">{review.comment}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                            <span>Viaje: {review.tripName}</span>
                            <span>•</span>
                            <span>{review.role}</span>
                          </div>
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
