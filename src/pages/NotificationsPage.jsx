import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '@/services/supabase'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, Check, CheckCheck, Trash2, MessageCircle, Users, Calendar } from 'lucide-react'

export default function NotificationsPage() {
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

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
        navigate('/login', { replace: true })
        return
      } finally {
        if (mounted) setReady(true)
      }
    })()
    return () => { mounted = false }
  }, [navigate])

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification.id)
      }

      const data = notification.data || {}
      
      switch (notification.type) {
        case 'chat_message':
          if (data.room_id) {
            navigate(`/modern-chat?room=${data.room_id}`)
          }
          break
        case 'trip_invitation':
          if (data.trip_id) {
            navigate(`/trip/${data.trip_id}`)
          }
          break
        default:
          navigate('/modern-chat')
      }
    } catch (err) {
      console.error('Error handling notification click:', err)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Ahora'
      if (diffMins < 60) return `Hace ${diffMins}m`
      if (diffHours < 24) return `Hace ${diffHours}h`
      if (diffDays < 7) return `Hace ${diffDays}d`
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    } catch {
      return ''
    }
  }

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'chat_message':
        return notification.data?.is_group ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />
      case 'trip_invitation':
        return <Calendar className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm text-slate-400">Cargando notificaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-400 mt-1">
                  {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-600/30"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar todas como leídas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/50">
                <Bell className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">No hay notificaciones</h3>
              <p className="text-sm text-slate-400">
                Cuando tengas actividad nueva, aparecerá aquí
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all hover:border-emerald-500/30 ${
                    notification.read
                      ? 'border-slate-800 bg-slate-900/30'
                      : 'border-emerald-500/20 bg-emerald-950/10'
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    notification.read ? 'bg-slate-800/50 text-slate-400' : 'bg-emerald-600/20 text-emerald-400'
                  }`}>
                    {getNotificationIcon(notification)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium ${
                        notification.read ? 'text-slate-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      <span className="flex-shrink-0 text-xs text-slate-500">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${
                      notification.read ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-medium text-emerald-400">Nueva</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2 opacity-0 transition group-hover:opacity-100">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-600/20 hover:text-emerald-400"
                        title="Marcar como leída"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification?.(notification.id)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-600/20 hover:text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

