import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import GlassCard from '@/components/GlassCard'
import ProfileCard from '@/components/ProfileCard'
import ReviewsSection from '@/components/ReviewsSection'
import ReportUserModal from '@/components/ReportUserModal'
import DashboardLayout from '@/components/DashboardLayout'
import TripHistory from '@/components/TripHistory'
import FriendsList from '@/components/FriendsList'
import { supabase } from '@/services/supabase'
import { getUserAvatar } from '@/services/api'
import { sendFriendRequest, checkFriendshipStatus } from '@/services/friends'
import { UserPlus, Check, X, Clock } from 'lucide-react'

export default function PublicProfile() {
  const { userId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRow, setUserRow] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState('none') // 'none', 'pending', 'friends', 'rejected'
  const [sendingRequest, setSendingRequest] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        if (mounted) {
          setCurrentUser(user)
          setIsOwnProfile(user?.id === userId)
        }

        // Obtener el userid de la tabla User para usar en las solicitudes de amistad
        if (user) {
          const { data: userData } = await supabase
            .from('User')
            .select('userid')
            .eq('userid', user.id)
            .limit(1)
          
          if (userData && userData.length > 0) {
            setCurrentUser({ ...user, userid: userData[0].userid })
          }
        }

        // Cargar datos públicos básicos desde la tabla User (nombre, apellido, etc.)
        const { data, error } = await supabase
          .from('User')
          .select('userid,nombre,apellido,sexo,fecha_nacimiento,mail,bio,interests,favorite_travel_styles,avatar_url')
          .eq('userid', userId)
          .limit(1)
        if (error) throw error
        const base = (data || [])[0] || null

        // Obtener avatar_url desde la tabla User
        const avatarUrl = base?.avatar_url || ''

        // No usar admin.getUserById() en cliente (403). Solo tabla pública.
        if (mounted) setUserRow({ base, meta: { avatar_url: avatarUrl } })
      } catch (e) {
        if (mounted) setError(e?.message || 'No se pudo cargar el perfil')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (userId) load()
    return () => { mounted = false }
  }, [userId])

  // Verificar estado de amistad
  useEffect(() => {
    async function checkFriendship() {
      if (!currentUser || !userId || isOwnProfile) return
      
      try {
        const response = await checkFriendshipStatus(currentUser.userid || currentUser.id, userId)
        if (response.ok) {
          setFriendshipStatus(response.status)
        }
      } catch (error) {
        console.error('Error verificando estado de amistad:', error)
      }
    }
    
    checkFriendship()
  }, [currentUser, userId, isOwnProfile])

  // Función para enviar solicitud de amistad
  const handleSendFriendRequest = async () => {
    if (!currentUser || !userId || sendingRequest) return
    
    setSendingRequest(true)
    try {
      const response = await sendFriendRequest(currentUser.userid || currentUser.id, userId)
      if (response.ok) {
        setFriendshipStatus('pending')
        alert('Solicitud de amistad enviada')
      } else {
        alert(response.error || 'Error enviando solicitud')
      }
    } catch (error) {
      console.error('Error enviando solicitud:', error)
      alert('Error enviando solicitud de amistad')
    } finally {
      setSendingRequest(false)
    }
  }

  // Función para obtener el botón de amistad
  const getFriendshipButton = () => {
    if (isOwnProfile) return null
    
    switch (friendshipStatus) {
      case 'friends':
        return (
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled
          >
            <Check className="w-4 h-4" />
            Amigos
          </button>
        )
      case 'pending':
        return (
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg"
            disabled
          >
            <Clock className="w-4 h-4" />
            Solicitud Enviada
          </button>
        )
      case 'rejected':
        return (
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"
            disabled
          >
            <X className="w-4 h-4" />
            Solicitud Rechazada
          </button>
        )
      default:
        return (
          <button 
            onClick={handleSendFriendRequest}
            disabled={sendingRequest}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            {sendingRequest ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        )
    }
  }

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>
  if (error) return <div className="container"><pre className="error">{error}</pre></div>
  const base = userRow?.base || {}
  const meta = userRow?.meta || {}
  const fullName = [base?.nombre, base?.apellido].filter(Boolean).join(' ') || meta?.first_name || ''
  // Leer bio/intereses desde tabla pública si existen
  const bioPublic = (base?.bio || '').toString()
  const parseListValue = (value) => {
    try {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
      const raw = (value || '').toString().trim()
      if (!raw) return []
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {}
      const cleaned = raw.replace(/[\[\]{}\"]/g, ' ')
      return cleaned.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
    } catch {
      return []
    }
  }
  const interestsPublic = parseListValue(base?.interests)
  const favsPublic = parseListValue(base?.favorite_travel_styles)
  const initials = (fullName || base?.mail || 'U').charAt(0).toUpperCase()
  const bio = (meta?.bio || '').toString()
  const interests = Array.isArray(meta?.interests) ? meta.interests : ((meta?.interests || '').toString().split(',').map((t) => t.trim()).filter(Boolean))
  const favs = Array.isArray(meta?.favorite_travel_styles) ? meta.favorite_travel_styles : ((meta?.favorite_travel_styles || '').toString().split(',').map((t) => t.trim()).filter(Boolean))

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 text-white" style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <h3 className="page-title" style={{ margin: 0, color: '#60a5fa' }}>
            {isOwnProfile ? 'Mi Perfil' : 'Perfil'}
          </h3>
        </div>
        <div className="relative">
          <ProfileCard profile={{
            user_id: userId,
            email: base?.mail,
            dni_verified: true,
            meta: {
              first_name: fullName,
              last_name: '',
              bio: bioPublic || bio,
              interests: (interestsPublic.length > 0 ? interestsPublic : interests),
              favorite_travel_styles: (favsPublic.length > 0 ? favsPublic : favs),
              avatar_url: meta?.avatar_url || '',
            },
          }} readOnly={!isOwnProfile} />
          
          {/* Botones de acción */}
          {!isOwnProfile && currentUser && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              {/* Botón de solicitud de amistad */}
              {getFriendshipButton()}
              
              {/* Botón de reportar usuario */}
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                title="Reportar usuario"
              >
                🚫 Reportar usuario
              </button>
            </div>
          )}
        </div>
        
        {/* Sección de historial de viajes */}
        <div className="mt-8">
          <GlassCard>
            <TripHistory userId={userId} />
          </GlassCard>
        </div>

        {/* Sección de amigos */}
        <div className="mt-8">
          <FriendsList userId={userId} currentUserId={currentUser?.id} />
        </div>
        
        {/* Sección de reseñas */}
        <ReviewsSection 
          userId={userId} 
          isOwnProfile={isOwnProfile}
        />

        {/* Modal de reporte */}
        <ReportUserModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={userId}
          reportedUserName={fullName || 'Usuario'}
        />
      </div>
    </DashboardLayout>
  )
}


