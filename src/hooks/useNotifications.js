import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'

// Hook personalizado para manejar notificaciones (funciona como el dashboard original)
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
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

  // Polling para verificar nuevos mensajes (igual que el dashboard original)
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
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
    setUnreadCount(0)
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    currentUser,
    markAsRead,
    markAllAsRead,
    loadNotifications
  }
}
