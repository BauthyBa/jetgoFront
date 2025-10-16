import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationCenter from '@/components/NotificationCenter'
import { getSession } from '@/services/supabase'

export default function NotificationsPage() {
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const session = await getSession()
        if (!session?.user && !localStorage.getItem('access_token')) {
          navigate('/login', { replace: true })
          return
        }
      } catch (_e) {
        // Si no se puede verificar, forzar login
        navigate('/login', { replace: true })
        return
      } finally {
        if (mounted) setReady(true)
      }
    })()
    return () => { mounted = false }
  }, [navigate])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Cargando tus notificaciones…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Notificaciones</h1>
          <p className="text-slate-300">
            Revisá la actividad más reciente relacionada a tus viajes y chats.
          </p>
        </header>
        <div className="flex justify-start">
          <NotificationCenter />
        </div>
      </div>
    </div>
  )
}

