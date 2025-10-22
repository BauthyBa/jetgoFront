import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'

export default function EmailVerificationPrompt({ email, onClose }) {
  const [cooldown, setCooldown] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResendEmail = async () => {
    if (!canResend || cooldown > 0) return

    try {
      setLoading(true)
      setError('')
      setSuccessMessage('')

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: window.location.origin + '/login'
        }
      })

      if (resendError) {
        setError(resendError.message || 'Error al reenviar el email')
      } else {
        setSuccessMessage('¡Email reenviado exitosamente!')
        setCooldown(150) // 2:30 minutos
        setCanResend(false)
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (err) {
      setError(err.message || 'Error al reenviar el email')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Verifica tu email</h3>
          <p className="text-slate-400 text-sm">
            Te enviamos un email de verificación a:
          </p>
          <p className="text-emerald-400 font-semibold mt-2">{email}</p>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-400 text-sm mb-2">
            📌 Pasos a seguir:
          </p>
          <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
            <li>Revisa tu bandeja de entrada</li>
            <li>Haz clic en el enlace de verificación</li>
            <li>Inicia sesión en JetGo</li>
          </ol>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-4">
            <p className="text-emerald-400 text-sm text-center">✅ {successMessage}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm text-center">❌ {error}</p>
          </div>
        )}

        {/* Botón de reenvío con contador */}
        <div className="mb-6">
          {cooldown > 0 ? (
            <div className="text-center bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-2">
                Podrás reenviar el email en:
              </p>
              <p className="text-emerald-400 text-3xl font-bold font-mono">
                {formatTime(cooldown)}
              </p>
            </div>
          ) : (
            <button
              onClick={handleResendEmail}
              disabled={loading || !canResend}
              className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Reenviando...' : '📧 Reenviar email de verificación'}
            </button>
          )}
        </div>

        {/* Nota sobre spam */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
          <p className="text-yellow-400 text-xs text-center">
            💡 Si no ves el email, revisa tu carpeta de spam o correo no deseado
          </p>
        </div>

        {/* Botón de cerrar */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  )
}
