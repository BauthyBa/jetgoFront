import { useEffect, useState } from 'react'
import { getSession, supabase, updateUserMetadata } from '../services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages, inviteByEmail } from '@/services/chat'
import { api } from '@/services/api'
import { listTrips as fetchTrips, joinTrip, leaveTrip } from '@/services/trips'
import { applyToTrip, respondToApplication, getUserApplications } from '@/services/applications'
import ApplyToTripModal from '@/components/ApplyToTripModal'
import TripFilters from '@/components/TripFilters'
import TripGrid from '@/components/TripGrid'
import DashboardLayout from '@/components/DashboardLayout'
import GlassCard from '@/components/GlassCard'
import ProfileCard from '@/components/ProfileCard'
import ChatsCard from '@/components/ChatsCard'
import NotificationCenter from '@/components/NotificationCenter'
import EmojiPicker from '@/components/EmojiPicker'
import MyTripHistory from '@/components/MyTripHistory'
import { upsertProfileToBackend } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CurrencySelect from '@/components/CurrencySelect'
import ChatExpenses from '@/components/ChatExpenses'
import AudioRecorder from '@/components/AudioRecorder'
import AudioMessage from '@/components/AudioMessage'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  
  const [trip, setTrip] = useState({
    name: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    roomType: '',
    season: '',
    country: '',
    maxParticipants: '',
    transportType: ''
  })
  const [tab, setTab] = useState('chats')
  const [tripsBase, setTripsBase] = useState([])
  const [trips, setTrips] = useState([])
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editTripModal, setEditTripModal] = useState({ open: false, data: null })
  const [joiningId, setJoiningId] = useState(null)
  const [leavingId, setLeavingId] = useState(null)
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [userNames, setUserNames] = useState({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [unsub, setUnsub] = useState(null)
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const budgetTrips = trips.filter((t) => t && (t.budgetMin != null || t.budgetMax != null))
  const section = (location.hash || '#inicio').replace('#', '')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joinDialog, setJoinDialog] = useState({ open: false, title: '', message: '' })
  const [applyModal, setApplyModal] = useState({ open: false, trip: null })
  const [applicationStatuses, setApplicationStatuses] = useState({})
  const [applicationOrganizer, setApplicationOrganizer] = useState({})
  const [userApplications, setUserApplications] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  
  // Log when showAudioRecorder changes
  useEffect(() => {
    console.log('🎤 showAudioRecorder changed to:', showAudioRecorder)
  }, [showAudioRecorder])

  // Autocomplete state for country and cities
  const [isoCountry, setIsoCountry] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countrySuggestions, setCountrySuggestions] = useState([])
  const [originQuery, setOriginQuery] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationQuery, setDestinationQuery] = useState('')
  const [destinationSuggestions, setDestinationSuggestions] = useState([])

  // Simple debounce helper
  function debounce(fn, delay) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), delay)
    }
  }

  // Fetch countries from Nominatim
  const fetchCountries = useState(() => debounce(async (q) => {
    try {
      if (!q || q.length < 3) { setCountrySuggestions([]); return }
      const url = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      setCountrySuggestions(Array.isArray(data) ? data : [])
    } catch { setCountrySuggestions([]) }
  }, 350))[0]

  // Fetch cities filtered by isoCountry
  const fetchCities = useState(() => debounce(async (q, which) => {
    try {
      if (!q || q.length < 3) {
        if (which === 'origin') setOriginSuggestions([])
        else setDestinationSuggestions([])
        return
      }
      let url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`
      if (isoCountry) url += `&countrycodes=${encodeURIComponent(isoCountry)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      if (which === 'origin') setOriginSuggestions(Array.isArray(data) ? data : [])
      else setDestinationSuggestions(Array.isArray(data) ? data : [])
    } catch {
      if (which === 'origin') setOriginSuggestions([])
      else setDestinationSuggestions([])
    }
  }, 350))[0]

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const session = await getSession()
        const user = session?.user || null
        const meta = user?.user_metadata || {}

        // Backend JWT (login por email)
        const accessToken = localStorage.getItem('access_token')
        const decodeJwt = (token) => {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
            return JSON.parse(jsonPayload)
          } catch {
            return null
          }
        }
        const jwtPayload = accessToken ? decodeJwt(accessToken) : null

        // Estrategia de verificación:
        // - Si hay sesión Supabase (Google), exigir meta.dni_verified o flag local
        // - Si NO hay sesión Supabase pero hay JWT del backend (login email), asumir verificado
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

        const localMeta = (() => { try { return JSON.parse(localStorage.getItem('dni_meta') || 'null') } catch { return null } })()
        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || jwtPayload?.user_id || jwtPayload?.sub || null,
          email: user?.email || jwtPayload?.email || null,
          expISO: null,
          meta: mergedMeta,
          dni_verified: verified,
        }

        // Si hay sesión de Supabase y el metadata aún no tiene DNI, pero local sí, sincronizar a Supabase
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

        if (mounted) setProfile(info)
        if (mounted && info.user_id) {
          try {
            const r = await listRoomsForUser(info.user_id)
            if (mounted) setRooms(r)
            // Deep-link: open chat from query param (?trip= or ?room=)
            try {
              const search = new URLSearchParams(window.location.search)
              const roomParam = search.get('room')
              const tripParam = search.get('trip')
              if (roomParam) {
                const room = (r || []).find((x) => String(x.id) === String(roomParam))
                if (room) await openRoom(room)
              } else if (tripParam) {
                const room = (r || []).find((x) => String(x.trip_id) === String(tripParam))
                if (room) await openRoom(room)
              }
            } catch {}
          } catch (e) {
            console.warn('No se pudieron cargar salas:', e?.message || e)
          }
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'Error al leer la sesión')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    // Load trips on mount to have data for Trips/Expenses sections
    loadTrips()
  }, [])

  useEffect(() => {
    // Load user applications when profile is loaded
    if (profile?.user_id) {
      loadUserApplications()
    }
  }, [profile?.user_id])


  useEffect(() => {
    // Scroll when the hash changes via router navigation
    const hash = location.hash || '#inicio'
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  useEffect(() => {
    return () => { if (unsub) try { unsub() } catch {} }
  }, [unsub])

  async function loadTrips() {
    try {
      const normalized = await fetchTrips()
      setTripsBase(normalized)
      setTrips(normalized)
    } catch (e) { /* noop */ }
  }

  async function loadUserApplications() {
    try {
      if (!profile?.user_id) {
        console.log('Profile not loaded yet, skipping applications load')
        return
      }
      const data = await getUserApplications(profile.user_id)
      setUserApplications(data || [])
    } catch (e) {
      console.error('Error loading user applications:', e)
    }
  }

  function hasUserAppliedToTrip(tripId) {
    return userApplications.some(app => 
      String(app.trip) === String(tripId) && 
      app.status === 'pending'
    )
  }

  // Scan messages and sync application statuses from Supabase
  async function updateApplicationStatusesFromMessages(msgs) {
    try {
      const statusMap = {}
      const ids = []
      for (const m of (msgs || [])) {
        const c = m?.content
        if (typeof c === 'string' && c.startsWith('APP_STATUS|')) {
          const parts = c.split('|')
          const id = parts[1]
          const st = parts[2]
          if (id && st) statusMap[String(id)] = String(st)
        } else if (typeof c === 'string' && c.startsWith('APP|')) {
          const id = c.split('|')[1]
          if (id) ids.push(String(id))
        }
      }
      if (Object.keys(statusMap).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...statusMap }))
      }
      const uniqueIds = Array.from(new Set(ids))
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
      if (Object.keys(map).length > 0) setApplicationStatuses((prev) => ({ ...prev, ...map }))
    } catch {}
  }

  // Open a room and load/subscribe messages
  const openRoom = async (room) => {
    try {
      const roomId = room?.id
      if (!roomId) return
      setActiveRoomId(roomId)
      setActiveRoom(room || null)
      setShowExpenses(false) // Reset expenses view when opening a new chat
      window.location.hash = '#chats'
      const initial = await fetchMessages(roomId)
      setMessages(initial)
      await updateApplicationStatusesFromMessages(initial)
      await resolveNamesForMessages(initial)
      // Pre-resolve organizer permission for application actions
      try {
        if (room?.application_id) {
          const { data: appRows } = await supabase.from('applications').select('trip_id').eq('id', room.application_id).limit(1)
          const tripId = (appRows || [])[0]?.trip_id
          if (tripId) {
            const { data: tripRows } = await supabase.from('trips').select('creator_id').eq('id', tripId).limit(1)
            const organizerId = (tripRows || [])[0]?.creator_id
            setApplicationOrganizer((prev) => ({ ...prev, [room.application_id]: String(organizerId) === String(profile?.user_id) }))
          }
        }
      } catch {}
      if (unsub) {
        try { unsub() } catch {}
      }
      const unsubscribe = subscribeToRoomMessages(roomId, (msg) => {
        setMessages((prev) => [...prev, msg])
        updateApplicationStatusesFromMessages([msg])
        resolveNamesForMessages([msg])
      })
      setUnsub(() => unsubscribe)
    } catch (e) {
      alert(e?.message || 'No se pudieron cargar los mensajes')
    }
  }

  // Send a message to the active room
  const handleSend = async () => {
    try {
      if (!activeRoomId || !newMessage.trim()) return
      const saved = await sendMessage(activeRoomId, newMessage)
      if (saved) setNewMessage('')
    } catch (e) {
      alert(e?.message || 'No se pudo enviar el mensaje')
    }
  }

  // Handle audio recording
  const handleAudioRecorded = async (audioBlob) => {
    try {
      console.log('🎤 handleAudioRecorded called with:', audioBlob)
      console.log('🎤 Blob type:', audioBlob.type)
      console.log('🎤 Blob size:', audioBlob.size)
      console.log('🎤 activeRoomId:', activeRoomId)
      console.log('🎤 profile.user_id:', profile?.user_id)
      
      if (!activeRoomId || !profile?.user_id) {
        console.log('🎤 Missing activeRoomId or profile.user_id')
        return
      }

      const formData = new FormData()
      // Crear un nuevo Blob con el tipo MIME correcto
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { 
        type: 'audio/webm;codecs=opus' 
      })
      formData.append('file', audioFile)
      formData.append('room_id', activeRoomId)
      formData.append('user_id', profile.user_id)
      
      console.log('🎤 FormData created, sending to backend...')
      console.log('🎤 AudioFile type:', audioFile.type)
      console.log('🎤 AudioFile name:', audioFile.name)

      const response = await fetch('http://localhost:8000/api/chat/upload-file/', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      })

      console.log('🎤 Backend response status:', response.status)
      console.log('🎤 Backend response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.log('🎤 Backend error:', errorData)
        throw new Error(errorData.error || 'Error subiendo audio')
      }

      const data = await response.json()
      console.log('🎤 Backend response data:', data)
      
      if (data.status === 'success') {
        console.log('🎤 Audio uploaded successfully, reloading messages...')
        // Recargar mensajes para mostrar el nuevo audio
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
        setShowAudioRecorder(false)
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
      alert('Error subiendo audio. Intenta nuevamente.')
    }
  }

  const getSenderLabel = (m) => {
    const uid = m?.user_id || ''
    if (profile?.user_id && uid === profile.user_id) return 'Tú'
    const name = userNames[uid]
    if (name) return name
    return 'Usuario'
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
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

  // Resolve and cache sender names from Supabase public.User by userid
  async function resolveNamesForMessages(msgs) {
    try {
      const ids = Array.from(new Set((msgs || []).map((m) => m.user_id).filter((id) => id && id !== profile?.user_id)))
      const missing = ids.filter((id) => !userNames[id])
      if (missing.length === 0) return
      const { data, error } = await supabase
        .from('User')
        .select('userid,nombre,apellido')
        .in('userid', missing)
      if (error) return
      const map = {}
      for (const row of data || []) {
        const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && full) map[row.userid] = full
      }
      if (Object.keys(map).length > 0) setUserNames((prev) => ({ ...prev, ...map }))
    } catch {}
  }

  async function fetchNamesForUserIds(ids) {
    const uniq = Array.from(new Set(ids.filter(Boolean)))
    if (uniq.length === 0) return {}
    const { data, error } = await supabase
      .from('User')
      .select('userid,nombre,apellido')
      .in('userid', uniq)
    if (error) return {}
    const map = {}
    for (const row of data || []) {
      const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
      if (row?.userid && full) map[row.userid] = full
    }
    return map
  }


  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 text-white" style={{ display: 'grid', gap: 16 }}>
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <>
            {section === 'inicio' && (
              <div id="inicio" style={{ marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
                  <div>
                <h1 style={{ fontSize: 32, fontWeight: 800 }}>
                  Bienvenido{profile?.meta?.first_name ? (
                    <span style={{ background: 'linear-gradient(135deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{`, ${profile.meta.first_name}`}</span>
                  ) : ''}
                </h1>
                <p className="muted">Aquí está tu resumen de viajes</p>
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                      <div className="glass-card" style={{ padding: 16, minHeight: 88, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Mis viajes</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{tripsBase.length}</div>
                  </div>
                      <div className="glass-card" style={{ padding: 16, minHeight: 88, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Chats</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{rooms.length}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut()
                        localStorage.removeItem('access_token')
                        navigate('/')
                      } catch (e) {
                        alert('No se pudo cerrar sesión')
                      }
                    }}
                  >
                    Cerrar sesión
                  </Button>
                    </div>
                  </div>
                  <NotificationCenter />
                </div>
              </div>
            )}

            {section === 'profile' && (
              <section id="profile">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <ProfileCard profile={profile} />
                </div>
              </section>
            )}

            {section === 'chats' && (
              <section id="chats" style={{ marginTop: 16 }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="glass-card lg:col-span-1" style={{ padding: 12, display: 'grid', gap: 12 }}>
                    <div>
                      <h3 className="page-title" style={{ color: '#60a5fa', marginBottom: 8 }}>Chats de Viajes</h3>
                      <ChatsCard
                        title="Chats de Viajes"
                        rooms={(rooms || []).filter((r) => !(r.is_private === true || r.application_id))}
                        onOpen={openRoom}
                      />
                    </div>
                    <div>
                      <h3 className="page-title" style={{ color: '#60a5fa', marginBottom: 8 }}>Chats privados</h3>
                      <ChatsCard
                        title="Chats privados"
                        rooms={(rooms || []).filter((r) => (r.is_private === true || r.application_id))}
                        onOpen={openRoom}
                      />
                    </div>
                  </div>
                  <div className="glass-card lg:col-span-2" style={{ padding: 12, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
                    {!activeRoomId && (
                      <p className="muted">Seleccioná un chat para comenzar</p>
                    )}
                    {activeRoomId && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div 
                              style={{ 
                                fontWeight: 700, 
                                fontSize: 16, 
                                cursor: activeRoom?.trip_id ? 'pointer' : 'default',
                                color: showExpenses ? '#60a5fa' : 'white',
                                textDecoration: showExpenses ? 'underline' : 'none'
                              }}
                              onClick={() => activeRoom?.trip_id && setShowExpenses(false)}
                            >
                              {activeRoom?.display_name || activeRoom?.name || 'Chat'}
                            </div>
                            {activeRoom?.trip_id && (
                              <button
                                className={`btn ${showExpenses ? 'btn' : 'btn secondary'}`}
                                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                                onClick={() => setShowExpenses(true)}
                              >
                                💰 Gastos
                              </button>
                            )}
                          </div>
                          <button
                              className="btn secondary"
                              style={{ height: 28, padding: '0 10px' }}
                              onClick={async () => {
                                try {
                                  // Chats privados: resolver miembros por room_id y mapear nombres
                                  if (activeRoom?.is_private || activeRoom?.application_id) {
                                    const roomId = activeRoom?.id
                                    if (!roomId) { alert('Sala no válida'); return }
                                    const { data: mems } = await supabase
                                      .from('chat_members')
                                      .select('user_id')
                                      .eq('room_id', roomId)
                                    const ids = Array.from(new Set((mems || []).map((m) => m.user_id).filter(Boolean)))
                                    const nameMap = await fetchNamesForUserIds(ids)
                                    const members = ids.map((id) => ({
                                      user_id: id,
                                      name: (profile?.user_id && id === profile.user_id)
                                        ? (profile?.meta?.first_name && profile?.meta?.last_name ? `${profile.meta.first_name} ${profile.meta.last_name}` : 'Tú')
                                        : (nameMap[id] || 'Usuario')
                                    }))
                                    setChatMembers(members)
                                    setChatInfoOpen(true)
                                    return
                                  }

                                  // Chats de viaje: cargar miembros desde backend (bypass RLS)
                                  const roomId = activeRoom?.id
                                  console.log('🔍 Frontend: roomId =', roomId)
                                  if (!roomId) {
                                    alert('No se pueden cargar integrantes: falta el room_id de la sala')
                                    return
                                  }
                                  
                                  // Cargar miembros desde backend
                                  console.log('🔍 Frontend: consultando backend para room_id =', roomId)
                                  const response = await api.get('/chat-members/', { params: { room_id: roomId } })
                                  console.log('🔍 Frontend: resultado del backend =', response.data)
                                  
                                  if (response.data?.ok && response.data?.members) {
                                    const members = response.data.members.map((m) => ({
                                      user_id: m.user_id,
                                      name: m.name || 'Usuario'
                                    }))
                                    setChatMembers(members)
                                    setChatInfoOpen(true)
                                  } else {
                                    console.warn('🔍 Frontend: respuesta inválida del backend')
                                    alert('No se pudieron cargar los integrantes')
                                  }
                                } catch (error) {
                                  console.error('🔍 Frontend: error en chat-members:', error)
                                  if (error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
                                    alert('Error: La petición fue bloqueada por el navegador. Verifica extensiones o adblockers.')
                                  } else {
                                    alert('No se pudieron cargar los integrantes: ' + error.message)
                                  }
                                }
                              }}
                            >
                              Ver información
                            </button>
                        </div>
                        {showExpenses ? (
                          <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                            <ChatExpenses
                              tripId={activeRoom?.trip_id}
                              roomId={activeRoomId}
                              userId={profile?.user_id}
                              userNames={userNames}
                            />
                          </div>
                        ) : (
                          <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {messages.map((m) => {
                              const isApp = typeof m?.content === 'string' && m.content.startsWith('APP|')
                              const isAppStatus = typeof m?.content === 'string' && m.content.startsWith('APP_STATUS|')
                              let applicationId = null
                              let displayContent = m?.content || ''
                              if (isApp) {
                                const parts = displayContent.split('|')
                                applicationId = parts[1]
                                displayContent = parts.slice(2).join('|')
                              } else if (isAppStatus) {
                                // Render-only; actual status sync happens in updateApplicationStatusesFromMessages
                                displayContent = ''
                              }
                              return (
                                <div key={m.id} className="glass-card" style={{ padding: 8 }}>
                                  {m.is_file && m.file_type?.startsWith('audio/') ? (
                                    <AudioMessage
                                      message={m}
                                      isOwn={profile?.user_id === m.user_id}
                                      senderName={getSenderLabel(m)}
                                    />
                                  ) : (
                                    <>
                                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{getSenderLabel(m)}</div>
                                      {m.is_file ? (
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span>{getFileIcon(m.file_type)}</span>
                                        <span style={{ fontWeight: '600' }}>{m.file_name}</span>
                                      </div>
                                      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                                        {formatFileSize(m.file_size)} • {m.file_type}
                                      </div>
                                      {m.file_type?.startsWith('image/') ? (
                                        <img
                                          src={m.file_url}
                                          alt={m.file_name}
                                          style={{
                                            maxWidth: '200px',
                                            maxHeight: '200px',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                          }}
                                          onClick={() => window.open(m.file_url, '_blank')}
                                        />
                                      ) : (
                                        <a
                                          href={m.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: '#60a5fa',
                                            textDecoration: 'none',
                                            display: 'inline-block',
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            border: '1px solid rgba(96, 165, 250, 0.3)'
                                          }}
                                        >
                                          📥 Descargar archivo
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    displayContent && <div style={{ fontSize: 13 }}>{displayContent}</div>
                                  )}
                                    </>
                                  )}
                                  {(() => {
                                    try {
                                      const isPrivate = !!(activeRoom?.is_private || activeRoom?.application_id)
                                      let isOrganizer = false
                                      if (isPrivate && activeRoom?.application_id) {
                                        try {
                                          const cached = applicationOrganizer[activeRoom.application_id]
                                          if (typeof cached === 'boolean') {
                                            isOrganizer = cached
                                          } else {
                                            // Resolve without await in render: pre-resolve organizer in effect on open
                                            isOrganizer = false
                                          }
                                        } catch {}
                                      }
                                      const status = applicationStatuses[applicationId]
                                      const isFinal = status === 'accepted' || status === 'rejected'
                                      if (isApp && applicationId && isFinal) {
                                        return (
                                          <div style={{ marginTop: 8, fontWeight: 600, color: status === 'accepted' ? '#22c55e' : '#ef4444' }}>
                                            {status === 'accepted' ? 'Ya se ha aceptado la solicitud' : 'Ya se ha rechazado la solicitud'}
                                          </div>
                                        )
                                      }
                                      if (isPrivate && isOrganizer && isApp && applicationId && !isFinal) {
                                        return (
                                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <button
                                              className="btn"
                                              style={{ height: 32, padding: '0 10px', background: '#ef4444' }}
                                              onClick={async () => {
                                                try { await respondToApplication(applicationId, 'reject'); setApplicationStatuses((prev) => ({ ...prev, [applicationId]: 'rejected' })) } catch (e) { alert(e?.response?.data?.error || e?.message || 'No se pudo rechazar') }
                                              }}
                                            >
                                              Rechazar
                                            </button>
                                            <button
                                              className="btn"
                                              style={{ height: 32, padding: '0 10px', background: '#22c55e' }}
                                              onClick={async () => {
                                                try { await respondToApplication(applicationId, 'accept'); setApplicationStatuses((prev) => ({ ...prev, [applicationId]: 'accepted' })) } catch (e) { alert(e?.response?.data?.error || e?.message || 'No se pudo aceptar') }
                                              }}
                                            >
                                              Aceptar
                                            </button>
                                          </div>
                                        )
                                      }
                                    } catch {}
                                    return null
                                  })()}
                                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                              )
                            })}
                              {messages.length === 0 && <p className="muted">No hay mensajes aún.</p>}
                            </div>
                          </div>
                        )}
                        {!showExpenses && (
                          <>
                            {showAudioRecorder && (
                              <>
                                {console.log('🎤 RENDERING AudioRecorder component')}
                                <AudioRecorder
                                  onAudioRecorded={handleAudioRecorded}
                                  onCancel={() => setShowAudioRecorder(false)}
                                />
                              </>
                            )}
                            {!showAudioRecorder && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', position: 'relative' }}>
                          <input
                            type="file"
                            id="chat-file-input"
                            style={{ display: 'none' }}
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                            onChange={async (e) => {
                              const file = e.target.files[0]
                              if (!file) return
                              
                              // Validar tipo de archivo
                              const allowedTypes = [
                                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                                'application/pdf', 'text/plain',
                                'application/msword',
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                              ]
                              
                              if (!allowedTypes.includes(file.type)) {
                                alert('Tipo de archivo no permitido. Solo se permiten imágenes, PDFs y documentos de texto.')
                                return
                              }
                              
                              // Validar tamaño (10MB)
                              if (file.size > 10 * 1024 * 1024) {
                                alert('El archivo es demasiado grande. Máximo 10MB.')
                                return
                              }
                              
                              try {
                                const formData = new FormData()
                                formData.append('file', file)
                                formData.append('room_id', activeRoomId)
                                formData.append('user_id', profile?.user_id)
                                
                                console.log('Subiendo archivo:', {
                                  fileName: file.name,
                                  fileSize: file.size,
                                  fileType: file.type,
                                  roomId: activeRoomId,
                                  userId: profile?.user_id
                                })
                                
                                // Usar fetch directamente para subir archivo y crear mensaje en una sola operación
                                const response = await fetch('http://localhost:8000/api/chat/upload-file/', {
                                  method: 'POST',
                                  body: formData,
                                  mode: 'cors'
                                })
                                
                                if (!response.ok) {
                                  const errorData = await response.json()
                                  throw new Error(errorData.error || 'Error subiendo archivo')
                                }
                                
                                const data = await response.json()
                                console.log('Respuesta del servidor:', data)
                                
                                if (data.status === 'success') {
                                  // Recargar mensajes para mostrar el nuevo archivo
                                  const updatedMessages = await fetchMessages(activeRoomId)
                                  setMessages(updatedMessages)
                                }
                              } catch (error) {
                                console.error('Error uploading file:', error)
                                alert('Error subiendo archivo. Intenta nuevamente.')
                              } finally {
                                e.target.value = ''
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              console.log('🎤 MICROPHONE BUTTON CLICKED!')
                              console.log('🎤 Current showAudioRecorder:', showAudioRecorder)
                              setShowAudioRecorder(!showAudioRecorder)
                              console.log('🎤 New showAudioRecorder will be:', !showAudioRecorder)
                            }}
                            style={{
                              background: showAudioRecorder ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '16px'
                            }}
                            title={showAudioRecorder ? 'Cancelar grabación' : 'Grabar audio'}
                          >
                            🎤
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById('chat-file-input')?.click()}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '16px'
                            }}
                            title="Subir archivo"
                          >
                            📎
                          </button>
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              try {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend()
                                }
                              } catch {}
                            }}
                            placeholder="Escribí un mensaje..."
                            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontSize: 24,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: 6,
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#334155'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Agregar emoji"
                          >
                            😊
                          </button>
                          <Button onClick={handleSend}>Enviar</Button>
                          <EmojiPicker
                            isOpen={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onEmojiSelect={(emoji) => {
                              setNewMessage(prev => prev + emoji)
                              setShowEmojiPicker(false)
                            }}
                          />
                            </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {section === 'trips' && (
              <section id="trips" className="glass-card" style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <h3 className="page-title" style={{ color: '#60a5fa', margin: 0, textAlign: 'center' }}>
                    {showMineOnly ? 'Mis Viajes' : 'Viajes Disponibles'}
                  </h3>
                </div>
                <div style={{ marginTop: 12 }}>
                  {trips.length === 0 && <p className="muted" style={{ marginTop: 12, textAlign: 'center' }}>No hay viajes que coincidan.</p>}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Botones del lado izquierdo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 'fit-content' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowMineOnly(false)
                          setTrips(tripsBase || [])
                          setVisibleCount(6)
                        }}
                      >
                        Viajes disponibles
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const mine = (tripsBase || []).filter((t) => t.creatorId && t.creatorId === profile?.user_id)
                          setTrips(mine)
                          setShowMineOnly(true)
                          setVisibleCount(6)
                        }}
                      >
                        Mis viajes
                      </Button>
                    </div>
                    
                    {/* Grid de viajes */}
                    <div style={{ flex: 1 }}>
                      <TripGrid
                        trips={(showMineOnly ? trips : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id))).slice(0, visibleCount)}
                        joiningId={joiningId}
                        leavingId={leavingId}
                        onJoin={async (t) => {
                          // Deprecated join path; use apply flow instead
                          setApplyModal({ open: true, trip: t })
                        }}
                        onApply={(t) => setApplyModal({ open: true, trip: t })}
                        onLeave={async (t) => {
                          try {
                            if (!profile?.user_id) throw new Error('Sin usuario')
                            const confirmMsg = (t.creatorId && t.creatorId === profile.user_id)
                              ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                              : '¿Seguro que querés abandonar este viaje?'
                            if (!confirm(confirmMsg)) return
                            setLeavingId(t.id)
                            const data = await leaveTrip(t.id, profile.user_id)
                            if (data?.ok !== false) {
                              await loadTrips()
                              // refrescar salas de chat por si cambió membresía o se eliminó
                              try { const r = await listRoomsForUser(profile.user_id); setRooms(r) } catch {}
                              setJoinDialog({ open: true, title: (t.creatorId && t.creatorId === profile.user_id) ? 'Viaje eliminado' : 'Saliste del viaje', message: (t.creatorId && t.creatorId === profile.user_id) ? 'Se eliminó el viaje y su chat.' : 'Ya no sos parte del viaje.' })
                            } else {
                              alert(data?.error || 'No se pudo abandonar/eliminar el viaje')
                            }
                          } catch (e) {
                            alert(e?.message || 'Error al abandonar/eliminar')
                          } finally {
                            setLeavingId(null)
                          }
                        }}
                        onEdit={(t) => { setEditTripModal({ open: true, data: t }) }}
                        canEdit={(t) => t.creatorId && t.creatorId === profile?.user_id}
                        isMemberFn={(t) => {
                          try {
                            return Array.isArray(rooms) && rooms.some((r) => (
                              String(r?.trip_id) === String(t.id) && (r?.is_group === true || (!r?.is_private && !r?.application_id))
                            ))
                          } catch { return false }
                        }}
                        isOwnerFn={(t) => t.creatorId && t.creatorId === profile?.user_id}
                        hasAppliedFn={(t) => hasUserAppliedToTrip(t.id)}
                      />
                    </div>
                    
                    {/* Botones del lado derecho */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 'fit-content' }}>
                      <Button variant="secondary" onClick={() => { setShowMineOnly(false); setFiltersOpen(true) }}>Filtrar</Button>
                      <Button onClick={() => setShowCreateModal(true)} className="btn sky">Crear viaje</Button>
                    </div>
                  </div>
                  {(() => { const list = showMineOnly ? trips : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id)); return list.length > 0 })() && visibleCount < (showMineOnly ? trips.length : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id))).length && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                          <Button onClick={() => setVisibleCount((v) => v + 6)}>Cargar más</Button>
                    </div>
                  )}
                </div>
              </section>
            )}

          </>
        )}
      </div>

      {showCreateModal && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="createTripTitle">
          <div className="overlay-box" style={{ maxWidth: 1000, width: '95%' }}>
            <h3 id="createTripTitle" className="page-title" style={{ margin: 0, color: '#60a5fa' }}>Crear viaje</h3>
            <div className="glass-card" style={{ padding: 16, marginTop: 8, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
                <div className="field">
                  <label>Nombre</label>
                  <input value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} placeholder="Ej: Bariloche 2025" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>Origen</label>
                  <input
                    value={trip.origin}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, origin: v })
                      setOriginQuery(v)
                      fetchCities(v, 'origin')
                    }}
                    placeholder="Ciudad de origen"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {originSuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {originSuggestions.map((item, idx) => (
                        <li
                          key={`o_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            setTrip((t) => ({ ...t, origin: item.display_name }))
                            setOriginQuery(item.display_name)
                            setOriginSuggestions([])
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setTrip((t) => ({ ...t, origin: item.display_name })); setOriginSuggestions([]) } }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>Destino</label>
                  <input
                    value={trip.destination}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, destination: v })
                      setDestinationQuery(v)
                      fetchCities(v, 'destination')
                    }}
                    placeholder="Ciudad de destino"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {destinationSuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {destinationSuggestions.map((item, idx) => (
                        <li
                          key={`d_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            setTrip((t) => ({ ...t, destination: item.display_name }))
                            setDestinationQuery(item.display_name)
                            setDestinationSuggestions([])
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setTrip((t) => ({ ...t, destination: item.display_name })); setDestinationSuggestions([]) } }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="field">
                  <label>Desde</label>
                  <input type="date" value={trip.startDate} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} min={new Date().toISOString().split('T')[0]} style={{ color: '#e5e7eb', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input type="date" value={trip.endDate} onChange={(e) => setTrip({ ...trip, endDate: e.target.value })} min={new Date().toISOString().split('T')[0]} style={{ color: '#e5e7eb', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="field">
                  <label>Cantidad de personas (máx.)</label>
                  <input type="number" inputMode="numeric" value={trip.maxParticipants} onChange={(e) => setTrip({ ...trip, maxParticipants: e.target.value })} placeholder="2" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field">
                  <label>Presupuesto mín.</label>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    value={trip.budgetMin} 
                    onChange={(e) => setTrip({ ...trip, budgetMin: e.target.value })} 
                    placeholder="0" 
                    min="0" 
                    style={{ color: '#e5e7eb' }} 
                  />
                </div>
                <div className="field">
                  <label>Presupuesto máx.</label>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    value={trip.budgetMax} 
                    onChange={(e) => setTrip({ ...trip, budgetMax: e.target.value })} 
                    placeholder="9999" 
                    min="0" 
                    style={{ color: '#e5e7eb' }} 
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label>Divisa</label>
                  <CurrencySelect 
                    value={trip.currency} 
                    onChange={(e) => setTrip({ ...trip, currency: e.target.value })}
                    style={{ width: '200px' }}
                  />
                </div>
                <div className="field">
                  <label>Habitación</label>
                  <select value={trip.roomType} onChange={(e) => setTrip({ ...trip, roomType: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="shared">Compartida</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <div className="field">
                  <label>Tipo de Transporte</label>
                  <select value={trip.transportType} onChange={(e) => setTrip({ ...trip, transportType: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="auto">🚗 Auto</option>
                    <option value="colectivo">🚌 Colectivo/Bus</option>
                    <option value="avion">✈️ Avión</option>
                    <option value="tren">🚂 Tren</option>
                    <option value="barco">🚢 Barco</option>
                    <option value="combinado">🔄 Combinado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Temporada</label>
                  <select value={trip.season} onChange={(e) => setTrip({ ...trip, season: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="autumn">Otoño</option>
                    <option value="winter">Invierno</option>
                    <option value="any">Cualquiera</option>
                  </select>
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>País</label>
                  <input
                    value={trip.country}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, country: v })
                      setCountryQuery(v)
                      setIsoCountry('')
                      fetchCountries(v)
                    }}
                    placeholder="Argentina"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {countrySuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {countrySuggestions.map((item, idx) => (
                        <li
                          key={`c_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            const label = item.display_name
                            const code = (item.address && item.address.country_code ? String(item.address.country_code).toUpperCase() : '')
                            setTrip((t) => ({ ...t, country: label }))
                            setIsoCountry(code)
                            setCountrySuggestions([])
                            // Clear city suggestions upon choosing country
                            setOriginSuggestions([])
                            setDestinationSuggestions([])
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const label = item.display_name
                              const code = (item.address && item.address.country_code ? String(item.address.country_code).toUpperCase() : '')
                              setTrip((t) => ({ ...t, country: label }))
                              setIsoCountry(code)
                              setCountrySuggestions([])
                            }
                          }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isoCountry && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Código país: {isoCountry}</div>
                  )}
                </div>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <Button className="btn secondary" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    try {
                      // Try to fetch a destination cover image from Unsplash
                      let imageUrl = null
                      try {
                        const qParts = [trip.destination || '', trip.country || ''].filter(Boolean)
                        const q = qParts.join(' ').trim()
                        if (q.length > 0) {
                          const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${encodeURIComponent('3mRQnmdKlbPt4Im-miwXXfGuNIdPAk4OE3tf4G75nG0')}`)
                          if (resp.ok) {
                            const json = await resp.json()
                            const first = (Array.isArray(json?.results) ? json.results : [])[0]
                            imageUrl = first?.urls?.regular || first?.urls?.small || null
                          }
                        }
                      } catch {}
                      // Client-side required validation
                      const required = {
                        name: trip.name,
                        origin: trip.origin,
                        destination: trip.destination,
                        country: trip.country,
                        budgetMin: trip.budgetMin,
                        budgetMax: trip.budgetMax,
                        roomType: trip.roomType,
                        maxParticipants: trip.maxParticipants,
                      }
                      const missing = Object.entries(required).filter(([k, v]) => v == null || String(v).trim() === '').map(([k]) => k)
                      if (missing.length > 0) {
                        alert(`Completá los campos obligatorios: ${missing.join(', ')}`)
                        return
                      }

                      // Validación de presupuesto
                      const budgetMin = Number(trip.budgetMin)
                      const budgetMax = Number(trip.budgetMax)
                      if (budgetMin < 0) {
                        alert('El presupuesto mínimo no puede ser menor a 0')
                        return
                      }
                      if (budgetMax < 0) {
                        alert('El presupuesto máximo no puede ser menor a 0')
                        return
                      }
                      if (budgetMin > budgetMax) {
                        alert('El presupuesto mínimo no puede ser mayor al máximo')
                        return
                      }

                      // Validación de fechas
                      const today = new Date()
                      today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
                      
                      const startDate = new Date(trip.startDate)
                      const endDate = new Date(trip.endDate)
                      
                      if (startDate < today) {
                        alert('La fecha de inicio no puede ser anterior al día de hoy')
                        return
                      }
                      if (endDate < today) {
                        alert('La fecha de fin no puede ser anterior al día de hoy')
                        return
                      }
                      if (startDate > endDate) {
                        alert('La fecha de inicio no puede ser posterior a la fecha de fin')
                        return
                      }

                      const payload = {
                        name: trip.name,
                        origin: trip.origin,
                        destination: trip.destination,
                        start_date: trip.startDate || null,
                        end_date: trip.endDate || null,
                        budget_min: trip.budgetMin !== '' ? Number(trip.budgetMin) : null,
                        budget_max: trip.budgetMax !== '' ? Number(trip.budgetMax) : null,
                        currency: trip.currency || 'USD',
                        room_type: trip.roomType || null,
                        transport_type: trip.transportType || null,
                        season: trip.season || null,
                        country: trip.country || null,
                        max_participants: trip.maxParticipants !== '' ? Number(trip.maxParticipants) : null,
                        image_url: imageUrl || null,
                      creator_id: profile?.user_id || editTripModal.data?.creatorId || editTripModal.data?.creator_id || null,
                      }
                      const { data } = await api.post('/trips/create/', payload)
                      setShowCreateModal(false)
                      setTrip({ name: '', origin: '', destination: '', startDate: '', endDate: '', budgetMin: '', budgetMax: '', currency: 'USD', status: '', roomType: '', transportType: '', season: '', country: '', maxParticipants: '' })
                      await loadTrips()
                      setJoinDialog({ open: true, title: 'Viaje creado', message: 'Tu viaje fue creado con éxito.' })
                    } catch (e) {
                      alert(e?.response?.data?.error || e?.message || 'No se pudo crear el viaje')
                    }
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

  {chatInfoOpen && (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="chatInfoTitle">
      <div className="overlay-box" style={{ maxWidth: 600, width: '95%' }}>
        <h3 id="chatInfoTitle" className="page-title" style={{ margin: 0 }}>{activeRoom?.name || 'Información del chat'}</h3>
        <div className="glass-card" style={{ padding: 12, marginTop: 8 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Integrantes</h4>
          {(chatMembers || []).length === 0 && <p className="muted">No se pudieron cargar los integrantes o no hay datos.</p>}
          {(chatMembers || []).length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
                  {chatMembers.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      className="glass-card"
                      style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                      onClick={() => {
                        try {
                          if (!m?.user_id) return
                          navigate(`/u/${m.user_id}`)
                        } catch {}
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{m.name || 'Usuario'}</div>
                    </button>
                  ))}
            </div>
          )}
        </div>
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Button variant="secondary" onClick={() => setChatInfoOpen(false)}>Cerrar</Button>
          {activeRoom?.trip_id && (
            <Button
              onClick={async () => {
                try {
                  const tid = activeRoom?.trip_id
                  if (!tid || !profile?.user_id) return
                  const isOwner = (tripsBase || []).some((t) => String(t.id) === String(tid) && t.creatorId === profile.user_id)
                  const confirmMsg = isOwner
                    ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                    : '¿Seguro que querés abandonar este viaje?'
                  if (!confirm(confirmMsg)) return
                  setLeavingId(tid)
                  const data = await leaveTrip(tid, profile.user_id)
                  if (data?.ok !== false) {
                    setChatInfoOpen(false)
                    setActiveRoomId(null)
                    setActiveRoom(null)
                    setMessages([])
                    try { const r = await listRoomsForUser(profile.user_id); setRooms(r) } catch {}
                    await loadTrips()
                  } else {
                    alert(data?.error || 'No se pudo abandonar/eliminar el viaje')
                  }
                } catch (e) {
                  alert(e?.message || 'Error al abandonar/eliminar')
                } finally {
                  setLeavingId(null)
                }
              }}
            >
              {(() => { const isOwner = activeRoom?.trip_id && (tripsBase || []).some((t) => String(t.id) === String(activeRoom.trip_id) && t.creatorId === profile?.user_id); return leavingId === activeRoom?.trip_id ? (isOwner ? 'Eliminando…' : 'Saliendo…') : (isOwner ? 'Eliminar viaje' : 'Abandonar') })()}
            </Button>
          )}
            </div>
          </div>
        </div>
      )}

      {filtersOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="filtersTitle">
          <div className="overlay-box" style={{ maxWidth: 980, width: '95%', position: 'relative' }}>
            <button
              aria-label="Cerrar"
              onClick={() => setFiltersOpen(false)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                width: 36,
                height: 36,
                borderRadius: 9999,
                background: '#0f172a',
                border: '2px solid #ef4444',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.45)'
              }}
            >
              ✕
            </button>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <h3 id="filtersTitle" className="page-title" style={{ margin: 0, textAlign: 'center' }}>Filtros</h3>
            </div>
            <div style={{ marginTop: 8 }}>
              <TripFilters baseTrips={tripsBase} onFilter={(f) => { setTrips(f); setVisibleCount(6); setShowMineOnly(false) }} onDone={() => setFiltersOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {editTripModal.open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="editTripTitle">
          <div className="overlay-box" style={{ maxWidth: 1000, width: '95%' }}>
            <h3 id="editTripTitle" className="page-title" style={{ margin: 0 }}>Editar viaje</h3>
            <div className="glass-card" style={{ padding: 12, marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Nombre</label>
                  <input defaultValue={editTripModal.data?.name} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Origen</label>
                  <input defaultValue={editTripModal.data?.origin} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, origin: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Destino</label>
                  <input defaultValue={editTripModal.data?.destination} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, destination: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Desde</label>
                  <input type="date" defaultValue={editTripModal.data?.startDate} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, startDate: e.target.value } }))} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input type="date" defaultValue={editTripModal.data?.endDate} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, endDate: e.target.value } }))} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="field">
                  <label>Cantidad de personas (máx.)</label>
                  <input type="number" inputMode="numeric" defaultValue={editTripModal.data?.maxParticipants ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, maxParticipants: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Presupuesto mín.</label>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    defaultValue={editTripModal.data?.budgetMin ?? ''} 
                    onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, budgetMin: e.target.value } }))} 
                    min="0" 
                  />
                </div>
                <div className="field">
                  <label>Presupuesto máx.</label>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    defaultValue={editTripModal.data?.budgetMax ?? ''} 
                    onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, budgetMax: e.target.value } }))} 
                    min="0" 
                  />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label>Divisa</label>
                  <CurrencySelect 
                    value={editTripModal.data?.currency || 'USD'} 
                    onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, currency: e.target.value } }))}
                    style={{ width: '200px' }}
                  />
                </div>
                <div className="field">
                  <label>Habitación</label>
                  <select defaultValue={editTripModal.data?.roomType ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, roomType: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="shared">Compartida</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <div className="field">
                  <label>Tipo de Transporte</label>
                  <select defaultValue={editTripModal.data?.transportType ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, transportType: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="auto">🚗 Auto</option>
                    <option value="colectivo">🚌 Colectivo/Bus</option>
                    <option value="avion">✈️ Avión</option>
                    <option value="tren">🚂 Tren</option>
                    <option value="barco">🚢 Barco</option>
                    <option value="combinado">🔄 Combinado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Temporada</label>
                  <select defaultValue={editTripModal.data?.season ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, season: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="autumn">Otoño</option>
                    <option value="winter">Invierno</option>
                    <option value="any">Cualquiera</option>
                  </select>
                </div>
                <div className="field">
                  <label>País</label>
                  <input defaultValue={editTripModal.data?.country ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, country: e.target.value } }))} />
                </div>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <Button className="btn secondary" variant="secondary" onClick={() => setEditTripModal({ open: false, data: null })}>Cancelar</Button>
                <Button onClick={async () => {
                  try {
                    const editedId = editTripModal.data?.id
                    const fallbackCreator = (() => {
                      try { return (tripsBase || []).find((t) => String(t.id) === String(editedId))?.creatorId || null } catch { return null }
                    })()
                    const payload = {
                      id: editedId,
                      name: editTripModal.data?.name,
                      origin: editTripModal.data?.origin,
                      destination: editTripModal.data?.destination,
                      start_date: editTripModal.data?.startDate || null,
                      end_date: editTripModal.data?.endDate || null,
                      budget_min: editTripModal.data?.budgetMin !== '' ? Number(editTripModal.data?.budgetMin) : null,
                      budget_max: editTripModal.data?.budgetMax !== '' ? Number(editTripModal.data?.budgetMax) : null,
                      currency: editTripModal.data?.currency || 'USD',
                      room_type: editTripModal.data?.roomType || null,
                      transport_type: editTripModal.data?.transportType || null,
                      season: editTripModal.data?.season || null,
                      country: editTripModal.data?.country || null,
                      max_participants: editTripModal.data?.maxParticipants !== '' ? Number(editTripModal.data?.maxParticipants) : null,
                      creator_id: profile?.user_id || editTripModal.data?.creatorId || editTripModal.data?.creator_id || fallbackCreator || null,
                    }
                    if (!payload.id) { alert('Falta id del viaje para actualizar'); return }
                    if (!payload.creator_id) { alert('Falta creator_id para actualizar este viaje'); return }

                    // Validación de presupuesto
                    const budgetMin = Number(editTripModal.data?.budgetMin || 0)
                    const budgetMax = Number(editTripModal.data?.budgetMax || 0)
                    if (budgetMin < 0) {
                      alert('El presupuesto mínimo no puede ser menor a 0')
                      return
                    }
                    if (budgetMax < 0) {
                      alert('El presupuesto máximo no puede ser menor a 0')
                      return
                    }
                    if (budgetMin > budgetMax) {
                      alert('El presupuesto mínimo no puede ser mayor al máximo')
                      return
                    }

                    // Validación de fechas
                    const today = new Date()
                    today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
                    
                    const startDate = new Date(editTripModal.data?.startDate)
                    const endDate = new Date(editTripModal.data?.endDate)
                    
                    if (startDate < today) {
                      alert('La fecha de inicio no puede ser anterior al día de hoy')
                      return
                    }
                    if (endDate < today) {
                      alert('La fecha de fin no puede ser anterior al día de hoy')
                      return
                    }
                    if (startDate > endDate) {
                      alert('La fecha de inicio no puede ser posterior a la fecha de fin')
                      return
                    }
                    await api.post('/trips/update/', payload)
                    setEditTripModal({ open: false, data: null })
                    await loadTrips()
                    setJoinDialog({ open: true, title: 'Viaje actualizado', message: 'Los cambios se guardaron correctamente.' })
                  } catch (e) {
                    alert(e?.response?.data?.error || e?.message || 'No se pudo actualizar el viaje')
                  }
                }}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {joinDialog.open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="joinDialogTitle">
          <div className="overlay-box" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #2563eb, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 28,
              boxShadow: '0 10px 30px rgba(37,99,235,0.45)'
            }}>✓</div>
            <h3 id="joinDialogTitle" style={{ margin: '12px 0 4px 0', fontWeight: 800 }}> {joinDialog.title} </h3>
            <p className="muted" style={{ marginBottom: 12 }}>{joinDialog.message}</p>
            <div className="actions" style={{ justifyContent: 'center' }}>
              <Button onClick={() => { window.location.hash = '#chats'; setJoinDialog({ open: false, title: '', message: '' }) }}>Ir a chats</Button>
              <Button variant="secondary" onClick={() => setJoinDialog({ open: false, title: '', message: '' })}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {applyModal.open && (
        <ApplyToTripModal
          trip={applyModal.trip}
          isOpen={applyModal.open}
          onClose={() => setApplyModal({ open: false, trip: null })}
          onSuccess={async (roomId) => {
            try {
              if (!profile?.user_id) return
              const r = await listRoomsForUser(profile.user_id)
              setRooms(r)
              // Recargar aplicaciones del usuario para actualizar el estado
              await loadUserApplications()
              setJoinDialog({ open: true, title: 'Aplicación enviada', message: 'Abrimos un chat privado con el organizador.' })
              // Open the specific room returned by the backend
              try {
                if (roomId) {
                  const targetRoom = (r || []).find((x) => x.id === roomId)
                  if (targetRoom) {
                    await openRoom(targetRoom)
                  }
                }
              } catch {}
            } catch {}
          }}
        />
      )}
    </DashboardLayout>
  )
}


