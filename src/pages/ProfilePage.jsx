import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, updateUserMetadata, supabase } from '../services/supabase'
import { upsertProfileToBackend, getUserAvatar, setAuthToken } from '../services/api'
import { updatePassword, sendPasswordResetEmail } from '../services/passwordReset'
import { User, Settings, Star, MessageSquare, Heart, Shield, CreditCard, MapPin, Bell, Edit3, Save, X, Download, Trash2, AlertTriangle, FileText, MapPin as MapPinIcon } from 'lucide-react'
import AvatarUpload from '../components/AvatarUpload'
import MyTripHistory from '../components/MyTripHistory'
import BackButton from '../components/BackButton'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState('')
  const [favoriteTrips, setFavoriteTrips] = useState('')
  const [newInterest, setNewInterest] = useState('')
  const [newTripStyle, setNewTripStyle] = useState('')
  const [userTrips, setUserTrips] = useState([])
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [userReviews, setUserReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const navigate = useNavigate()

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
        
        // Backend JWT (login por email)
        const accessToken = localStorage.getItem('access_token')
        const decodeJwt = (token) => {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
            return JSON.parse(jsonPayload)
          } catch {
            return null
          }
        }
        const jwtPayload = accessToken ? decodeJwt(accessToken) : null

        const localMeta = (() => { 
          try { 
            return JSON.parse(localStorage.getItem('dni_meta') || 'null') 
          } catch { 
            return null 
          }
        })()

        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || jwtPayload?.user_id || jwtPayload?.sub || null,
          email: user?.email || jwtPayload?.email || null,
          meta: mergedMeta,
        }

        setProfile(info)
        setAvatarUrl(mergedMeta?.avatar_url || '')

        // Intentar obtener avatar persistente desde backend o tabla pública
        try {
          const avatarRes = await getUserAvatar(info.user_id)
          const backendUrl = avatarRes?.avatar_url || avatarRes?.data?.avatar_url || avatarRes?.url
          if (backendUrl) {
            setAvatarUrl(backendUrl)
          } else {
            // Fallback: leer desde tabla User en Supabase
            try {
              const { data: userRows, error: userErr } = await supabase
                .from('User')
                .select('avatar_url')
                .eq('userid', info.user_id)
                .limit(1)
              if (!userErr && Array.isArray(userRows) && userRows[0]?.avatar_url) {
                setAvatarUrl(userRows[0].avatar_url)
              }
            } catch (_e) {}
          }
        } catch (_e) {}
        setBio(mergedMeta?.bio || '')
        setInterests(Array.isArray(mergedMeta?.interests) ? mergedMeta.interests.join(', ') : (mergedMeta?.interests || ''))
        setFavoriteTrips(Array.isArray(mergedMeta?.favorite_travel_styles) ? mergedMeta.favorite_travel_styles.join(', ') : (mergedMeta?.favorite_travel_styles || ''))
        
        // Cargar viajes del usuario
        try {
          const { listTrips } = await import('../services/trips')
          const trips = await listTrips()
          const userTripsList = trips.filter(trip => 
            trip.creatorId === info.user_id || 
            (trip.participants && trip.participants.includes(info.user_id))
          )
          setUserTrips(userTripsList)
        } catch (e) {
          console.warn('Error loading user trips:', e)
        }

        // Cargar reseñas del usuario
        await loadUserReviews(info.user_id)
      } catch (e) {
        console.error('Error loading profile:', e)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const handleAvatarChange = async (newAvatarUrl) => {
    try {
      setSaving(true)
      setError('')

      // 1) Intentar actualizar metadata en Supabase Auth (puede fallar si no hay sesión activa en Supabase)
      try {
        await updateUserMetadata({ avatar_url: newAvatarUrl })
      } catch (authErr) {
        console.warn('updateUserMetadata falló, continuo con backend/User table:', authErr)
      }

      // 2) Actualizar en el backend (no depende de Supabase Auth)
      try {
        await upsertProfileToBackend({
          user_id: profile?.user_id,
          email: profile?.email,
          first_name: profile?.meta?.first_name,
          last_name: profile?.meta?.last_name,
          document_number: profile?.meta?.document_number,
          sex: profile?.meta?.sex,
          birth_date: profile?.meta?.birth_date,
          bio: bio,
          interests: interests.split(',').map(i => i.trim()).filter(Boolean),
          favorite_travel_styles: favoriteTrips.split(',').map(t => t.trim()).filter(Boolean),
          avatar_url: newAvatarUrl,
        })
      } catch (backendErr) {
        console.warn('Error updating backend avatar:', backendErr)
      }

      // 3) Actualizar avatar_url en la tabla User (bypass RLS mediante supabase JS si tiene permisos del usuario)
      try {
        const { error: updateError } = await supabase
          .from('User')
          .update({ avatar_url: newAvatarUrl })
          .eq('userid', profile?.user_id)
        if (updateError) {
          console.warn('Error updating avatar_url in User table:', updateError)
        }
      } catch (tableErr) {
        console.warn('Error updating avatar_url in User table:', tableErr)
      }

      // 4) Actualizar estado local siempre que tengamos la URL nueva
      setAvatarUrl(newAvatarUrl)
    } catch (e) {
      setError(e?.message || 'Error al actualizar la foto de perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      
      const interestsArray = interests.split(',').map(i => i.trim()).filter(Boolean)
      const favoriteTripsArray = favoriteTrips.split(',').map(t => t.trim()).filter(Boolean)
      
      // Guardar en metadata de Supabase
      await updateUserMetadata({
        bio: bio.slice(0, 500),
        interests: interestsArray,
        favorite_travel_styles: favoriteTripsArray,
      })
      
      // Upsert espejo en tabla pública para perfiles visibles
      try {
        await upsertProfileToBackend({
          user_id: profile?.user_id,
          email: profile?.email,
          first_name: profile?.meta?.first_name,
          last_name: profile?.meta?.last_name,
          document_number: profile?.meta?.document_number,
          sex: profile?.meta?.sex,
          birth_date: profile?.meta?.birth_date,
          bio: bio.slice(0, 500),
          interests: interestsArray,
          favorite_travel_styles: favoriteTripsArray,
        })
      } catch (e) {
        console.warn('Error updating backend:', e)
      }
      
      setEditing(false)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setBio(profile?.meta?.bio || '')
    setInterests(Array.isArray(profile?.meta?.interests) ? profile.meta.interests.join(', ') : (profile?.meta?.interests || ''))
    setFavoriteTrips(Array.isArray(profile?.meta?.favorite_travel_styles) ? profile.meta.favorite_travel_styles.join(', ') : (profile?.meta?.favorite_travel_styles || ''))
    setNewInterest('')
    setNewTripStyle('')
    setError('')
  }

  const addInterest = () => {
    if (newInterest.trim() && !interests.split(',').map(i => i.trim().toLowerCase()).includes(newInterest.trim().toLowerCase())) {
      setInterests(prev => prev ? `${prev}, ${newInterest.trim()}` : newInterest.trim())
      setNewInterest('')
    }
  }

  const removeInterest = (interestToRemove) => {
    const interestsList = interests.split(',').map(i => i.trim()).filter(i => i !== interestToRemove)
    setInterests(interestsList.join(', '))
  }

  const addTripStyle = () => {
    if (newTripStyle.trim() && !favoriteTrips.split(',').map(t => t.trim().toLowerCase()).includes(newTripStyle.trim().toLowerCase())) {
      setFavoriteTrips(prev => prev ? `${prev}, ${newTripStyle.trim()}` : newTripStyle.trim())
      setNewTripStyle('')
    }
  }

  const removeTripStyle = (styleToRemove) => {
    const stylesList = favoriteTrips.split(',').map(t => t.trim()).filter(t => t !== styleToRemove)
    setFavoriteTrips(stylesList.join(', '))
  }

  const getTripCount = () => {
    return userTrips.length
  }

  const getTripLevel = () => {
    const count = getTripCount()
    if (count === 0) return 'Principiante'
    if (count < 3) return 'Viajero'
    if (count < 10) return 'Experto'
    return 'Maestro'
  }

  const loadUserReviews = async (userId) => {
    try {
      setReviewsLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(*)
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error loading reviews:', error)
        return
      }

      setUserReviews(data || [])
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const getAverageRating = () => {
    if (!userReviews.length) return 0
    const sum = userReviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / userReviews.length).toFixed(1)
  }

  const handlePasswordChange = async () => {
    try {
      setPasswordSaving(true)
      setPasswordError('')

      // Validaciones
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError('Todos los campos son obligatorios')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Las contraseñas nuevas no coinciden')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('La nueva contraseña debe tener al menos 6 caracteres')
        return
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email,
        password: passwordData.currentPassword
      })

      if (signInError) {
        setPasswordError('La contraseña actual es incorrecta')
        return
      }

      // Actualizar contraseña
      const result = await updatePassword(passwordData.newPassword)
      
      if (result.ok) {
        setShowPasswordModal(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        alert('Contraseña actualizada exitosamente')
      } else {
        setPasswordError(result.error)
      }
    } catch (e) {
      setPasswordError(e?.message || 'Error al cambiar la contraseña')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handlePasswordCancel = () => {
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordError('')
  }

  const handleForgotPassword = async () => {
    try {
      setSendingResetEmail(true)
      setPasswordError('')
      setSuccessMessage('')
      
      const result = await sendPasswordResetEmail(profile?.email)
      
      if (result.ok) {
        setSuccessMessage('Se ha enviado un enlace de recuperación a tu email')
        // Auto-cerrar el modal después de 3 segundos
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          setSuccessMessage('')
        }, 3000)
      } else {
        setPasswordError(result.error)
      }
    } catch (e) {
      setPasswordError(e?.message || 'Error al enviar el email de recuperación')
    } finally {
      setSendingResetEmail(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      setError('')
      
      // Recopilar todos los datos del usuario
      const userData = {
        profile: {
          user_id: profile?.user_id,
          email: profile?.email,
          first_name: profile?.meta?.first_name,
          last_name: profile?.meta?.last_name,
          document_number: profile?.meta?.document_number,
          sex: profile?.meta?.sex,
          birth_date: profile?.meta?.birth_date,
          country: profile?.meta?.country,
          bio: profile?.meta?.bio,
          interests: profile?.meta?.interests,
          favorite_travel_styles: profile?.meta?.favorite_travel_styles,
          avatar_url: profile?.meta?.avatar_url,
          created_at: profile?.meta?.created_at,
          updated_at: profile?.meta?.updated_at
        },
        trips: userTrips,
        export_date: new Date().toISOString(),
        export_version: '1.0'
      }

      // Crear y descargar el archivo JSON
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `jetgo-datos-usuario-${profile?.user_id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setSuccessMessage('Datos exportados exitosamente')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (e) {
      setError('Error al exportar los datos: ' + (e?.message || 'Error desconocido'))
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true)
      setError('')
      
      if (deleteConfirmText !== 'ELIMINAR') {
        setError('Debes escribir "ELIMINAR" para confirmar')
        return
      }

      // Eliminar datos del backend
      try {
        const { data: { access_token } } = await supabase.auth.getSession()
        if (access_token) {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/users/delete-account/`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Error al eliminar cuenta en el backend')
          }
        }
      } catch (e) {
        console.warn('Error eliminando del backend:', e)
        throw new Error('Error al eliminar la cuenta: ' + e.message)
      }

      // Limpiar datos locales
      localStorage.clear()
      sessionStorage.clear()
      
      // Redirigir al login
      navigate('/login')
      alert('Tu cuenta ha sido eliminada exitosamente')
    } catch (e) {
      setError('Error al eliminar la cuenta: ' + (e?.message || 'Error desconocido'))
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeleteConfirmText('')
    setError('')
  }

  const handleSignOut = async () => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Error signing out from Supabase:', e)
    }
    try {
      // Limpiar token del backend y almacenamiento local relevante
      setAuthToken(null)
    } catch (_) {}
    try {
      localStorage.removeItem('access_token')
    } catch (_) {}
    // Redirigir a login
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p>Cargando perfil...</p>
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

  const isVerified = (profile?.meta?.dni_verified === true) || (typeof window !== 'undefined' && localStorage.getItem('dni_verified') === 'true')

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón de volver */}
        <div className="mb-6">
          <BackButton fallback="/" variant="ghost" />
        </div>
        {/* Header del perfil */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {editing ? (
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  onAvatarChange={handleAvatarChange}
                  userId={profile?.user_id}
                  disabled={saving}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    profile?.meta?.first_name ? profile.meta.first_name.charAt(0).toUpperCase() : '?'
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {profile?.meta?.first_name || 'Usuario'}
                  </h1>
                  {bio && (
                    <p className="text-slate-300 text-sm">
                      {bio}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
                      {getTripLevel()} ({getTripCount()} viajes)
                    </span>
                    <span className={`text-xs ${isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isVerified ? '✓ DNI verificado' : 'Cuenta sin verificar'}
                    </span>
                  </div>
                </div>
                <div>
                  {editing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="btn secondary flex items-center gap-2"
                        disabled={saving}
                      >
                        <X size={16} />
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        className="btn flex items-center gap-2"
                        disabled={saving}
                      >
                        <Save size={16} />
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="btn secondary flex items-center gap-2"
                    >
                      <Edit3 size={16} />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Banner de verificación */}
        {!isVerified && (
          <div className="glass-card p-4 mb-6 bg-red-500/10 border-2 border-red-500/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-400 mb-1">Cuenta sin verificar</h3>
                <p className="text-slate-300 text-sm mb-3">
                  No podrás acceder a las funcionalidades sin la verificación del DNI. Verifica tu identidad para disfrutar de todas las características de JetGo.
                </p>
                <button
                  onClick={() => navigate('/verify-dni')}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Verificar DNI ahora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs de navegación */}
        <div className="glass-card p-1 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'personal' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User size={18} />
              Información personal
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'trips' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <MapPinIcon size={18} />
              Historial de viajes
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'account' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Settings size={18} />
              Cuenta
            </button>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {/* Información básica */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <User size={20} />
                Información básica
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Nombre</label>
                  <p className="text-white">{profile?.meta?.first_name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Apellido</label>
                  <p className="text-white">{profile?.meta?.last_name || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Email</label>
                  <p className="text-white">{profile?.email || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">DNI</label>
                  <p className="text-white">{profile?.meta?.document_number || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Fecha de nacimiento</label>
                  <p className="text-white">{profile?.meta?.birth_date || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">País</label>
                  <p className="text-white">{profile?.meta?.country || 'No especificado'}</p>
                </div>
              </div>
            </div>

            {/* Biografía e intereses */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Heart size={20} />
                Sobre mí
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">Biografía</label>
                  {editing ? (
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Contanos sobre vos..."
                      rows={4}
                      className="w-full mt-1 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                      style={{ resize: 'vertical' }}
                      maxLength={500}
                    />
                  ) : (
                    !!bio && (
                      <p className="text-white mt-1">{bio}</p>
                    )
                  )}
                </div>
                <div>
                  <label className="text-sm text-slate-400">Intereses</label>
                  {editing ? (
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {interests ? interests.split(',').map((interest, index) => (
                          <span key={index} className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {interest.trim()}
                            <button
                              onClick={() => removeInterest(interest.trim())}
                              className="text-emerald-300 hover:text-emerald-100"
                            >
                              ×
                            </button>
                          </span>
                        )) : null}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Agregar interés..."
                          className="flex-1 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                          onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                        />
                        <button
                          onClick={addInterest}
                          className="btn secondary"
                          disabled={!newInterest.trim()}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {interests ? (
                        interests.split(',').map((interest, index) => (
                          <span key={index} className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm">
                            {interest.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">Sin intereses especificados</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-slate-400">Estilos de viaje favoritos</label>
                  {editing ? (
                    <div className="mt-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {favoriteTrips ? favoriteTrips.split(',').map((style, index) => (
                          <span key={index} className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {style.trim()}
                            <button
                              onClick={() => removeTripStyle(style.trim())}
                              className="text-blue-300 hover:text-blue-100"
                            >
                              ×
                            </button>
                          </span>
                        )) : null}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newTripStyle}
                          onChange={(e) => setNewTripStyle(e.target.value)}
                          placeholder="Agregar estilo de viaje..."
                          className="flex-1 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                          onKeyDown={(e) => e.key === 'Enter' && addTripStyle()}
                        />
                        <button
                          onClick={addTripStyle}
                          className="btn secondary"
                          disabled={!newTripStyle.trim()}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {favoriteTrips ? (
                        favoriteTrips.split(',').map((style, index) => (
                          <span key={index} className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                            {style.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">Sin estilos de viaje especificados</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reseñas */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Star size={20} />
                Reseñas recibidas
              </h2>
              
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                  <span className="ml-3 text-slate-300">Cargando reseñas...</span>
                </div>
              ) : userReviews.length > 0 ? (
                <div className="space-y-4">
                  {/* Rating promedio */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">{getAverageRating()}</div>
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(getAverageRating())
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-slate-400">{userReviews.length} reseñas</div>
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = userReviews.filter(r => r.rating === rating).length
                          const percentage = userReviews.length > 0 ? (count / userReviews.length) * 100 : 0
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <span className="text-sm text-slate-300 w-4">{rating}</span>
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <div className="flex-1 bg-slate-700 rounded-full h-2">
                                <div 
                                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-slate-400 w-8">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Lista de reseñas */}
                  <div className="space-y-4">
                    {userReviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="bg-slate-700/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                              {review.reviewer?.first_name?.charAt(0) || 'A'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-semibold">
                                {review.reviewer?.first_name || 'Anónimo'}
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
                              <span className="text-slate-400 text-sm">
                                {new Date(review.created_at).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-slate-300 text-sm">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {userReviews.length > 5 && (
                    <div className="text-center">
                      <button className="text-emerald-400 hover:text-emerald-300 text-sm">
                        Ver todas las reseñas ({userReviews.length})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Aún no tienes reseñas</h3>
                  <p className="text-slate-400 text-sm">
                    Las reseñas aparecerán aquí cuando otros usuarios te evalúen después de viajar juntos.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="space-y-6">
            <MyTripHistory userId={profile?.user_id} />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Reseñas */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Star size={20} />
                Reseñas
              </h2>
              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/profile/reviews')}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Star className="text-yellow-400" size={20} />
                    <span className="text-white">Ver todas las reseñas</span>
                  </div>
                  <span className="text-slate-400">{'>'}</span>
                </button>
              </div>
            </div>

            {/* Configuraciones de cuenta */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings size={20} />
                Configuraciones
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/profile/settings')}
                  className="w-full flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="text-emerald-400" size={20} />
                    <span className="text-white">Configuración de cuenta</span>
                  </div>
                  <span className="text-slate-400">{'>'}</span>
                </button>
              </div>
            </div>

            {/* Acciones de cuenta */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Acciones de cuenta</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left"
                >
                  <span className="text-white">Cambiar contraseña</span>
                </button>
                <button 
                  onClick={handleExportData}
                  disabled={exporting}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Download size={20} className="text-emerald-400" />
                  <span className="text-white">{exporting ? 'Exportando...' : 'Exportar datos'}</span>
                </button>
                <button 
                  onClick={() => setShowTermsModal(true)}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left flex items-center gap-3"
                >
                  <FileText size={20} className="text-blue-400" />
                  <span className="text-white">Términos y condiciones</span>
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full p-4 bg-red-500/80 hover:bg-red-500 transition-colors text-left rounded-lg flex items-center gap-3 text-white font-medium"
                >
                  <X size={20} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Cambiar contraseña</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Contraseña actual</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                  placeholder="Ingresa tu contraseña actual"
                />
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={sendingResetEmail}
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingResetEmail ? 'Enviando...' : 'No recuerdo mi contraseña'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-slate-400">Nueva contraseña</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                  placeholder="Ingresa tu nueva contraseña"
                />
              </div>
              
              <div>
                <label className="text-sm text-slate-400">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                  placeholder="Confirma tu nueva contraseña"
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Tu foto de perfil" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-600 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {profile?.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-green-400 text-sm">{successMessage}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePasswordCancel}
                className="flex-1 btn secondary"
                disabled={passwordSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordChange}
                className="flex-1 btn"
                disabled={passwordSaving}
              >
                {passwordSaving ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar cuenta */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={20} />
              </div>
              <h3 className="text-xl font-semibold text-white">Eliminar cuenta</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm font-medium mb-2">⚠️ Esta acción es irreversible</p>
                <p className="text-slate-300 text-sm">
                  Al eliminar tu cuenta se borrarán permanentemente:
                </p>
                <ul className="text-slate-300 text-sm mt-2 ml-4 list-disc">
                  <li>Todos tus datos personales</li>
                  <li>Tu historial de viajes</li>
                  <li>Tus reseñas y calificaciones</li>
                  <li>Tus conexiones y amigos</li>
                  <li>Todos los archivos subidos</li>
                </ul>
              </div>

              <div>
                <label className="text-sm text-slate-400">
                  Para confirmar, escribe <span className="font-mono text-red-400">ELIMINAR</span>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full mt-1 bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2"
                  placeholder="Escribe ELIMINAR para confirmar"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 btn secondary"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={deleting || deleteConfirmText !== 'ELIMINAR'}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Eliminar cuenta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de términos y condiciones */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText size={20} />
                Términos y Condiciones
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-bold text-white mb-4">Términos y Condiciones de JetGo</h2>
                
                <div className="space-y-6 text-slate-300">
                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">1. Aceptación de los Términos</h3>
                    <p className="mb-4">
                      Al utilizar la aplicación JetGo, usted acepta estar sujeto a estos términos y condiciones. 
                      Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestros servicios.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">2. Descripción del Servicio</h3>
                    <p className="mb-4">
                      JetGo es una plataforma que conecta a viajeros para compartir viajes, reducir costos y 
                      crear experiencias de viaje colaborativas. Nuestros servicios incluyen la creación de viajes, 
                      búsqueda de compañeros de viaje, gestión de gastos compartidos y comunicación entre usuarios.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">3. Registro y Cuenta de Usuario</h3>
                    <p className="mb-4">
                      Para utilizar nuestros servicios, debe crear una cuenta proporcionando información precisa y actualizada. 
                      Es responsable de mantener la confidencialidad de su cuenta y contraseña, y de todas las actividades 
                      que ocurran bajo su cuenta.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">4. Uso Aceptable</h3>
                    <p className="mb-4">
                      Usted se compromete a utilizar JetGo de manera responsable y ética. Está prohibido:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Proporcionar información falsa o engañosa</li>
                      <li>Utilizar la plataforma para actividades ilegales</li>
                      <li>Harassment, acoso o comportamiento inapropiado hacia otros usuarios</li>
                      <li>Compartir contenido ofensivo, discriminatorio o inapropiado</li>
                      <li>Intentar acceder a cuentas de otros usuarios</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">5. Responsabilidades del Usuario</h3>
                    <p className="mb-4">
                      Como usuario de JetGo, usted es responsable de:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Verificar la identidad de otros usuarios antes de viajar juntos</li>
                      <li>Cumplir con todos los acuerdos de viaje establecidos</li>
                      <li>Pagar su parte de los gastos compartidos según lo acordado</li>
                      <li>Comunicarse de manera respetuosa con otros usuarios</li>
                      <li>Reportar cualquier comportamiento inapropiado</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">6. Limitación de Responsabilidad</h3>
                    <p className="mb-4">
                      JetGo actúa como intermediario entre usuarios. No somos responsables por:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Comportamiento de otros usuarios</li>
                      <li>Pérdidas o daños durante los viajes</li>
                      <li>Disputas entre usuarios</li>
                      <li>Cancelaciones o cambios de planes de viaje</li>
                      <li>Problemas de seguridad personal</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">7. Privacidad y Protección de Datos</h3>
                    <p className="mb-4">
                      Respetamos su privacidad y protegemos sus datos personales de acuerdo con nuestra 
                      Política de Privacidad. Sus datos se utilizan únicamente para proporcionar y mejorar 
                      nuestros servicios.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">8. Modificaciones</h3>
                    <p className="mb-4">
                      Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                      Los cambios entrarán en vigor inmediatamente después de su publicación en la aplicación.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">9. Terminación</h3>
                    <p className="mb-4">
                      Podemos suspender o terminar su cuenta si viola estos términos o si consideramos 
                      que su comportamiento es inapropiado o perjudicial para otros usuarios.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-3">10. Contacto</h3>
                    <p className="mb-4">
                      Si tiene preguntas sobre estos términos y condiciones, puede contactarnos a través 
                      de la aplicación o enviando un email a soporte@jetgo.com
                    </p>
                  </section>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t border-slate-700">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
