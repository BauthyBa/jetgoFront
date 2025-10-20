import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from '@/services/api'
import BackButton from '@/components/BackButton'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Por favor ingresa tu email')
      return
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await sendPasswordResetEmail(email.trim())

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(response.error || 'Error al enviar el email de recuperación')
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el email de recuperación')
    } finally {
      setLoading(false)
    }
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
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">¿Olvidaste tu contraseña?</h2>
          <p className="text-slate-400 text-base">
            Ingresa tu email y te enviaremos un enlace para recuperar tu cuenta
          </p>
        </div>

        {success ? (
          /* Mensaje de éxito */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-white font-medium mb-2 text-xl">Email enviado</h3>
            <p className="text-slate-400 text-base mb-6">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-400 text-sm">
                💡 Si no ves el email, revisa tu carpeta de spam
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-base font-medium transition-colors hover:underline"
            >
              ← Volver al login
            </Link>
          </div>
        ) : (
          /* Formulario */
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
                    <p className="mt-1 text-xs text-red-300/80">Verificá tu email e intentá nuevamente.</p>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-red-500/70 via-red-400/70 to-red-500/70" />
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        {/* Enlaces inferiores */}
        <p className="text-center text-base text-slate-400 mt-8">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}
