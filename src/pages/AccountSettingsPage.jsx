import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, supabase } from '../services/supabase'
import { ArrowLeft, Bell, Shield, CreditCard, MapPin, Key, Download, Trash2, User, Mail, Phone, Globe } from 'lucide-react'
import Navigation from '../components/Navigation'

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('notifications')
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
          <p>Cargando configuración...</p>
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
              <h1 className="text-2xl font-bold text-white">Configuración de cuenta</h1>
              <p className="text-slate-300">Gestiona tu cuenta y preferencias</p>
            </div>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="glass-card p-1 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'notifications' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Bell size={18} />
              <span className="hidden sm:inline">Notificaciones</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'privacy' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Shield size={18} />
              <span className="hidden sm:inline">Privacidad</span>
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'payment' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <CreditCard size={18} />
              <span className="hidden sm:inline">Pagos</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === 'account' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User size={18} />
              <span className="hidden sm:inline">Cuenta</span>
            </button>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Bell size={20} />
                Preferencias de notificaciones
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Notificaciones por email</h3>
                    <p className="text-slate-400 text-sm">Recibe actualizaciones sobre tus viajes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Notificaciones push</h3>
                    <p className="text-slate-400 text-sm">Recibe notificaciones en tiempo real</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Recordatorios de viaje</h3>
                    <p className="text-slate-400 text-sm">Te avisamos antes de tus viajes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={20} />
                Configuración de privacidad
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Perfil público</h3>
                    <p className="text-slate-400 text-sm">Permite que otros usuarios vean tu perfil</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Mostrar ubicación</h3>
                    <p className="text-slate-400 text-sm">Comparte tu ubicación con otros usuarios</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Mostrar historial de viajes</h3>
                    <p className="text-slate-400 text-sm">Permite que otros vean tus viajes anteriores</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                Métodos de pago
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-emerald-400" size={20} />
                      <span className="text-white">No hay métodos de pago agregados</span>
                    </div>
                    <button className="btn">Agregar método</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Dirección postal
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-blue-400" size={20} />
                      <span className="text-white">No hay dirección registrada</span>
                    </div>
                    <button className="btn">Agregar dirección</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <User size={20} />
                Información de cuenta
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400">Email</label>
                    <p className="text-white">{profile?.email || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Usuario desde</label>
                    <p className="text-white">Enero 2024</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Key size={20} />
                Seguridad
              </h2>
              <div className="space-y-3">
                <button className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left">
                  <span className="text-white">Cambiar contraseña</span>
                </button>
                <button className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left">
                  <span className="text-white">Autenticación de dos factores</span>
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Download size={20} />
                Datos
              </h2>
              <div className="space-y-3">
                <button className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left">
                  <span className="text-white">Exportar mis datos</span>
                </button>
                <button className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left">
                  <span className="text-white">Descargar historial de viajes</span>
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Trash2 size={20} />
                Zona de peligro
              </h2>
              <div className="space-y-3">
                <button className="w-full p-4 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors text-left">
                  <span className="text-red-400">Eliminar cuenta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
