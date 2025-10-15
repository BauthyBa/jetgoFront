import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmojiPicker from '@/components/EmojiPicker'
import ChatExpenses from '@/components/ChatExpenses'
import ConnectionStatus from '@/components/ConnectionStatus'
import Navigation from '@/components/Navigation'
import { getSession, supabase, updateUserMetadata } from '@/services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages } from '@/services/chat'
import { listTrips as fetchTrips, leaveTrip } from '@/services/trips'
import { respondToApplication } from '@/services/applications'
import { api, upsertProfileToBackend } from '@/services/api'
import { inviteFriendToTrip } from '@/services/friends'
import InviteFriendsModal from '@/components/InviteFriendsModal'

function normalizeRoomName(room) {
  return (room?.display_name || room?.name || '').trim()
}

function isPrivateRoom(room) {
  return room?.is_private === true || !!room?.application_id
}

export default function ModernChatPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [userNames, setUserNames] = useState({})
  const [applicationStatuses, setApplicationStatuses] = useState({})
  const [applicationOrganizer, setApplicationOrganizer] = useState({})
  const [tripsBase, setTripsBase] = useState([])
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [roomQuery, setRoomQuery] = useState('')
  const [leavingId, setLeavingId] = useState(null)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [showInviteFriends, setShowInviteFriends] = useState(false)
  const fileInputRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const messageEndRef = useRef(null)
  const typingTimeoutRef = useRef({})

  useEffect(() => {
    let mounted = true
    async function loadSession() {
      try {
        const session = await getSession()
        const user = session?.user || null
        const meta = user?.user_metadata || {}

        const accessToken = localStorage.getItem('access_token')
        const decodeJwt = (token) => {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            )
            return JSON.parse(jsonPayload)
          } catch {
            return null
          }
        }
        const jwtPayload = accessToken ? decodeJwt(accessToken) : null

        const supaVerified = (
          meta?.dni_verified === true ||
          !!meta?.document_number ||
          !!meta?.dni ||
          localStorage.getItem('dni_verified') === 'true'
        )
        const hasSupabase = !!user
        const hasBackendJwt = !!jwtPayload
        const verified = hasSupabase ? supaVerified : hasBackendJwt ? true : false

        if (!verified) {
          navigate('/verify-dni')
          return
        }

        const localMeta = (() => {
          try {
            return JSON.parse(localStorage.getItem('dni_meta') || 'null')
          } catch {
            return null
          }
        })()
        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || jwtPayload?.user_id || jwtPayload?.sub || null,
          email: user?.email || jwtPayload?.email || null,
          expISO: null,
          meta: mergedMeta,
          dni_verified: verified,
        }

        if (user && (!meta?.document_number && localMeta?.document_number)) {
          try {
            await updateUserMetadata({ ...localMeta, dni_verified: true })
          } catch (e) {
            console.warn('No se pudo sincronizar metadata a Supabase:', e?.message || e)
          }
          try {
            await upsertProfileToBackend({
              user_id: user.id,
              email: info.email,
              ...localMeta,
            })
          } catch (e) {
            console.warn('No se pudo sincronizar perfil al backend:', e?.message || e)
          }
        }

        if (!mounted) return
        setProfile(info)

        if (info.user_id) {
          try {
            const loadedRooms = await listRoomsForUser(info.user_id)
            if (!mounted) return
            setRooms(loadedRooms)

            const search = new URLSearchParams(window.location.search)
            const roomParam = search.get('room')
            const tripParam = search.get('trip')
            const targetRoom = (() => {
              if (roomParam) return loadedRooms.find((x) => String(x.id) === String(roomParam))
              if (tripParam) return loadedRooms.find((x) => String(x.trip_id) === String(tripParam))
              return null
            })()
            if (targetRoom) {
              await openRoom(targetRoom, { silentHash: true })
            }
          } catch (roomsError) {
            console.warn('No se pudieron cargar salas:', roomsError?.message || roomsError)
          }
        }
      } catch (sessionError) {
        if (mounted) setError(sessionError?.message || 'Error al iniciar la sesión')
      }
    }

    loadSession()
    return () => {
      mounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (!profile?.user_id) return
    ;(async () => {
      try {
        const data = await fetchTrips()
        setTripsBase(data || [])
      } catch {
        setTripsBase([])
      }
    })()
  }, [profile?.user_id])

  useEffect(() => {
    return () => {
      try {
        if (unsubscribeRef.current) unsubscribeRef.current()
      } catch (_e) {}
    }
  }, [])

  useEffect(() => {
    if (!showExpenses) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showExpenses, activeRoomId])

  const filteredRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase()
    if (!query) return rooms
    return rooms.filter((room) => normalizeRoomName(room).toLowerCase().includes(query))
  }, [roomQuery, rooms])

  const tripRooms = useMemo(
    () => filteredRooms.filter((room) => !isPrivateRoom(room)),
    [filteredRooms],
  )

  const privateRooms = useMemo(
    () => filteredRooms.filter((room) => isPrivateRoom(room)),
    [filteredRooms],
  )

  async function resolveNamesForMessages(msgs) {
    try {
      const ids = Array.from(
        new Set(
          (msgs || [])
            .map((m) => m.user_id)
            .filter((id) => id && id !== profile?.user_id && !userNames[id]),
        ),
      )
      if (ids.length === 0) return
      const { data, error } = await supabase
        .from('User')
        .select('userid,nombre,apellido')
        .in('userid', ids)
      if (error) return
      const map = {}
      for (const row of data || []) {
        const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && full) map[row.userid] = full
      }
      if (Object.keys(map).length > 0) {
        setUserNames((prev) => ({ ...prev, ...map }))
      }
    } catch {
      // noop
    }
  }

  async function fetchNamesForUserIds(ids) {
    const unique = Array.from(new Set(ids.filter(Boolean)))
    if (unique.length === 0) return {}
    const { data, error } = await supabase
      .from('User')
      .select('userid,nombre,apellido')
      .in('userid', unique)
    if (error) return {}
    const map = {}
    for (const row of data || []) {
      const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
      if (row?.userid && full) map[row.userid] = full
    }
    return map
  }

  async function updateApplicationStatusesFromMessages(msgs) {
    try {
      const statusMap = {}
      const pendingIds = []
      for (const m of msgs || []) {
        const content = m?.content
        if (typeof content === 'string' && content.startsWith('APP_STATUS|')) {
          const [, id, st] = content.split('|')
          if (id && st) statusMap[String(id)] = String(st)
        } else if (typeof content === 'string' && content.startsWith('APP|')) {
          const [, id] = content.split('|')
          if (id) pendingIds.push(String(id))
        }
      }
      if (Object.keys(statusMap).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...statusMap }))
      }
      const uniqueIds = Array.from(new Set(pendingIds))
      if (uniqueIds.length === 0) return
      const { data, error } = await supabase
        .from('applications')
        .select('id,status')
        .in('id', uniqueIds)
      if (error) return
      const map = {}
      for (const row of data || []) {
        if (row?.id && row?.status) map[String(row.id)] = String(row.status)
      }
      if (Object.keys(map).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...map }))
      }
    } catch {
      // noop
    }
  }

  async function openRoom(room, { silentHash = false } = {}) {
    try {
      const roomId = room?.id
      if (!roomId) return

      setActiveRoomId(roomId)
      setActiveRoom(room || null)
      setShowExpenses(false)
      if (!silentHash) {
        window.history.replaceState({}, '', '/modern-chat')
      }

      const initialMessages = await fetchMessages(roomId)
      setMessages(initialMessages)
      await updateApplicationStatusesFromMessages(initialMessages)
      await resolveNamesForMessages(initialMessages)

      try {
        if (room?.application_id) {
          const { data: appRows } = await supabase
            .from('applications')
            .select('trip_id')
            .eq('id', room.application_id)
            .limit(1)
          const tripId = (appRows || [])[0]?.trip_id
          if (tripId) {
            const { data: tripRows } = await supabase
              .from('trips')
              .select('creator_id')
              .eq('id', tripId)
              .limit(1)
            const organizerId = (tripRows || [])[0]?.creator_id
            setApplicationOrganizer((prev) => ({
              ...prev,
              [room.application_id]: String(organizerId) === String(profile?.user_id),
            }))
          }
        }
      } catch (organizerError) {
        console.warn('No se pudo resolver el organizador:', organizerError?.message || organizerError)
      }

      try {
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
        }
      } catch (_e) {}

      const unsubscribe = subscribeToRoomMessages(roomId, (msg) => {
        setMessages((prev) => [...prev, msg])
        updateApplicationStatusesFromMessages([msg])
        resolveNamesForMessages([msg])
      })
      unsubscribeRef.current = unsubscribe
    } catch (e) {
      alert(e?.message || 'No se pudieron cargar los mensajes')
    }
  }

  async function handleSend() {
    try {
      if (!activeRoomId) return
      if (!newMessage.trim()) return
      await sendMessage(activeRoomId, newMessage)
      setNewMessage('')
      setShowEmojiPicker(false)
    } catch (e) {
      alert(e?.message || 'No se pudo enviar el mensaje')
    }
  }

  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files?.[0]
      if (!file || !activeRoomId || !profile?.user_id) return

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten imágenes, PDFs y documentos de texto.')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('room_id', activeRoomId)
      formData.append('user_id', profile.user_id)

      const response = await fetch('https://jetgoback.onrender.com/api/chat/upload-file/', {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error subiendo archivo')
      }

      const data = await response.json()
      if (data.status === 'success') {
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
      }
    } catch (uploadError) {
      console.error('Error uploading file:', uploadError)
      alert('Error subiendo archivo. Intenta nuevamente.')
    } finally {
      if (event.target) event.target.value = ''
    }
  }

  const getSenderLabel = (message) => {
    const uid = message?.user_id || ''
    if (profile?.user_id && uid === profile.user_id) return 'Tú'
    const name = userNames[uid]
    if (name) return name
    return 'Usuario'
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
    return '📎'
  }

  const activeRoomBadge = activeRoom
    ? isPrivateRoom(activeRoom)
      ? 'Privado'
      : activeRoom?.trip_id
        ? 'Viaje'
        : null
    : null

  const renderRoomCard = (room) => {
    const isActive = activeRoomId && String(activeRoomId) === String(room.id)
    const isPrivate = isPrivateRoom(room)
    
    return (
      <div
        key={room.id}
        className={`
          group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
          ${isActive 
            ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 shadow-lg shadow-emerald-500/20' 
            : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-600/60 hover:bg-slate-800/50'
          }
        `}
        onClick={() => openRoom(room)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={`
                  w-3 h-3 rounded-full
                  ${isPrivate ? 'bg-blue-400' : 'bg-emerald-400'}
                `} />
                <h3 className="font-semibold text-white truncate">
                  {normalizeRoomName(room) || 'Chat sin nombre'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                {isPrivate ? 'Conversación privada' : room.trip_id ? 'Chat de viaje' : 'Chat general'}
              </p>
              {room.trip_id && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg">
                  💰 Gastos compartidos
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className={`
                w-2 h-2 rounded-full
                ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}
              `} />
              {isActive && (
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        </div>
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    )
  }

  const hasRooms = (tripRooms.length + privateRooms.length) > 0

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <Navigation />
      <ConnectionStatus />
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(168,85,247,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 h-screen">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="mb-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  JetGo Chat
                </h1>
                <p className="text-sm text-slate-400 mt-2">
                  Conectá con tu equipo y organiza cada detalle
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  value={roomQuery}
                  onChange={(event) => setRoomQuery(event.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400/50"
                />
              </div>
            </div>

            {/* Rooms List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!hasRooms && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Todavía no tenés chats activos
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Unite a un viaje para empezar a conversar
                  </p>
                </div>
              )}

              {tripRooms.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                      Viajes
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                      {tripRooms.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tripRooms.map((room) => renderRoomCard(room))}
                  </div>
                </div>
              )}

              {privateRooms.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                      Privados
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
                      {privateRooms.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {privateRooms.map((room) => renderRoomCard(room))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-screen">
          {!activeRoomId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    ¡Bienvenido a JetGo Chat!
                  </h2>
                  <p className="text-slate-400 max-w-md">
                    Elegí una conversación para empezar a chatear con tu equipo y organizar todos los detalles del viaje.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Chats de viajes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Conversaciones privadas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {normalizeRoomName(activeRoom) || 'Chat'}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${activeRoomBadge === 'Privado' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-emerald-500/20 text-emerald-300'
                          }
                        `}>
                          {activeRoomBadge}
                        </span>
                        {typingUsers.size > 0 && (
                          <span className="text-xs text-slate-400 animate-pulse">
                            {Array.from(typingUsers).join(', ')} está escribiendo...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {activeRoom?.trip_id && (
                      <Button
                        variant={showExpenses ? 'default' : 'secondary'}
                        onClick={() => setShowExpenses((prev) => !prev)}
                        className="hidden sm:flex"
                      >
                        {showExpenses ? '💬 Chat' : '💰 Gastos'}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          if (isPrivateRoom(activeRoom)) {
                            const roomId = activeRoom?.id
                            if (!roomId) {
                              alert('Sala no válida')
                              return
                            }
                            const { data: membersRows } = await supabase
                              .from('chat_members')
                              .select('user_id')
                              .eq('room_id', roomId)
                            const ids = Array.from(
                              new Set((membersRows || []).map((m) => m.user_id).filter(Boolean)),
                            )
                            const nameMap = await fetchNamesForUserIds(ids)
                            const members = ids.map((id) => ({
                              user_id: id,
                              name:
                                profile?.user_id && id === profile.user_id
                                  ? profile?.meta?.first_name && profile?.meta?.last_name
                                    ? `${profile.meta.first_name} ${profile.meta.last_name}`
                                    : 'Tú'
                                  : nameMap[id] || 'Usuario',
                            }))
                            setChatMembers(members)
                            setChatInfoOpen(true)
                            return
                          }

                          const roomId = activeRoom?.id
                          if (!roomId) {
                            alert('No se pueden cargar integrantes: falta el room_id de la sala')
                            return
                          }
                          const response = await api.get('/chat-members/', { params: { room_id: roomId } })
                          if (response.data?.ok && response.data?.members) {
                            const members = response.data.members.map((member) => ({
                              user_id: member.user_id,
                              name: member.name || 'Usuario',
                            }))
                            setChatMembers(members)
                            setChatInfoOpen(true)
                          } else {
                            alert('No se pudieron cargar los integrantes')
                          }
                        } catch (membersError) {
                          console.error('Error en chat-members:', membersError)
                          if (membersError.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
                            alert('La petición fue bloqueada por el navegador. Revisá extensiones o adblockers.')
                          } else {
                            alert('No se pudieron cargar los integrantes.')
                          }
                        }
                      }}
                    >
                      👥 Integrantes
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 flex flex-col bg-slate-800/30 min-h-0">
                {showExpenses ? (
                  <div className="flex-1 overflow-hidden">
                    <ChatExpenses
                      tripId={activeRoom?.trip_id}
                      roomId={activeRoomId}
                      userId={profile?.user_id}
                      userNames={userNames}
                    />
                  </div>
                ) : (
                  <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                      <div className="max-w-4xl mx-auto space-y-4">
                        {messages.map((message) => {
                          const isOwn = profile?.user_id && String(message.user_id) === String(profile.user_id)
                          const isApplication = typeof message?.content === 'string' && message.content.startsWith('APP|')
                          const isApplicationStatus =
                            typeof message?.content === 'string' && message.content.startsWith('APP_STATUS|')
                          let applicationId = null
                          let displayContent = message?.content || ''
                          if (isApplication) {
                            const parts = displayContent.split('|')
                            applicationId = parts[1]
                            displayContent = parts.slice(2).join('|')
                          } else if (isApplicationStatus) {
                            displayContent = ''
                          }

                          return (
                            <div
                              key={message.id}
                              className={`
                                flex ${isOwn ? 'justify-end' : 'justify-start'}
                              `}
                            >
                              <div className={`
                                max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-3 shadow-lg
                                ${isOwn
                                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                  : 'bg-slate-700/80 backdrop-blur-sm text-slate-100'
                                }
                              `}>
                                <div className="text-xs font-medium opacity-70 mb-1">
                                  {getSenderLabel(message)}
                                </div>
                                
                                {message.is_file ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 text-sm font-semibold">
                                        <span>{getFileIcon(message.file_type)}</span>
                                        <span>{message.file_name}</span>
                                      </div>
                                      <span className="text-xs opacity-70">
                                        {formatFileSize(message.file_size)}
                                      </span>
                                    </div>
                                    {message.file_type?.startsWith('image/') ? (
                                      <a
                                        href={message.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl border border-white/10"
                                      >
                                        <img
                                          src={message.file_url}
                                          alt={message.file_name || 'Archivo de chat'}
                                          className="max-h-64 w-full object-cover"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={message.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
                                      >
                                        Descargar archivo
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  displayContent && (
                                    <div className="text-sm whitespace-pre-wrap break-words">
                                      {displayContent}
                                    </div>
                                  )
                                )}

                                {(() => {
                                  try {
                                    const isPrivate = isPrivateRoom(activeRoom)
                                    let isOrganizer = false
                                    if (isPrivate && activeRoom?.application_id) {
                                      const cached = applicationOrganizer[activeRoom.application_id]
                                      if (typeof cached === 'boolean') {
                                        isOrganizer = cached
                                      }
                                    }
                                    const status = applicationStatuses[applicationId]
                                    const isFinal = status === 'accepted' || status === 'rejected'
                                    if (isApplication && applicationId && isFinal) {
                                      return (
                                        <div
                                          className={`
                                            mt-3 text-sm font-semibold
                                            ${status === 'accepted' ? 'text-emerald-300' : 'text-red-300'}
                                          `}
                                        >
                                          {status === 'accepted'
                                            ? 'Esta solicitud ya fue aceptada.'
                                            : 'Esta solicitud ya fue rechazada.'}
                                        </div>
                                      )
                                    }
                                    if (isPrivate && isOrganizer && isApplication && applicationId && !isFinal) {
                                      return (
                                        <div className="mt-3 flex items-center justify-end gap-2">
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                await respondToApplication(applicationId, 'reject')
                                                setApplicationStatuses((prev) => ({
                                                  ...prev,
                                                  [applicationId]: 'rejected',
                                                }))
                                              } catch (actionError) {
                                                alert(
                                                  actionError?.response?.data?.error ||
                                                    actionError?.message ||
                                                    'No se pudo rechazar la solicitud',
                                                )
                                              }
                                            }}
                                          >
                                            Rechazar
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                await respondToApplication(applicationId, 'accept')
                                                setApplicationStatuses((prev) => ({
                                                  ...prev,
                                                  [applicationId]: 'accepted',
                                                }))
                                              } catch (actionError) {
                                                alert(
                                                  actionError?.response?.data?.error ||
                                                    actionError?.message ||
                                                    'No se pudo aceptar la solicitud',
                                                )
                                              }
                                            }}
                                          >
                                            Aceptar
                                          </Button>
                                        </div>
                                      )
                                    }
                                  } catch {
                                    return null
                                  }
                                  return null
                                })()}

                                <div className="mt-2 text-right text-xs opacity-60">
                                  {new Date(message.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {messages.length === 0 && (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <p className="text-slate-400 text-sm">
                              Aún no hay mensajes en este chat
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                              ¡Sé el primero en escribir algo!
                            </p>
                          </div>
                        )}
                        <div ref={messageEndRef} />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 p-4 flex-shrink-0">
                      <div className="max-w-4xl mx-auto">
                        <div className="flex items-end gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            className="shrink-0"
                          >
                            📎
                          </Button>
                          
                          <div className="flex-1 relative">
                            <Input
                              value={newMessage}
                              onChange={(event) => setNewMessage(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault()
                                  handleSend()
                                }
                              }}
                              placeholder="Escribí un mensaje..."
                              className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400/50 pr-12"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl hover:text-emerald-400 transition-colors"
                              onClick={() => setShowEmojiPicker((prev) => !prev)}
                              title="Agregar emoji"
                            >
                              😊
                            </button>
                            <EmojiPicker
                              isOpen={showEmojiPicker}
                              onClose={() => setShowEmojiPicker(false)}
                              onEmojiSelect={(emoji) => {
                                setNewMessage((prev) => prev + emoji)
                                setShowEmojiPicker(false)
                              }}
                            />
                          </div>
                          
                          <Button 
                            onClick={handleSend} 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-6"
                          >
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat Info Modal */}
      {chatInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {normalizeRoomName(activeRoom) || 'Integrantes'}
                </h3>
                <p className="text-sm text-slate-400">
                  Conocé quién está colaborando en este espacio.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setChatInfoOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-6 space-y-3 max-h-72 overflow-y-auto pr-1">
              {(chatMembers || []).length === 0 && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
                  No se pudieron cargar los integrantes o no hay datos para mostrar.
                </div>
              )}

              {(chatMembers || []).length > 0 &&
                chatMembers.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
                    onClick={() => {
                      try {
                        if (!member?.user_id) return
                        navigate(`/u/${member.user_id}`)
                        setChatInfoOpen(false)
                      } catch {
                        /* noop */
                      }
                    }}
                  >
                    <span className="font-semibold text-white">{member.name || 'Usuario'}</span>
                    <span className="text-sm text-slate-400">Ver perfil</span>
                  </button>
                ))}
            </div>

            {activeRoom?.trip_id && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">
                  ¿Querés salir del viaje? Podés hacerlo desde acá.
                </span>
                <div className="flex gap-2">
                  {(() => {
                    const isOwner = (tripsBase || []).some(
                      (trip) => String(trip.id) === String(activeRoom.trip_id) && trip.creatorId === profile?.user_id,
                    )
                    return isOwner ? (
                      <Button
                        variant="secondary"
                        onClick={() => setShowInviteFriends(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        👥 Invitar Amigos
                      </Button>
                    ) : null
                  })()}
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const tripId = activeRoom?.trip_id
                        if (!tripId || !profile?.user_id) return
                        const isOwner = (tripsBase || []).some(
                          (trip) => String(trip.id) === String(tripId) && trip.creatorId === profile.user_id,
                        )
                        const confirmMsg = isOwner
                          ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                          : '¿Seguro que querés abandonar este viaje?'
                        if (!confirm(confirmMsg)) return
                        setLeavingId(tripId)
                        const result = await leaveTrip(tripId, profile.user_id)
                        if (result?.ok !== false) {
                          setChatInfoOpen(false)
                          setActiveRoomId(null)
                          setActiveRoom(null)
                          setMessages([])
                          try {
                            const reloadedRooms = await listRoomsForUser(profile.user_id)
                            setRooms(reloadedRooms)
                          } catch (_reloadError) {}
                        } else {
                          alert(result?.error || 'No se pudo abandonar/eliminar el viaje')
                        }
                      } catch (leaveError) {
                        alert(leaveError?.message || 'Error al abandonar/eliminar')
                      } finally {
                        setLeavingId(null)
                      }
                    }}
                  >
                    {(() => {
                      const isOwner = activeRoom?.trip_id
                        && (tripsBase || []).some(
                          (trip) => String(trip.id) === String(activeRoom.trip_id) && trip.creatorId === profile?.user_id,
                        )
                      return leavingId === activeRoom?.trip_id
                        ? isOwner
                          ? 'Eliminando…'
                          : 'Saliendo…'
                        : isOwner
                          ? 'Eliminar viaje'
                          : 'Abandonar viaje'
                    })()}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteFriends && (
        <InviteFriendsModal
          isOpen={showInviteFriends}
          tripId={activeRoom?.trip_id}
          organizerId={profile?.user_id}
          tripTitle={activeRoom?.name || 'Viaje'}
          onClose={() => setShowInviteFriends(false)}
        />
      )}
    </div>
  )
}
