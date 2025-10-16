import { useState, useEffect, useRef } from 'react'
import { Bell, MessageCircle, Users, CheckCircle, AlertCircle, X, Sparkles, Zap } from 'lucide-react'
import { supabase } from '@/services/supabase'
import ParticleSystem from './ParticleSystem'
import SoundWaves from './SoundWaves'

export default function FloatingNotificationPanel({ isOpen, onClose, onNavigate }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showEffects, setShowEffects] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const panelRef = useRef(null)

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

  // Cargar notificaciones iniciales
  const loadInitialNotifications = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      // Primero obtener las salas donde el usuario es miembro
      const { data: userRooms, error: roomsError } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', currentUser.id)

      if (roomsError) return

      const roomIds = userRooms?.map(r => r.room_id) || []
      if (roomIds.length === 0) {
        setLoading(false)
        return
      }

      // Buscar mensajes solo en las salas donde el usuario es miembro
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .gte('created_at', oneDayAgo)
        .in('room_id', roomIds)
        .neq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return

      if (messages && messages.length > 0) {
        const notifications = await Promise.all(messages.map(async (message) => {
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

        setNotifications(notifications)
        setUnreadCount(notifications.filter(n => !n.read).length)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Cargar notificaciones cuando se abre el panel
  useEffect(() => {
    if (isOpen && currentUser) {
      loadInitialNotifications()
    }
  }, [isOpen, currentUser])

  // Polling para verificar nuevos mensajes (solo para mensajes muy recientes)
  useEffect(() => {
    if (!currentUser || !isOpen) return

    const checkForNewMessages = async () => {
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        
        // Primero obtener las salas donde el usuario es miembro
        const { data: userRooms, error: roomsError } = await supabase
          .from('chat_members')
          .select('room_id')
          .eq('user_id', currentUser.id)

        if (roomsError) return

        const roomIds = userRooms?.map(r => r.room_id) || []
        if (roomIds.length === 0) return

        // Buscar mensajes solo en las salas donde el usuario es miembro
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .gte('created_at', tenMinutesAgo)
          .in('room_id', roomIds)
          .neq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(10)

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
  }, [currentUser, notifications, isOpen])

  // Activar efectos cuando hay notificaciones nuevas
  useEffect(() => {
    if (unreadCount > 0) {
      setShowEffects(true)
      setTimeout(() => setShowEffects(false), 3000)
    }
  }, [unreadCount])

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'chat_message':
        return <MessageCircle className="w-5 h-5 text-blue-400" />
      case 'trip_update':
        return <Users className="w-5 h-5 text-green-400" />
      case 'application_accepted':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'application_rejected':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Bell className="w-5 h-5 text-yellow-400" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'chat_message':
        return 'border-l-blue-400 bg-blue-400/5'
      case 'trip_update':
        return 'border-l-green-400 bg-green-400/5'
      case 'application_accepted':
        return 'border-l-emerald-400 bg-emerald-400/5'
      case 'application_rejected':
        return 'border-l-red-400 bg-red-400/5'
      default:
        return 'border-l-yellow-400 bg-yellow-400/5'
    }
  }

  // Marcar notificación como leída
  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  // Marcar todas como leídas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
    setUnreadCount(0)
  }

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
            onNavigate('/dashboard?tab=notifications')
        }
      }
      onClose()
    } catch (error) {
      console.error('Error handling notification click:', error)
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
      return date.toLocaleDateString()
    } catch {
      return 'Reciente'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay con efecto de cristal */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))'
        }}
      />
      
      {/* Panel principal */}
      <div 
        ref={panelRef}
        className="fixed top-16 right-4 w-96 max-h-[80vh] z-50"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Efectos de partículas y ondas */}
        <ParticleSystem 
          isActive={showEffects} 
          particleCount={15}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
          intensity={1.5}
        />
        <SoundWaves isActive={showEffects} intensity={1.2} />

        {/* Header con efectos */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-6 h-6 text-blue-400" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">Notificaciones</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <p className="text-gray-400 mt-2">Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400">No hay notificaciones</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`mb-2 p-4 rounded-lg border-l-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${getNotificationColor(notification.type)} ${
                    !notification.read ? 'bg-white/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    animation: `slideInUp 0.3s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {notification.title || 'Nueva notificación'}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {notification.message || notification.content || 'Sin descripción'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(notification.created_at)}
                        </span>
                        {notification.type === 'chat_message' && (
                          <div className="flex items-center gap-1 text-blue-400">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-xs">Chat</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={markAllAsRead}
              className="w-full py-2 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded-lg text-blue-400 text-sm font-medium transition-all duration-200 hover:scale-105"
            >
              Marcar todas como leídas
            </button>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `
      }} />
    </>
  )
}
