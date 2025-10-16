import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationCenter({ onNavigate }) {
  const [error, setError] = useState('')
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications()

  // Manejar clic en notificación
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        markAsRead(notification.id)
      }

      const data = notification.data || {}
      
      if (onNavigate) {
        switch (notification.type) {
          case 'chat_message':
            if (data.room_id) {
              onNavigate(`/dashboard?tab=chats&room=${data.room_id}`)
            }
            break
          default:
            onNavigate('/dashboard')
        }
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
      return date.toLocaleDateString('es-ES')
    } catch {
      return 'Fecha desconocida'
    }
  }

  const getNotificationIcon = (notification) => {
    if (notification.type === 'chat_message') {
      return notification.data?.is_group ? '👥' : '💬'
    }
    return '🔔'
  }

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Cargando notificaciones...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
          <div className="w-2 h-2 rounded-full bg-blue-500" title="Polling activo"></div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <>
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount} sin leer
              </span>
              <button
                onClick={markAllAsRead}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Marcar todas como leídas
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🔔</div>
            <p>No hay notificaciones</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-opacity-80 ${
                notification.read 
                  ? 'bg-gray-800/20 border-gray-700/30' 
                  : 'bg-blue-900/15 border-blue-600/30'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getNotificationIcon(notification)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                      {notification.data?.is_group ? (
                        <span className="flex items-center gap-2">
                          <span className="text-blue-400">👥</span>
                          <span>{notification.title}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="text-green-400">💬</span>
                          <span>{notification.title}</span>
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${notification.read ? 'text-gray-400' : 'text-gray-300'}`}>
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
