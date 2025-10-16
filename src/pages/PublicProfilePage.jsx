import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Navigation from '../components/Navigation'
import GlassCard from '../components/GlassCard'
import { MapPin, Calendar, Star, Users, MessageCircle, ArrowLeft } from 'lucide-react'

const PublicProfilePage = () => {
  const { username } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userTrips, setUserTrips] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    async function loadPublicProfile() {
      try {
        setLoading(true)
        setError('')

        // Buscar usuario por username o por ID (fallback)
        let userData = null
        let userError = null

        // Primero intentar por username
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
          // Si no se encuentra por username, intentar por ID (en caso de que se pase un ID)
          const { data: userById, error: idError } = await supabase
            .from('User')
            .select('*')
            .eq('userid', username)
            .single()

          console.log('Buscando usuario por ID:', username)
          console.log('Resultado por ID:', { userById, idError })

          if (userById && !idError) {
            userData = userById
          } else {
            userError = usernameError || idError
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

        // Cargar viajes del usuario
        const { data: tripsData } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(5)

        setUserTrips(tripsData || [])

        // Cargar reseñas recibidas
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            *,
            reviewer:profiles!reviews_reviewer_id_fkey(*)
          `)
          .eq('reviewee_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(3)

        setReviews(reviewsData || [])

      } catch (e) {
        setError('Error al cargar el perfil')
        console.error('Error loading public profile:', e)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      loadPublicProfile()
    }
  }, [username])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
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
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Intereses</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
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
              {profile.favorite_trips && profile.favorite_trips.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Estilos de viaje</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.favorite_trips.map((style, index) => (
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
            </div>
          </div>
        </GlassCard>

        {/* Viajes recientes */}
        {userTrips.length > 0 && (
          <GlassCard className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Viajes recientes
            </h2>
            <div className="space-y-3">
              {userTrips.slice(0, 3).map((trip) => (
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
          </GlassCard>
        )}

        {/* Reseñas recientes */}
        {reviews.length > 0 && (
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Reseñas recibidas
            </h2>
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
          </GlassCard>
        )}

        {/* Botón de contacto */}
        <div className="mt-6 text-center">
          <button className="btn">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contactar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublicProfilePage
