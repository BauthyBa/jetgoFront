import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../services/api'
import { signInWithGoogle } from '../services/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Mostrar mensaje de éxito si viene de reset password
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => setSuccessMessage(''), 5000)
    }
  }, [location.state])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const status = err?.response?.status
      const data = err?.response?.data
      if (status === 401) {
        setError('Usuario y/o contraseña inválidos')
      } else if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
        setError('Usuario y/o contraseña inválidos')
      } else {
        setError(data ? (typeof data === 'string' ? data : JSON.stringify(data)) : err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-lg bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-10 border border-slate-700/50 transform scale-110">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-3">Iniciar sesión</h2>
          <p className="text-slate-400 text-base">Accedé a tu cuenta</p>
        </div>
        
        <form className="space-y-7" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label htmlFor="email" className="block text-base font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="password" className="block text-base font-medium text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Enlace de olvidaste contraseña */}
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await signInWithGoogle('/')
              } catch (e) {
                setError(e.message)
              }
            }}
            className="w-full py-4 px-5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg shadow-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 flex items-center justify-center gap-3 text-base"
          >
            <img src="/google.svg" alt="Google" className="w-6 h-6" />
            Continuar con Google
          </button>

          {/* Mensaje de éxito */}
          {successMessage && (
            <div
              role="alert"
              className="mt-4 w-full overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-br from-green-900/40 to-green-800/30 shadow-lg shadow-green-900/30 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 border border-green-500/40">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-green-300"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-200">{successMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage('')}
                  className="rounded-md p-1 text-green-300/80 hover:text-green-200 hover:bg-green-500/10 transition-colors"
                  aria-label="Cerrar alerta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-green-500/70 via-green-400/70 to-green-500/70" />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 w-full overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-900/40 to-red-800/30 shadow-lg shadow-red-900/30 backdrop-blur-sm animate-[fadeIn_.2s_ease-out]"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="shrink-0">
                  {/* Circle with X icon */}
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
                  <p className="mt-1 text-xs text-red-300/80">Verificá tus datos e intentá nuevamente.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="rounded-md p-1 text-red-300/80 hover:text-red-200 hover:bg-red-500/10 transition-colors"
                  aria-label="Cerrar alerta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-1 w-full bg-gradient-to-r from-red-500/70 via-red-400/70 to-red-500/70" />
            </div>
          )}
        </form>

        <p className="text-center text-base text-slate-400 mt-8">
          ¿No tenés cuenta?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors">
            Registrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
