import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSession } from '../services/supabase'
import { Shield, AlertTriangle } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    checkVerification()
  }, [location.pathname])

  async function checkVerification() {
    try {
      setLoading(true)
      
      // Obtener sesión de Supabase
      const session = await getSession()
      const user = session?.user
      const meta = user?.user_metadata || {}

      // Verificar si hay JWT del backend
      const accessToken = localStorage.getItem('access_token')
      const decodeJwt = (token) => {
        try {
          const base64Url = token.split('.')[1]
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
          return JSON.parse(jsonPayload)
        } catch {
          return null
        }
      }
      const jwtPayload = accessToken ? decodeJwt(accessToken) : null

      // Verificar estado de verificación
      const localMeta = (() => {
        try {
          return JSON.parse(localStorage.getItem('dni_meta') || 'null')
        } catch {
          return null
        }
      })()

      const supaVerified = (
        meta?.dni_verified === true ||
        !!meta?.document_number ||
        !!meta?.dni ||
        localStorage.getItem('dni_verified') === 'true' ||
        localMeta?.dni_verified === true
      )

      const hasSupabase = !!user
      const hasBackendJwt = !!jwtPayload
      const verified = hasSupabase ? supaVerified : hasBackendJwt ? true : false

      setIsVerified(verified)

      if (!verified) {
        // Si no está verificado, mostrar modal
        setShowModal(true)
      }
    } catch (error) {
      console.error('Error verificando usuario:', error)
      setIsVerified(false)
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyClick = () => {
    navigate('/verify-dni')
  }

  const handleGoToProfile = () => {
    navigate('/profile')
  }

  const handleGoToLanding = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p>Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (!isVerified && showModal) {
    return (
      <>
        {/* Overlay oscuro */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Modal de verificación requerida */}
          <div className="bg-gradient-to-br from-red-900/90 to-red-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-8 border-2 border-red-500/50 animate-pulse-slow">
            <div className="flex flex-col items-center text-center">
              {/* Icono de alerta */}
              <div className="w-20 h-20 bg-red-500/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <AlertTriangle className="w-12 h-12 text-red-300" />
              </div>

              {/* Título */}
              <h2 className="text-3xl font-bold text-white mb-4">
                ⚠️ Verificación Requerida
              </h2>

              {/* Mensaje */}
              <p className="text-red-100 text-lg mb-6 leading-relaxed">
                Para acceder a esta funcionalidad, necesitas <strong>verificar tu identidad</strong> con tu DNI.
              </p>

              <div className="bg-red-950/50 rounded-lg p-4 mb-6 border border-red-500/30">
                <p className="text-red-200 text-sm">
                  🔒 Solo puedes acceder a:
                </p>
                <ul className="text-red-300 text-sm mt-2 space-y-1">
                  <li>• Página principal</li>
                  <li>• Tu perfil</li>
                </ul>
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleVerifyClick}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
                >
                  <Shield className="w-5 h-5" />
                  Verificar DNI Ahora
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleGoToLanding}
                    className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Ir al Inicio
                  </button>
                  <button
                    onClick={handleGoToProfile}
                    className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Ver mi Perfil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return children
}
