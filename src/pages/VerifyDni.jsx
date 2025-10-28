import Register from './Register.jsx'
import { useLocation } from 'react-router-dom'

export default function VerifyDni() {
  const location = useLocation()
  const search = location.search || ''
  const params = new URLSearchParams(search)
  const mode = params.get('mode') || 'email'
  const isGoogleFlow = mode === 'google'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-md shadow-2xl px-6 py-10 lg:px-16 lg:py-14">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="max-w-xl space-y-5 text-slate-200">
              <h2 className="text-3xl font-bold text-white">Verificación de identidad</h2>
              <p className="text-base text-slate-300">
                {isGoogleFlow
                  ? 'Necesitamos confirmar tu identidad para habilitar todas las funcionalidades después de iniciar sesión con Google.'
                  : 'Completá el siguiente formulario para verificar tu identidad y finalizar el proceso de registro.'}
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Subí fotos nítidas del frente y dorso de tu DNI.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Completá tus datos para verificar que coincidan con el documento.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  Aceptá los términos y condiciones para finalizar.
                </li>
              </ul>
            </div>

            <div className="embedded-register flex-1 rounded-2xl border border-slate-700/40 bg-slate-900/45 p-6 shadow-xl lg:p-8">
              <Register embedded />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


