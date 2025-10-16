import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Calendar } from 'lucide-react'
import Reveal from '@/components/Reveal'
import ColorBar from '@/components/ColorBar'
import { getSession, supabase } from '@/services/supabase'
import TripGrid from '@/components/TripGrid'
import { listTrips } from '@/services/trips'
import ApplyToTripModal from '@/components/ApplyToTripModal'
import { listRoomsForUser } from '@/services/chat'

export default function HeroSection() {
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [date, setDate] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [trips, setTrips] = useState([])
  const [allTrips, setAllTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [tripsError, setTripsError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [anyDate, setAnyDate] = useState(false)
  const [fromSuggestionsOpen, setFromSuggestionsOpen] = useState(false)
  const [toSuggestionsOpen, setToSuggestionsOpen] = useState(false)
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(4)
  const [applyModal, setApplyModal] = useState({ open: false, trip: null })
  const [joinDialog, setJoinDialog] = useState({ open: false, title: '', message: '' })
  const fromRef = useRef(null)
  const toRef = useRef(null)

  useEffect(() => {
    let mounted = true
    getSession().then((s) => { if (mounted) setLoggedIn(!!s?.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session?.user)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  function matchesFilter(trip) {
    const fromQ = String(fromText || '').trim().toLowerCase()
    const toQ = String(toText || '').trim().toLowerCase()
    const fromOk = fromQ.length === 0 ? true : String(trip.origin || '').toLowerCase().includes(fromQ)
    const toOk = toQ.length === 0 ? true : String(trip.destination || '').toLowerCase().includes(toQ)

    // Si no hay fecha o está marcado cualquier fecha, no limitar por fecha
    if (anyDate || !date) return fromOk && toOk

    try {
      const d = new Date(date)
      const start = trip.startDate ? new Date(trip.startDate) : null
      const end = trip.endDate ? new Date(trip.endDate) : null
      const dateOk = (start && end && d >= start && d <= end) || (start && !end && d.toDateString() === start.toDateString()) || (!start && !end)
      return fromOk && toOk && dateOk
    } catch (_e) {
      return fromOk && toOk
    }
  }

  async function handleSearchTrips() {
    try {
      setTripsLoading(true)
      setTripsError('')
      // Usar viajes ya precargados si existen para evitar otra llamada
      let source = allTrips
      if (!source || source.length === 0) {
        source = await listTrips()
        setAllTrips(source)
      }
      const filtered = (source || []).filter(matchesFilter)
      // Mostrar exactamente el resultado del filtro (puede ser vacío)
      setTrips(filtered)
    } catch (e) {
      setTripsError('No se pudieron cargar los viajes ahora.')
    } finally {
      setTripsLoading(false)
    }
  }

  // Precargar viajes (solo una vez) para armar sugerencias y estado inicial
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setTripsLoading(true)
        const all = await listTrips()
        if (!mounted) return
        setAllTrips(all)
        // Mantener una primera vista con todos los viajes antes de filtrar
        if ((trips || []).length === 0) setTrips(all)
      } catch (_e) {
        // noop: sugerencias quedarán vacías y se muestran como "Sin opciones"
      } finally { setTripsLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  // Cerrar dropdowns al hacer click afuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(e) {
      const f = fromRef.current
      const t = toRef.current
      if (f && !f.contains(e.target)) setFromSuggestionsOpen(false)
      if (t && !t.contains(e.target)) setToSuggestionsOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setFromSuggestionsOpen(false)
        setToSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Obtener listas únicas de orígenes y destinos a partir de todos los viajes
  const allOrigins = useMemo(() => {
    const set = new Set()
    for (const t of (allTrips.length ? allTrips : trips) || []) {
      if (t?.origin) set.add(String(t.origin))
    }
    return Array.from(set)
  }, [allTrips, trips])

  const allDestinations = useMemo(() => {
    const set = new Set()
    for (const t of (allTrips.length ? allTrips : trips) || []) {
      if (t?.destination) set.add(String(t.destination))
    }
    return Array.from(set)
  }, [allTrips, trips])

  const filteredFromOptions = useMemo(() => {
    const q = String(fromText || '').toLowerCase()
    if (!q) return allOrigins.slice(0, 6)
    return allOrigins.filter((o) => String(o).toLowerCase().includes(q)).slice(0, 6)
  }, [fromText, allOrigins])

  const filteredToOptions = useMemo(() => {
    const q = String(toText || '').toLowerCase()
    if (!q) return allDestinations.slice(0, 6)
    return allDestinations.filter((d) => String(d).toLowerCase().includes(q)).slice(0, 6)
  }, [toText, allDestinations])

  function handleSearchClick() {
    setHasSearched(true)
    handleSearchTrips()
    
    // Redirigir a la página de viajes con los parámetros de búsqueda
    const params = new URLSearchParams()
    if (fromText.trim()) params.set('desde', fromText.trim())
    if (toText.trim()) params.set('hasta', toText.trim())
    if (date && !anyDate) params.set('fecha', date)
    
    navigate(`/viajes?${params.toString()}`)
  }

  // Desactivar auto-búsqueda: ahora solo busca al tocar el botón

  function handleGoTrips() {
    if (loggedIn) {
      navigate('/dashboard#trips')
    } else {
      navigate('/login')
    }
  }

  return (
    <section className="relative min-h-[88vh] flex items-center bg-gradient-to-b from-slate-900 to-slate-800 pt-24 overflow-hidden">
      <div aria-hidden className="absolute inset-0 z-[1] pointer-events-none">
        <img src="/hero-landmarks.jpg" alt="" className="w-full h-full object-cover opacity-60 blur-[3px] scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/50 to-slate-900/80" />
      </div>
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white w-full">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">Viaja más,<br /><span className="text-emerald-400">gasta menos</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex justify-center mb-6"><ColorBar className="w-56 rounded-full" /></div>
          </Reveal>
          <Reveal delay={150}>
            <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-white/90">Conecta con personas que van a tu mismo destino y comparte el viaje</p>
          </Reveal>
        </div>
        <Reveal delay={200}>
        <div className="relative z-[5000] bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-5xl mx-auto mb-8 border border-slate-700/60 shadow-strong">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div ref={fromRef} className="relative z-[9999]">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  placeholder="Desde"
                  value={fromText}
                  onChange={(e) => { setFromText(e.target.value); setFromSuggestionsOpen(true) }}
                  onFocus={() => setFromSuggestionsOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick() }}
                  className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {fromSuggestionsOpen && (
                  <div className="absolute z-[10000] mt-2 w-full bg-slate-800/95 border border-slate-700/60 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredFromOptions.length === 0 && (
                      <div className="px-3 py-2 text-slate-300 text-xs">Sin opciones</div>
                    )}
                    {filteredFromOptions.map((opt) => (
                      <button
                        key={`from-${opt}`}
                        onClick={() => { setFromText(opt); setFromSuggestionsOpen(false) }}
                        className="w-full text-left px-3 py-1 hover:bg-slate-700/60 text-slate-100 text-xs"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-1">
              <div ref={toRef} className="relative z-[9999]">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  placeholder="Hasta"
                  value={toText}
                  onChange={(e) => { setToText(e.target.value); setToSuggestionsOpen(true) }}
                  onFocus={() => setToSuggestionsOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick() }}
                  className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {toSuggestionsOpen && (
                  <div className="absolute z-[10000] mt-2 w-full bg-slate-800/95 border border-slate-700/60 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filteredToOptions.length === 0 && (
                      <div className="px-3 py-2 text-slate-300 text-xs">Sin opciones</div>
                    )}
                    {filteredToOptions.map((opt) => (
                      <button
                        key={`to-${opt}`}
                        onClick={() => { setToText(opt); setToSuggestionsOpen(false) }}
                        className="w-full text-left px-3 py-1 hover:bg-slate-700/60 text-slate-100 text-xs"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                  <Input
                    type="date"
                    value={anyDate ? '' : date}
                    onChange={(e) => { setDate(e.target.value); if (anyDate) setAnyDate(false) }}
                    disabled={anyDate}
                    placeholder={anyDate ? 'Cualquier fecha' : ''}
                    className={
                      `pl-10 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${anyDate ? 'bg-slate-700/50 opacity-60 cursor-not-allowed' : 'bg-slate-700/90'}`
                    }
                  />
                <div className="mt-2 flex">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setAnyDate((v) => !v); if (!anyDate) setDate('') }}
                    className={`h-8 px-2 text-xs whitespace-nowrap border-slate-500 ${anyDate ? 'bg-slate-700/60 text-slate-200' : 'bg-transparent text-white'}`}
                  >
                    {anyDate ? 'Usar fecha' : 'Cualquier fecha'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
              <Button
                size="lg"
                onClick={handleSearchClick}
                disabled={false}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:brightness-110 text-white shadow-xl ring-1 ring-blue-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="mr-2 h-5 w-5" />
                {tripsLoading ? 'Buscando…' : 'Buscar viajes'}
              </Button>
            </div>
          </div>
        </div>
        </Reveal>
        <Reveal delay={220}>
          <div className="max-w-6xl mx-auto mt-6">
            {tripsError && <p className="text-red-300 text-sm mb-2">{tripsError}</p>}
            {tripsLoading && !tripsError && <p className="text-slate-200">Cargando viajes…</p>}
            {!tripsLoading && !tripsError && trips.length === 0 && hasSearched && (
              <div className="text-slate-300 flex flex-col items-center gap-3 py-8">
                <p className="text-base">No hay viajes aún disponibles con esos criterios. ¡Crea uno!</p>
                <Button variant="outline" onClick={handleGoTrips} className="border-slate-500 text-white bg-transparent hover:bg-slate-700 ring-1 ring-slate-400/20">
                  Crear viaje
                </Button>
              </div>
            )}
            {!tripsLoading && !tripsError && trips.length > 0 && (
              <div className="relative">
                {/* Dark overlay for trips section - smaller container */}
                <div className="absolute inset-0 bg-slate-900/50 -m-2 sm:-m-4 lg:-m-6 rounded-2xl" />
                <div className="relative z-10">
                  <TripGrid 
                    trips={trips.slice(0, visibleCount)} 
                    onJoin={(trip) => {
                      if (!loggedIn) {
                        navigate('/login')
                        return
                      }
                      setApplyModal({ open: true, trip })
                    }}
                    onLeave={() => {}}
                    onApply={(trip) => {
                      if (!loggedIn) {
                        navigate('/login')
                        return
                      }
                      setApplyModal({ open: true, trip })
                    }}
                  />
                  {trips.length > visibleCount && (
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => setVisibleCount((c) => c + 4)} className="border-slate-500 text-white bg-transparent hover:bg-slate-700 ring-1 ring-slate-400/20">Cargar más</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Reveal>
        
      </div>
      
      {/* Modal de aplicación */}
      {applyModal.open && (
        <ApplyToTripModal
          trip={applyModal.trip}
          isOpen={applyModal.open}
          onClose={() => setApplyModal({ open: false, trip: null })}
          onSuccess={async (roomId) => {
            try {
              setApplyModal({ open: false, trip: null })
              
              // Obtener el usuario actual
              const session = await getSession()
              const userId = session?.user?.id
              
              if (userId) {
                // Recargar las salas de chat del usuario
                const rooms = await listRoomsForUser(userId)
                
                // Mostrar el diálogo de éxito
                setJoinDialog({ 
                  open: true, 
                  title: 'Aplicación enviada', 
                  message: 'Abrimos un chat privado con el organizador.' 
                })
                
                // Si hay roomId, redirigir a la vista de chats con la sala específica
                if (roomId) {
                  navigate(`/modern-chat?room=${roomId}`)
                } else {
                  // Redirigir a la vista general de chats
                  navigate('/modern-chat')
                }
              }
            } catch (error) {
              console.error('Error al procesar la aplicación:', error)
              // Fallback: mostrar mensaje simple
              alert('¡Aplicación enviada con éxito!')
            }
          }}
        />
      )}
      
      {/* Diálogo de éxito */}
      {joinDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4 text-center">
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
              boxShadow: '0 10px 30px rgba(37,99,235,0.45)',
              margin: '0 auto 16px auto'
            }}>
              ✓
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800, fontSize: '1.5rem' }}>
              {joinDialog.title}
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#94a3b8' }}>
              {joinDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button 
                onClick={() => {
                  setJoinDialog({ open: false, title: '', message: '' })
                  navigate('/modern-chat')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Ir a chats
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setJoinDialog({ open: false, title: '', message: '' })}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


