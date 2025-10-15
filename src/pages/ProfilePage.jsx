import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, updateUserMetadata, supabase } from '../services/supabase'
import { upsertProfileToBackend } from '../services/api'
import { updatePassword, sendPasswordResetEmail } from '../services/passwordReset'
import { User, Settings, Star, MessageSquare, Heart, Shield, CreditCard, MapPin, Bell, Edit3, Save, X } from 'lucide-react'
import AvatarUpload from '../components/AvatarUpload'
import Navigation from '../components/Navigation'

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
      
      // Actualizar metadata en Supabase
      await updateUserMetadata({
        avatar_url: newAvatarUrl
      })
      
      // Actualizar en el backend
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
      } catch (e) {
        console.warn('Error updating backend avatar:', e)
      }
      
      // Actualizar avatar_url en la tabla User de Supabase
      try {
        const { error: updateError } = await supabase
          .from('User')
          .update({ avatar_url: newAvatarUrl })
          .eq('userid', profile?.user_id)
        
        if (updateError) {
          console.warn('Error updating avatar_url in User table:', updateError)
        }
      } catch (e) {
        console.warn('Error updating avatar_url in User table:', e)
      }
      
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

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <p className="text-slate-300 text-sm">
                    {bio || 'Sin biografía'}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
                      {getTripLevel()} ({getTripCount()} viajes)
                    </span>
                    <span className="text-xs text-emerald-400">
                      ✓ DNI Verificado
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
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Contanos sobre vos..."
                      rows={4}
                      className="w-full mt-1 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                      style={{ resize: 'vertical' }}
                      maxLength={500}
                    />
                  ) : (
                    <p className="text-white mt-1">{bio || 'Sin biografía'}</p>
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

            {/* Estadísticas */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={20} />
                Tu fiabilidad al compartir coche
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-white">Nunca cancela reservas como pasajero</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-white">Perfil verificado</span>
                </div>
              </div>
            </div>
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
                  <span className="text-slate-400">></span>
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
                  <span className="text-slate-400">></span>
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
                <button className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left">
                  <span className="text-white">Exportar datos</span>
                </button>
                <button className="w-full p-4 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors text-left">
                  <span className="text-red-400">Eliminar cuenta</span>
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
    </div>
  )
}