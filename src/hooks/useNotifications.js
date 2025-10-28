import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabase'

// Hook personalizado para manejar notificaciones (funciona como el dashboard original)
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const deletedNotificationsRef = useRef(new Set())
  const processedMessageIdsRef = useRef(new Set())
  const readNotificationsRef = useRef(new Set())

  // Cargar notificaciones eliminadas y leídas del localStorage
  useEffect(() => {
    try {
      const deleted = localStorage.getItem('deletedNotifications')
      if (deleted) {
        deletedNotificationsRef.current = new Set(JSON.parse(deleted))
      }
      
      const read = localStorage.getItem('readNotifications')
      if (read) {
        readNotificationsRef.current = new Set(JSON.parse(read))
      }
    } catch (err) {
      console.error('Error loading notifications from localStorage:', err)
    }
  }, [])

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

  // Polling para verificar nuevos mensajes (solo de chats donde el usuario es miembro)
  useEffect(() => {
    if (!currentUser) return

    const checkForNewMessages = async () => {
      try {
        // Primero obtener los chats donde el usuario es miembro
        const { data: memberships, error: memberError } = await supabase
          .from('chat_members')
          .select('room_id')
          .eq('user_id', currentUser.id)

        if (memberError || !memberships || memberships.length === 0) return

        const userRoomIds = memberships.map(m => m.room_id)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        
        // Solo buscar mensajes en los chats donde el usuario es miembro
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select('*')
          .in('room_id', userRoomIds)
          .gte('created_at', tenMinutesAgo)
          .neq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error || !messages || messages.length === 0) return

        // Filtrar mensajes ya procesados, eliminados Y leídos
        const newMessages = messages.filter(m => 
          !processedMessageIdsRef.current.has(m.id) && 
          !deletedNotificationsRef.current.has(`msg_${m.id}`) &&
          !readNotificationsRef.current.has(`msg_${m.id}`)
        )

        if (newMessages.length === 0) return

        // Marcar inmediatamente como procesados para evitar duplicados
        newMessages.forEach(m => {
          processedMessageIdsRef.current.add(m.id)
        })

        // Cargar detalles de forma asíncrona
        const newNotifications = await Promise.all(newMessages.map(async (message) => {
          try {
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
              title,
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
          } catch (err) {
            console.error('Error loading message details:', err)
            return null
          }
        }))

        const validNotifications = newNotifications.filter(n => n !== null)
        if (validNotifications.length > 0) {
          setNotifications(prev => [...validNotifications, ...prev])
          setUnreadCount(prevCount => prevCount + validNotifications.length)
        }
      } catch (err) {
        console.error('Error en polling:', err)
      }
    }

    checkForNewMessages()
    const interval = setInterval(checkForNewMessages, 10000)

    return () => clearInterval(interval)
  }, [currentUser])

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId) => {
    // Agregar a la lista de leídas y guardar en localStorage
    readNotificationsRef.current.add(notificationId)
    try {
      localStorage.setItem(
        'readNotifications',
        JSON.stringify(Array.from(readNotificationsRef.current))
      )
    } catch (err) {
      console.error('Error saving read notification:', err)
    }

    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      // Agregar todas las notificaciones actuales a la lista de leídas
      prev.forEach(n => {
        readNotificationsRef.current.add(n.id)
      })
      
      try {
        localStorage.setItem(
          'readNotifications',
          JSON.stringify(Array.from(readNotificationsRef.current))
        )
      } catch (err) {
        console.error('Error saving read notifications:', err)
      }
      
      return prev.map(n => ({ ...n, read: true }))
    })
    setUnreadCount(0)
  }, [])

  // Eliminar notificación
  const deleteNotification = useCallback((notificationId) => {
    // Agregar a la lista de eliminadas y guardar en localStorage
    deletedNotificationsRef.current.add(notificationId)
    try {
      localStorage.setItem(
        'deletedNotifications',
        JSON.stringify(Array.from(deletedNotificationsRef.current))
      )
    } catch (err) {
      console.error('Error saving deleted notification:', err)
    }

    // Eliminar de la lista actual
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId)
      if (notification && !notification.read) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1))
      }
      return prev.filter(n => n.id !== notificationId)
    })
  }, [])

  // Marcar notificaciones de un chat como leídas (cuando entras al chat)
  const markRoomAsRead = useCallback((roomId) => {
    setNotifications(prev => {
      const roomNotifications = prev.filter(n => 
        !n.read && n.data?.room_id === roomId
      )
      
      if (roomNotifications.length === 0) return prev
      
      // Agregar a la lista de leídas
      roomNotifications.forEach(n => {
        readNotificationsRef.current.add(n.id)
      })
      
      try {
        localStorage.setItem(
          'readNotifications',
          JSON.stringify(Array.from(readNotificationsRef.current))
        )
      } catch (err) {
        console.error('Error saving read notifications:', err)
      }
      
      // Actualizar contador
      setUnreadCount(prevCount => Math.max(0, prevCount - roomNotifications.length))
      
      // Marcar como leídas
      return prev.map(n => 
        n.data?.room_id === roomId ? { ...n, read: true } : n
      )
    })
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    currentUser,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    markRoomAsRead
  }
}
