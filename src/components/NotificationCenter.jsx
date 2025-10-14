import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'

export default function NotificationCenter({ onNavigate }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  // Cargar usuario actual
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError('Error al obtener usuario')
        setLoading(false)
      }
    }
    
    getCurrentUser()
  }, [])

  // Marcar como no cargando cuando se establece el usuario
  useEffect(() => {
    if (currentUser) {
      setLoading(false)
    }
  }, [currentUser])

  // Polling para verificar nuevos mensajes
  useEffect(() => {
    if (!currentUser) return

    const checkForNewMessages = async () => {
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .gte('created_at', tenMinutesAgo)
          .neq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) return

        if (messages && messages.length > 0) {
          const existingIds = notifications.map(n => n.data?.message_id).filter(Boolean)
          const newMessages = messages.filter(m => !existingIds.includes(m.id))

          if (newMessages.length > 0) {
            const newNotifications = await Promise.all(newMessages.map(async (message) => {
              const { data: room } = await supabase
                .from('chat_rooms')
                .select('name, is_group')
                .eq('id', message.room_id)
                .single()
              
              const { data: sender } = await supabase
                .from('User')
                .select('nombre, apellido')
                .eq('userid', message.user_id)
                .single()
              
              const senderName = sender ? `${sender.nombre || ''} ${sender.apellido || ''}`.trim() : 'Usuario'
              const isGroup = room?.is_group || false
              const roomName = room?.name || 'Chat'
              
              let title, messageText
              if (isGroup) {
                title = `Mensaje en ${roomName}`
                messageText = `${senderName}: ${message.content?.substring(0, 50)}...`
              } else {
                title = `Mensaje de ${senderName}`
                messageText = `${message.content?.substring(0, 50)}...`
              }
              
              return {
                id: `msg_${message.id}`,
                type: 'chat_message',
                title: title,
                message: messageText,
                data: {
                  room_id: message.room_id,
                  sender_id: message.user_id,
                  message_id: message.id,
                  is_group: isGroup,
                  room_name: roomName,
                  sender_name: senderName
                },
                created_at: message.created_at,
                read: false
              }
            }))

            setNotifications(prev => [...newNotifications, ...prev])
            setUnreadCount(prev => prev + newNotifications.length)
          }
        }
      } catch (err) {
        console.error('Error en polling:', err)
      }
    }

    checkForNewMessages()
    const interval = setInterval(checkForNewMessages, 10000)

    return () => clearInterval(interval)
  }, [currentUser, notifications])

  // Marcar notificación como leída
  const handleMarkAsRead = async (notificationId) => {
    try {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  // Manejar clic en notificación
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await handleMarkAsRead(notification.id)
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
                onClick={handleMarkAllAsRead}
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
