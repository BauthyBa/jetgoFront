import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { updatePassword } from '@/services/api'
import { supabase } from '@/services/supabase'
import BackButton from '@/components/BackButton'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Verificar si hay una sesión válida para reset
  useEffect(() => {
    async function checkSession() {
      try {
        // Verificar si hay parámetros de recuperación en la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'recovery' && accessToken) {
          // Establecer la sesión con los tokens del email
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Error setting session:', error)
            setError('Enlace de recuperación inválido o expirado')
          } else {
            setValidSession(true)
          }
        } else {
          // Verificar sesión normal
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error checking session:', error)
            setError('Enlace de recuperación inválido o expirado')
          } else if (session) {
            setValidSession(true)
          } else {
            setError('Enlace de recuperación inválido o expirado')
          }
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Error al verificar el enlace de recuperación')
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Por favor ingresa una nueva contraseña')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await updatePassword(password)

      if (response.ok) {
        setSuccess(true)
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Contraseña actualizada exitosamente. Inicia sesión con tu nueva contraseña.' }
          })
        }, 3000)
      } else {
        setError(response.error || 'Error al actualizar la contraseña')
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-lg bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-10 border border-slate-700/50 transform scale-110">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-base">Verificando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-lg bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-10 border border-slate-700/50 transform scale-110">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">
              Enlace inválido
            </h2>
            <p className="text-slate-400 text-base mb-8">
              {error || 'El enlace de recuperación es inválido o ha expirado'}
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 text-base"
            >
              Solicitar nuevo enlace
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-lg bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-10 border border-slate-700/50 transform scale-110">
        {/* Botón de volver */}
        <div className="mb-6">
          <BackButton fallback="/login" variant="ghost" />
        </div>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">
            Nueva contraseña
          </h2>
          <p className="text-slate-400 text-base">
            Ingresa tu nueva contraseña para tu cuenta
          </p>
        </div>

        {success ? (
          /* Mensaje de éxito */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-white font-medium mb-2 text-xl">¡Contraseña actualizada!</h3>
            <p className="text-slate-400 text-base mb-4">
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <p className="text-blue-400 text-base">
              Redirigiendo al login...
            </p>
          </div>
        ) : (
          /* Formulario */
          <form className="space-y-7" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="password" className="block text-base font-medium text-slate-300">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-5 py-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="confirmPassword" className="block text-base font-medium text-slate-300">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-5 py-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Repite tu nueva contraseña"
              />
            </div>

            {/* Indicador de fortaleza de contraseña */}
            {password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className={password.length >= 6 ? 'text-green-400' : 'text-gray-400'}>
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${password === confirmPassword && confirmPassword ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className={password === confirmPassword && confirmPassword ? 'text-green-400' : 'text-gray-400'}>
                    Las contraseñas coinciden
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="w-full overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-900/40 to-red-800/30 shadow-lg shadow-red-900/30 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-5 w-5 text-red-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" className="opacity-40" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-200">{error}</p>
                    <p className="mt-1 text-xs text-red-300/80">Verificá los datos e intentá nuevamente.</p>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-red-500/70 via-red-400/70 to-red-500/70" />
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full py-4 px-5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>

            {/* Nota de seguridad */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                🔒 Tu nueva contraseña será encriptada y almacenada de forma segura
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
