import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmojiPicker from '@/components/EmojiPicker'
import ChatExpenses from '@/components/ChatExpenses'
import ConnectionStatus from '@/components/ConnectionStatus'
import AudioRecorder from '@/components/AudioRecorder'
import AudioTranscriber from '@/components/AudioTranscriber'
import CameraCapture from '@/components/CameraCapture'
import LocationCapture from '@/components/LocationCapture'
import SimpleLocationMap from '@/components/SimpleLocationMap'
import SharedPostPreview from '@/components/SharedPostPreview'
import { getSession, supabase, updateUserMetadata } from '@/services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages } from '@/services/chat'
import { listTrips as fetchTrips, leaveTrip } from '@/services/trips'
import { respondToApplication } from '@/services/applications'
import { api, upsertProfileToBackend } from '@/services/api'
import { inviteFriendToTrip } from '@/services/friends'
import InviteFriendsModal from '@/components/InviteFriendsModal'
import { transcriptionService } from '@/services/transcription'
import { getFeaturedImage } from '@/services/unsplash'
import { ArrowLeft, Camera, MapPin, Mic, MoreVertical, Paperclip, Search as SearchIcon, Smile } from 'lucide-react'

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
  const [tripImages, setTripImages] = useState({})
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [roomQuery, setRoomQuery] = useState('')
  const [leavingId, setLeavingId] = useState(null)
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [showInviteFriends, setShowInviteFriends] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [showAudioTranscriber, setShowAudioTranscriber] = useState(false)
  const [transcribingAudio, setTranscribingAudio] = useState(null)
  const [audioTranscriptions, setAudioTranscriptions] = useState({})
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showLocationCapture, setShowLocationCapture] = useState(false)
  const fileInputRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const messageEndRef = useRef(null)
  const typingTimeoutRef = useRef({})
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const displayName =
    profile?.meta?.first_name && profile?.meta?.last_name
      ? `${profile.meta.first_name} ${profile.meta.last_name}`
      : profile?.meta?.first_name
        ? profile.meta.first_name
        : profile?.email
          ? profile.email.split('@')[0]
          : 'Tu cuenta'

  const displayInitials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

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
    try {
      const isPrivate = isPrivateRoom(activeRoom)
      const appId = activeRoom?.application_id
      const tripId = activeRoom?.trip_id
      if (!isPrivate || !appId || !tripId) return
      const isOrganizer = applicationOrganizer[appId] === true
      if (!isOrganizer) return
      if (tripImages[tripId]) return
      const trip = (tripsBase || []).find((t) => String(t.id) === String(tripId))
      const destination = trip?.destination || trip?.to || ''
      if (!destination) return
      ;(async () => {
        const url = await getFeaturedImage(destination, { orientation: 'landscape', quality: 'regular' })
        if (url) setTripImages((prev) => ({ ...prev, [tripId]: url }))
      })()
    } catch {}
  }, [activeRoom?.trip_id, activeRoom?.application_id, applicationOrganizer, tripsBase])

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
      const filteredInitial = (initialMessages || []).filter((m) => {
        try {
          const c = m?.content
          const isStatus = typeof c === 'string' && c.startsWith('APP_STATUS|')
          const isEmptyText = !m?.is_file && (!c || !String(c).trim())
          return !isStatus && !isEmptyText
        } catch {
          return true
        }
      })
      setMessages(filteredInitial)
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
        try {
          const c = msg?.content
          const isStatus = typeof c === 'string' && c.startsWith('APP_STATUS|')
          const isEmptyText = !msg?.is_file && (!c || !String(c).trim())
          if (isStatus || isEmptyText) return
        } catch {}
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

  const confirmDeleteMessage = (messageId) => {
    setMessageToDelete(messageId)
    setShowDeleteMessageConfirm(true)
  }

  const deleteMessage = async () => {
    if (!messageToDelete) return

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageToDelete)
      
      if (error) throw error
      
      setMessages(prev => prev.filter(m => m.id !== messageToDelete))
      setShowDeleteMessageConfirm(false)
      setMessageToDelete(null)
    } catch (err) {
      console.error('Error al eliminar mensaje:', err)
      alert('Error al eliminar el mensaje')
      setShowDeleteMessageConfirm(false)
      setMessageToDelete(null)
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

  const handleCameraCapture = async (imageBlob) => {
    try {
      if (!imageBlob || !activeRoomId || !profile?.user_id) return

      console.log('📸 Camera capture debug:', {
        blobType: imageBlob.type,
        blobSize: imageBlob.size,
        roomId: activeRoomId,
        userId: profile.user_id
      })

      if (imageBlob.size > 10 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 10MB.')
        return
      }

      const endpoints = [
        'https://jetgoback.onrender.com/api/chat/upload-camera/',
        'https://jetgoback.onrender.com/api/chat/upload-file/',
      ]

      let lastError = null

      for (const endpoint of endpoints) {
        try {
          const formData = new FormData()
          formData.append('file', imageBlob, 'camera-photo.jpg')
          formData.append('room_id', activeRoomId)
          formData.append('user_id', profile.user_id)

          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            mode: 'cors',
          })

          const rawBody = await response.text()
          let parsedBody = null
          if (rawBody) {
            try {
              parsedBody = JSON.parse(rawBody)
            } catch (_parseErr) {
              parsedBody = rawBody
            }
          }

          if (!response.ok) {
            const message =
              (parsedBody && typeof parsedBody === 'object' && parsedBody !== null && (parsedBody.error || parsedBody.detail)) ||
              (typeof parsedBody === 'string' ? parsedBody : null) ||
              `Error HTTP ${response.status}`
            throw new Error(message)
          }

          const status =
            parsedBody && typeof parsedBody === 'object' && parsedBody !== null
              ? parsedBody.status
              : null

          if (status && status !== 'success') {
            const message =
              parsedBody.error ||
              parsedBody.message ||
              'Error subiendo imagen'
            throw new Error(message)
          }

          // El endpoint crea el mensaje; traemos los mensajes actualizados
          const updatedMessages = await fetchMessages(activeRoomId)
          setMessages(updatedMessages)
          return
        } catch (attemptError) {
          console.warn(`Camera upload failed via ${endpoint}`, attemptError)
          lastError = attemptError
        }
      }

      if (lastError) {
        throw lastError
      }
      throw new Error('Error subiendo imagen. Intenta nuevamente.')
    } catch (uploadError) {
      console.error('Error uploading camera image:', uploadError)
      alert(uploadError.message || 'Error subiendo imagen. Intenta nuevamente.')
    } finally {
      setShowCamera(false)
    }
  }

  const handleLocationSend = async (locationData) => {
    try {
      if (!activeRoomId || !profile?.user_id) return

      const messageContent = JSON.stringify({
        type: 'location',
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        timestamp: locationData.timestamp,
        isLive: locationData.isLive
      })

      await sendMessage(activeRoomId, messageContent, 'location')
      
      // Actualizar mensajes
      const updatedMessages = await fetchMessages(activeRoomId)
      setMessages(updatedMessages)
      
    } catch (error) {
      console.error('Error sending location:', error)
      alert('Error enviando ubicación. Intenta nuevamente.')
    } finally {
      setShowLocationCapture(false)
    }
  }

  const handleAudioRecorded = async (audioBlob) => {
    try {
      if (!activeRoomId || !profile?.user_id) return

      console.log('🎤 Uploading audio:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        roomId: activeRoomId,
        userId: profile.user_id
      })

      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('room_id', activeRoomId)
      formData.append('user_id', profile.user_id)

      const response = await fetch('https://jetgoback.onrender.com/api/chat/upload-file/', {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error subiendo audio')
      }

      const data = await response.json()
      if (data.status === 'success') {
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
        setShowAudioRecorder(false)
      }
    } catch (audioError) {
      console.error('Error uploading audio:', audioError)
      alert('Error subiendo audio. Intenta nuevamente.')
    }
  }

  const handleAudioCancel = () => {
    setShowAudioRecorder(false)
  }

  const handleTranscriptionComplete = async (transcript) => {
    try {
      if (!activeRoomId || !transcript.trim()) return
      
      console.log('📝 Sending transcription:', transcript)
      const saved = await sendMessage(activeRoomId, transcript)
      if (saved) {
        setShowAudioTranscriber(false)
        // Recargar mensajes para mostrar el nuevo mensaje
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
      }
    } catch (transcriptionError) {
      console.error('Error sending transcription:', transcriptionError)
      alert('Error enviando transcripción. Intenta nuevamente.')
    }
  }

  const handleTranscriptionCancel = () => {
    setShowAudioTranscriber(false)
  }

  const handleTranscribeAudio = async (messageId, audioUrl) => {
    try {
      setTranscribingAudio(messageId)
      console.log('🎙️ Transcribing audio:', { messageId, audioUrl })
      
      // Usar el servicio de transcripción moderno
      const transcription = await transcriptionService.transcribeAudio(audioUrl, 'es')
      
      if (transcription && transcription.trim()) {
        setAudioTranscriptions(prev => ({
          ...prev,
          [messageId]: transcription.trim()
        }))
        console.log('✅ Transcription completed:', transcription)
      } else {
        alert('No se pudo transcribir el audio. Intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Error transcribiendo el audio. Intenta nuevamente.')
    } finally {
      setTranscribingAudio(null)
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
    if (fileType?.startsWith('audio/')) return '🎵'
    return '📎'
  }

  const activeRoomBadge = activeRoom
    ? isPrivateRoom(activeRoom)
      ? 'Privado'
      : activeRoom?.trip_id
        ? 'Viaje'
        : null
    : null

  const openChatDetails = async () => {
    if (!activeRoom) return
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
        const ids = Array.from(new Set((membersRows || []).map((m) => m.user_id).filter(Boolean)))
        const nameMap = await fetchNamesForUserIds(ids)
        const members = ids
          .filter((id) => id !== profile?.user_id)
          .map((id) => ({
            user_id: id,
            name: nameMap[id] || 'Usuario',
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
  }

  const renderRoomCard = (room) => {
    const isActive = activeRoomId && String(activeRoomId) === String(room.id)
    const isPrivate = isPrivateRoom(room)
    const lastMessage = room?.last_message
    const subtitle = isPrivate
      ? 'Conversación privada'
      : room.trip_id
        ? 'Chat de viaje'
        : 'General'

    return (
      <button
        key={room.id}
        type="button"
        onClick={() => openRoom(room)}
        className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
          isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
        }`}
      >
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isPrivate ? 'bg-blue-500/20 text-blue-200' : 'bg-emerald-500/20 text-emerald-200'
          }`}
        >
          {(normalizeRoomName(room) || 'C')[0]?.toUpperCase() || 'C'}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">
              {normalizeRoomName(room) || 'Chat'}
            </span>
            <span className="text-[11px] text-slate-500">
              {room.last_message_at ? new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="truncate">{lastMessage || subtitle}</span>
            {room.unread_count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-emerald-950">
                {room.unread_count}
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  const hasRooms = (tripRooms.length + privateRooms.length) > 0

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#111b21]">
      <div className="flex items-center justify-between border-b border-[#202c33] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
            {displayInitials || 'U'}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-100">{displayName}</p>
            <p className="text-xs text-slate-400">Tus conversaciones</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-[#202c33] hover:text-emerald-400"
          aria-label="Alternar panel"
          title="Mostrar/ocultar lista de chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-[#202c33] px-4 py-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={roomQuery}
            onChange={(event) => setRoomQuery(event.target.value)}
            placeholder="Buscar un chat o viaje"
            className="w-full rounded-full border-0 bg-[#202c33] pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {!hasRooms && (
          <div className="px-4 py-12 text-center text-sm text-slate-400">
            <p className="font-medium text-slate-300">No tenés chats activos todavía.</p>
            <p className="mt-2 text-xs text-slate-500">
              Unite a un viaje o invita a tus contactos para empezar a conversar.
            </p>
          </div>
        )}

        {hasRooms && (
          <div className="flex flex-col gap-6">
            {tripRooms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2 text-xs uppercase tracking-widest text-slate-500">
                  <span>Viajes</span>
                  <span className="rounded-full bg-[#202c33] px-2 py-1 text-[10px] text-slate-400">{tripRooms.length}</span>
                </div>
                <div className="space-y-1.5">
                  {tripRooms.map((room) => renderRoomCard(room))}
                </div>
              </div>
            )}

            {privateRooms.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2 text-xs uppercase tracking-widest text-slate-500">
                  <span>Privados</span>
                  <span className="rounded-full bg-[#202c33] px-2 py-1 text-[10px] text-slate-400">{privateRooms.length}</span>
                </div>
                <div className="space-y-1.5">
                  {privateRooms.map((room) => renderRoomCard(room))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b141a] text-slate-100">
      <ConnectionStatus />

      <div className="flex h-full flex-1">
        {/* Sidebar (animated width) */}
        <div
          className={`flex h-full flex-col border-r bg-[#111b21] transition-[width] duration-300 ${
            sidebarOpen ? 'w-[340px] border-[#202c33]' : 'w-0 overflow-hidden border-transparent'
          }`}
        >
          {sidebarContent}
        </div>

        {/* Main Chat Area */}
        <div className="relative flex h-full flex-1 flex-col">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-3 top-24 z-10 inline-flex items-center gap-2 rounded-full bg-[#202c33] px-3 py-1.5 text-sm text-slate-200 shadow hover:text-emerald-400"
              aria-label="Abrir lista de chats"
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
              Chats
            </button>
          )}
          {!activeRoomId ? (
            <div className="flex flex-1 items-center justify-center bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[length:36px_36px]">
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                  <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-100">
                    ¡Bienvenido a JetGo Chat!
                  </h2>
                  <p className="max-w-md text-slate-400">
                    Elegí una conversación para empezar a chatear con tu equipo y organizar todos los detalles del viaje.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-2 uppercase tracking-widest">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Chats de viajes</span>
                  </div>
                  <div className="flex items-center gap-2 uppercase tracking-widest">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span>Conversaciones privadas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b border-[#202c33] bg-[#111b21]/90 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200 sm:flex">
                      {(normalizeRoomName(activeRoom) || 'C')[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      {isPrivateRoom(activeRoom) ? (
                        <button
                          onClick={async () => {
                            try {
                              console.log('Click en nombre del chat privado')
                              const roomId = activeRoom?.id
                              console.log('Room ID:', roomId)
                              if (!roomId) {
                                console.log('No hay room ID')
                                return
                              }
                              
                              // Para chats privados, consultar direct_conversations con las columnas correctas
                              const { data: directConvs, error } = await supabase
                                .from('direct_conversations')
                                .select('user_a, user_b')
                                .eq('room_id', roomId)
                              
                              console.log('Direct conversations query result:', directConvs)
                              console.log('Query error:', error)
                              
                              if (directConvs && directConvs.length > 0) {
                                const directConv = directConvs[0] // Tomar el primero
                                console.log('Direct conversation found:', directConv)
                                
                                // Encontrar el ID de la otra persona
                                const otherUserId = directConv.user_a === profile?.user_id 
                                  ? directConv.user_b 
                                  : directConv.user_a
                                
                                console.log('Other user ID:', otherUserId)
                                
                                if (otherUserId) {
                                  console.log('Navegando a:', `/u/${otherUserId}`)
                                  navigate(`/u/${otherUserId}`)
                                } else {
                                  console.log('No se encontró el ID de la otra persona')
                                }
                              } else {
                                console.log('No se encontraron conversaciones directas')
                              }
                            } catch (error) {
                              console.error('Error navigating to profile:', error)
                            }
                          }}
                          className="text-base font-semibold text-slate-100 transition-colors hover:text-emerald-300"
                        >
                          {normalizeRoomName(activeRoom) || 'Chat'}
                        </button>
                      ) : (
                        <h2 className="text-base font-semibold text-slate-100">
                          {normalizeRoomName(activeRoom) || 'Chat'}
                        </h2>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span className={`
                          inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium
                          ${activeRoomBadge === 'Privado' 
                            ? 'bg-[#1f2c33] text-blue-200'
                            : 'bg-[#1f2c33] text-emerald-200'
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
                  
                  <div className="flex items-center gap-1 md:gap-2">
                    {activeRoom?.trip_id && (
                      <Button
                        variant={showExpenses ? 'default' : 'ghost'}
                        size="sm"
                        className={`hidden rounded-full px-3 py-1.5 text-xs font-medium md:inline-flex ${
                          showExpenses
                            ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                            : 'bg-[#1f2c33] text-slate-200 hover:text-emerald-200'
                        }`}
                        onClick={() => setShowExpenses((prev) => !prev)}
                      >
                        {showExpenses ? 'Ver chat' : 'Ver gastos'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={openChatDetails}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-[#202c33] hover:text-emerald-200"
                      aria-label="Información del chat"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
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
                    <div className="flex-1 overflow-y-auto bg-[radial-gradient(#ffffff08_1px,transparent_1px)] bg-[length:34px_34px] px-4 py-6">
                      <div className="mx-auto flex max-w-3xl flex-col gap-3">
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
                                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`relative max-w-[68%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                                      isOwn ? 'bg-[#005c4b] text-white' : 'bg-[#202c33] text-slate-100'
                                    }`}
                                  >
                                    <div className={`mb-1 text-[11px] font-medium ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                                      {getSenderLabel(message)}
                                    </div>

                                {message.is_file ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 text-sm font-medium">
                                        <span>{getFileIcon(message.file_type)}</span>
                                        <span>{message.file_name}</span>
                                      </div>
                                      <span className={`text-[11px] ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                                        {formatFileSize(message.file_size)}
                                      </span>
                                    </div>
                                    {message.file_type?.startsWith('image/') ? (
                                      <a
                                        href={message.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-lg"
                                      >
                                        <img
                                          src={message.file_url}
                                          alt={message.file_name || 'Archivo de chat'}
                                          className="max-h-64 w-full object-cover"
                                        />
                                      </a>
                                    ) : message.file_type === 'shared_post' ? (
                                      // Preview de post compartido
                                      <div className="my-2">
                                        {(() => {
                                          try {
                                            const sharedPostData = JSON.parse(message.file_url)
                                            return <SharedPostPreview sharedPostData={sharedPostData} />
                                          } catch (e) {
                                            console.error('Error parsing shared post:', e)
                                            return (
                                              <div className="rounded-lg bg-[#1f2c33] p-3 text-sm text-slate-200">
                                                📱 Post compartido (error al cargar preview)
                                              </div>
                                            )
                                          }
                                        })()}
                                      </div>
                                    ) : message.file_type?.startsWith('audio/') ? (
                                      <div className="space-y-2">
                                        <audio
                                          controls
                                          className="w-full rounded-lg bg-white/5"
                                        >
                                          <source src={message.file_url} type={message.file_type} />
                                          Tu navegador no soporta el elemento de audio.
                                        </audio>
                                        
                                        {/* Transcripción del audio */}
                                        {audioTranscriptions[message.id] && (
                                          <div className="mt-2 rounded-lg border border-emerald-500/30 bg-[#1f2c33] p-3">
                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                                              <span>📝 Transcripción:</span>
                                            </div>
                                            <p className="text-sm text-slate-200">{audioTranscriptions[message.id]}</p>
                                          </div>
                                        )}
                                        
                                        {/* Nota informativa */}
                                        {!audioTranscriptions[message.id] && transcribingAudio !== message.id && (
                                          <div className="mt-1 text-xs text-slate-500">
                                            💡 Haz clic en "Transcribir" para convertir el audio a texto automáticamente (sin sonido)
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2">
                                          <a
                                            href={message.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
                                          >
                                            Descargar audio
                                          </a>
                                          
                                          {!audioTranscriptions[message.id] && (
                                            <button
                                              onClick={() => handleTranscribeAudio(message.id, message.file_url)}
                                              disabled={transcribingAudio === message.id}
                                              className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded border border-blue-400/30 hover:bg-blue-500/10"
                                            >
                                              {transcribingAudio === message.id ? (
                                                <>
                                                  <span className="animate-spin">⏳</span>
                                                  Escuchando...
                                                </>
                                              ) : (
                                                <>
                                                  🎙️ Transcribir
                                                </>
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </div>
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
                                ) : message.message_type === 'location' || (() => {
                                  try {
                                    const parsed = JSON.parse(message.content)
                                    return parsed.type === 'location'
                                  } catch {
                                    return false
                                  }
                                })() ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      try {
                                        console.log('🔍 DEBUGGING LOCATION MESSAGE:', message)
                                        const locationData = JSON.parse(message.content)
                                        console.log('📍 LOCATION DATA:', locationData)
                                        console.log('🗺️ RENDERING MAP WITH:', {
                                          latitude: locationData.latitude,
                                          longitude: locationData.longitude,
                                          address: locationData.address
                                        })
                                        return (
                                          <SimpleLocationMap
                                            latitude={locationData.latitude}
                                            longitude={locationData.longitude}
                                            address={locationData.address}
                                            timestamp={locationData.timestamp}
                                            isLive={locationData.isLive}
                                          />
                                        )
                                      } catch (e) {
                                        console.error('❌ Error parsing location data:', e)
                                        console.error('📄 Message content:', message.content)
                                        return (
                                          <div className="rounded-lg bg-[#1f2c33] p-3 text-sm text-slate-200">
                                            📍 Ubicación compartida (error al cargar)
                                          </div>
                                        )
                                      }
                                    })()}
                                  </div>
                                ) : (
                                  (() => {
                                    // Show applicant message; if organizer, remove inline 'Viaje:' header to avoid duplication
                                    let isOrganizer = false
                                    try {
                                      const isPrivate = isPrivateRoom(activeRoom)
                                      if (isPrivate && activeRoom?.application_id) {
                                        const cached = applicationOrganizer[activeRoom.application_id]
                                        if (typeof cached === 'boolean') isOrganizer = cached
                                      }
                                    } catch {}

                                    let finalContent = displayContent
                                    try {
                                      if (
                                        isOrganizer &&
                                        typeof finalContent === 'string' &&
                                        /^\[?Viaje:\s.*?/i.test(finalContent)
                                      ) {
                                        finalContent = finalContent.replace(/^\[?Viaje:\s.*?\]?\s*\n?\n?/i, '')
                                      }
                                    } catch {}

                                    return finalContent ? (
                                      <div className="text-sm whitespace-pre-wrap break-words">{finalContent}</div>
                                    ) : null
                                  })()
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
                                    
                                    // Verificar si el mensaje es del usuario actual (es el aplicante)
                                    const isOwnMessage = profile?.user_id && String(message.user_id) === String(profile.user_id)
                                    
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
                                    
                                    // Solo mostrar botones si:
                                    // 1. Es un chat privado
                                    // 2. Es el organizador del viaje
                                    // 3. Es una aplicación
                                    // 4. NO es el mensaje del usuario actual (no es el aplicante)
                                    // 5. No está finalizada
                                    if (isPrivate && isOrganizer && isApplication && applicationId && !isFinal && !isOwnMessage) {
                                      const tripId = activeRoom?.trip_id
                                      let tripName = 'Viaje'
                                      let route = ''
                                      try {
                                        if (tripId) {
                                          const trip = (tripsBase || []).find((t) => String(t.id) === String(tripId))
                                          if (trip) {
                                            tripName = trip?.name || 'Viaje'
                                            const origin = trip?.origin || trip?.from
                                            const destination = trip?.destination || trip?.to
                                            route = origin || destination ? ` • ${origin || '?' } → ${destination || '?'}` : ''
                                          }
                                        }
                                      } catch {}
                                      const applicant = getSenderLabel(message)
                                      return (
                                        <div className="mt-3 flex items-stretch gap-3">
                                          <div className="flex-1">
                                            <div className="text-[13px] italic text-slate-300">
                                              {`${applicant} te envió una solicitud a ${tripName}${route}`}
                                            </div>
                                            <div className="mt-2 flex items-center justify-end gap-2">
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
                                          </div>
                                          {tripId && tripImages[tripId] && (
                                            <div className="overflow-hidden rounded-lg border border-white/10 self-stretch">
                                              <img src={tripImages[tripId]} alt={tripName} className="h-full w-28 object-cover" loading="lazy" />
                                            </div>
                                          )}
                                        </div>
                                      )
                                    }
                                  } catch {
                                    return null
                                  }
                                  return null
                                })()}

                                <div className="mt-2 flex items-center justify-end gap-2 text-[10px]">
                                  <span className={isOwn ? 'text-white/70' : 'text-slate-400'}>
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isOwn && (
                                    <button
                                      onClick={() => confirmDeleteMessage(message.id)}
                                      className="ml-1 text-white/60 transition hover:text-rose-300"
                                      title="Eliminar mensaje"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {messages.length === 0 && (
                          <div className="py-10 text-center text-sm text-slate-400">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f2c33]">
                              <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <p className="font-medium text-slate-300">Aún no hay mensajes en este chat</p>
                            <p className="mt-1 text-xs text-slate-500">¡Sé el primero en escribir algo!</p>
                          </div>
                        )}
                        <div ref={messageEndRef} />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0 border-t border-[#202c33] bg-[#111b21]/90 px-4 py-4">
                      <div className="mx-auto flex max-w-3xl flex-col gap-3">
                        {showAudioRecorder && (
                          <div className="mb-4">
                            <AudioRecorder
                              onAudioRecorded={handleAudioRecorded}
                              onCancel={handleAudioCancel}
                            />
                          </div>
                        )}
                        {showAudioTranscriber && (
                          <div className="mb-4">
                            <AudioTranscriber
                              onTranscriptionComplete={handleTranscriptionComplete}
                              onCancel={handleTranscriptionCancel}
                            />
                          </div>
                        )}
                        <div className="flex items-end gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#202c33] text-slate-300 transition hover:bg-[#1f2c33] hover:text-emerald-200"
                            aria-label="Adjuntar archivo"
                          >
                            <Paperclip className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCamera(true)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#202c33] text-slate-300 transition hover:bg-[#1f2c33] hover:text-emerald-200"
                            aria-label="Tomar foto"
                          >
                            <Camera className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLocationCapture(true)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#202c33] text-slate-300 transition hover:bg-[#1f2c33] hover:text-emerald-200"
                            aria-label="Compartir ubicación"
                          >
                            <MapPin className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAudioRecorder(!showAudioRecorder)}
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                              showAudioRecorder
                                ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                                : 'bg-[#202c33] text-slate-300 hover:bg-[#1f2c33] hover:text-emerald-200'
                            }`}
                            aria-label="Grabar audio"
                          >
                            <Mic className="h-5 w-5" />
                          </button>
                          
                          <div className="relative flex-1">
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
                              className="w-full rounded-full border-0 bg-[#202c33] py-3 pl-5 pr-28 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                            />
                            <button
                              type="button"
                              className="absolute right-16 top-1/2 -translate-y-1/2 text-xl text-slate-300 transition hover:text-emerald-300"
                              onClick={() => setShowAudioTranscriber(!showAudioTranscriber)}
                              title="Transcribir voz"
                            >
                              🎙️
                            </button>
                            <button
                              type="button"
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-emerald-200"
                              onClick={() => setShowEmojiPicker((prev) => !prev)}
                              title="Agregar emoji"
                            >
                              <Smile className="h-5 w-5" />
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
                            className="h-11 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
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

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* Location Capture Modal */}
      {showLocationCapture && (
        <LocationCapture
          onLocationSend={handleLocationSend}
          onCancel={() => setShowLocationCapture(false)}
        />
      )}

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
                    const isGroupChat = activeRoom?.is_group === true
                    return isOwner && isGroupChat ? (
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

      {/* Modal de confirmación para eliminar mensaje */}
      {showDeleteMessageConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                  <span className="text-2xl">🗑️</span>
                </div>
                <h3 className="text-xl font-bold text-white">Eliminar Mensaje</h3>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-slate-300 text-base leading-relaxed">
                ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-slate-800/50 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteMessageConfirm(false)
                  setMessageToDelete(null)
                }}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteMessage}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span>🗑️</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
