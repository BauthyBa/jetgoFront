import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Car, Bus, Train, Plane, Home, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import CurrencySelect from '@/components/CurrencySelect'
import { getSession } from '@/services/supabase'
import { updateTrip, listTrips } from '@/services/trips'
import { searchCities } from '@/services/nominatim'
import ROUTES from '@/config/routes'
import { mapTransportTypeForBackend } from '@/utils/transport'

const SOUTHERN_HEMISPHERE_COUNTRIES = new Set(['AR','AU','NZ','ZA','CL','UY','PY','BO','PE','NA','BW','MZ','MG','ZW','ZM','LS','SZ','AO','YT','RE','TF'])

function getHemisphere(iso2) {
  if (!iso2) return 'north'
  return SOUTHERN_HEMISPHERE_COUNTRIES.has(String(iso2).toUpperCase()) ? 'south' : 'north'
}

function getSeasonFromMonth(monthIndex, hemisphere) {
  if (hemisphere === 'south') {
    if ([11,0,1].includes(monthIndex)) return 'summer'
    if ([2,3,4].includes(monthIndex)) return 'autumn'
    if ([5,6,7].includes(monthIndex)) return 'winter'
    return 'spring'
  } else {
    if ([11,0,1].includes(monthIndex)) return 'winter'
    if ([2,3,4].includes(monthIndex)) return 'spring'
    if ([5,6,7].includes(monthIndex)) return 'summer'
    return 'autumn'
  }
}

export default function EditTripPage() {
  const navigate = useNavigate()
  const { tripId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [originalTrip, setOriginalTrip] = useState(null)

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
    description: '',
    tipo: ''
  })

  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationSuggestions, setDestinationSuggestions] = useState([])
  const [originQuery, setOriginQuery] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [isoCountry, setIsoCountry] = useState('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const debouncedOriginQuery = useDebounce(originQuery, 300)
  const debouncedDestinationQuery = useDebounce(destinationQuery, 300)

  const computedSeason = (() => {
    try {
      const start = trip.startDate ? new Date(trip.startDate) : null
      if (!start) return null
      const hemi = getHemisphere(isoCountry)
      return getSeasonFromMonth(start.getUTCMonth(), hemi)
    } catch {
      return null
    }
  })()

  const seasonLabelMap = { spring: 'Primavera', summer: 'Verano', autumn: 'Otoño', winter: 'Invierno', any: 'Cualquiera' }

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = await getSession()
        if (session?.user) {
          setProfile(session.user)
          await loadTripData(session.user.id)
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Error cargando datos:', error)
        navigate('/login')
      }
    }
    loadData()
  }, [navigate, tripId])

  const loadTripData = async (userId) => {
    try {
      const trips = await listTrips()
      const tripData = trips.find(t => t.id === tripId)
      
      if (!tripData) {
        setError('Viaje no encontrado')
        setLoading(false)
        return
      }

      if (tripData.creatorId !== userId) {
        setError('No tienes permiso para editar este viaje')
        setLoading(false)
        return
      }

      setOriginalTrip(tripData)
      
      // Formatear fechas para input type="date" (YYYY-MM-DD)
      const formatDateForInput = (dateString) => {
        if (!dateString) return ''
        try {
          // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString
          }
          // Si tiene hora, extraer solo la fecha
          const date = new Date(dateString)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        } catch {
          return ''
        }
      }
      
      setTrip({
        name: tripData.name || '',
        origin: tripData.origin || '',
        destination: tripData.destination || '',
        startDate: formatDateForInput(tripData.startDate),
        endDate: formatDateForInput(tripData.endDate),
        budgetMin: tripData.budgetMin || '',
        budgetMax: tripData.budgetMax || '',
        currency: tripData.raw?.currency || 'USD',
        roomType: tripData.roomType || '',
        season: tripData.season || '',
        country: tripData.country || '',
        maxParticipants: tripData.maxParticipants || '',
        description: tripData.description || '',
        tipo: tripData.transportType || ''
      })
      setLoading(false)
    } catch (error) {
      console.error('Error cargando viaje:', error)
      setError('Error al cargar el viaje')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (debouncedOriginQuery) {
      fetchCities(debouncedOriginQuery, 'origin')
    }
  }, [debouncedOriginQuery])

  useEffect(() => {
    if (debouncedDestinationQuery) {
      fetchCities(debouncedDestinationQuery, 'destination')
    }
  }, [debouncedDestinationQuery])

  const fetchCities = async (query, type) => {
    if (query.length < 2) {
      if (type === 'origin') setOriginSuggestions([])
      else setDestinationSuggestions([])
      return
    }
    
    setLoadingSuggestions(true)
    try {
      const suggestions = await searchCities(query, { limit: 8 })
      if (type === 'origin') setOriginSuggestions(suggestions)
      else setDestinationSuggestions(suggestions)
    } catch (error) {
      console.error('Error fetching cities:', error)
      if (type === 'origin') setOriginSuggestions([])
      else setDestinationSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (!trip.name || !trip.origin || !trip.destination || !trip.startDate) {
        throw new Error('Por favor completa todos los campos obligatorios')
      }

      if (!trip.roomType) {
        throw new Error('Por favor selecciona un tipo de habitación')
      }
      if (!trip.tipo) {
        throw new Error('Por favor selecciona un tipo de transporte')
      }

      console.log('🚗 Tipo de transporte seleccionado (UI):', trip.tipo)
      const backendTransportType = mapTransportTypeForBackend(trip.tipo)
      console.log('🚗 Tipo de transporte mapeado (Backend):', backendTransportType)
      
      if (!backendTransportType) {
        throw new Error('Tipo de transporte inválido')
      }

      let countryForSubmit = trip.country
      let isoForSubmit = isoCountry
      if ((!countryForSubmit || !isoForSubmit) && trip.destination) {
        try {
          const first = (await searchCities(trip.destination, { limit: 1 }))?.[0]
          if (first) {
            const inferredCountry = first.address?.country || countryForSubmit
            const inferredIso = first.address?.country_code ? String(first.address.country_code).toUpperCase() : isoForSubmit
            if (!countryForSubmit && inferredCountry) countryForSubmit = inferredCountry
            if (!isoForSubmit && inferredIso) isoForSubmit = inferredIso
          }
        } catch {}
      }

      if (trip.endDate && trip.startDate && trip.endDate < trip.startDate) {
        throw new Error('La fecha de fin debe ser posterior a la de inicio')
      }

      // Calcular la temporada basada en el mes de inicio
      let autoSeason = 'any'
      if (trip.startDate) {
        // Extraer el mes de la fecha en formato YYYY-MM-DD
        const month = parseInt(trip.startDate.split('-')[1]) - 1 // 0-indexed
        const hemi = getHemisphere(isoForSubmit)
        autoSeason = getSeasonFromMonth(month, hemi)
      }

      if (!profile || !profile.id) {
        throw new Error('Debes estar autenticado para editar un viaje')
      }

      const tripData = {
        creator_id: profile.id,
        name: trip.name,
        origin: trip.origin,
        destination: trip.destination,
        start_date: trip.startDate,
        end_date: trip.endDate || null,
        budget_min: trip.budgetMin ? parseFloat(trip.budgetMin) : null,
        budget_max: trip.budgetMax ? parseFloat(trip.budgetMax) : null,
        max_participants: trip.maxParticipants ? parseInt(trip.maxParticipants) : null,
        room_type: trip.roomType,
        season: autoSeason,
        country: countryForSubmit,
        currency: trip.currency,
        description: trip.description || '',
        transport_type: backendTransportType
      }

      console.log('📤 Actualizando viaje:', tripData)

      const result = await updateTrip(tripId, tripData)
      
      console.log('✅ Respuesta del servidor:', result)

      if (result && (result.ok || result.success)) {
        setSuccess(true)
        setTimeout(() => {
          navigate(ROUTES.VIAJES)
        }, 2000)
      } else {
        throw new Error(result?.error || 'Error al actualizar el viaje')
      }
    } catch (error) {
      console.error('❌ Error actualizando viaje:', error)
      setError(error.message || 'Error al actualizar el viaje')
    } finally {
      setSubmitting(false)
    }
  }

  const transportTypes = [
    { value: 'auto', label: 'Auto', icon: Car },
    { value: 'bus', label: 'Bus', icon: Bus },
    { value: 'tren', label: 'Tren', icon: Train },
    { value: 'avion', label: 'Avión', icon: Plane }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-white">Cargando viaje...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 max-w-lg mx-4 text-center border border-slate-700/50">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">¡Viaje actualizado!</h2>
          <p className="text-slate-300 mb-8 text-lg">
            Los cambios se han guardado exitosamente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(ROUTES.VIAJES)}
              className="text-slate-400 hover:text-white mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mis Viajes
            </Button>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">
                Editar <span className="text-emerald-400">viaje</span>
              </h1>
              <p className="text-xl text-slate-300">
                Actualiza los detalles de tu viaje
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  Información básica
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-200">Nombre del viaje *</Label>
                    <Input
                      id="name"
                      value={trip.name}
                      onChange={(e) => setTrip({ ...trip, name: e.target.value })}
                      placeholder="Ej: Bariloche 2025"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo" className="text-slate-200">Tipo de transporte *</Label>
                    <select
                      id="tipo"
                      value={trip.tipo}
                      onChange={(e) => setTrip({ ...trip, tipo: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                      required
                    >
                      <option value="">Seleccionar transporte</option>
                      {transportTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50 relative z-50">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  Origen y destino
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <Label htmlFor="origin" className="text-slate-200">Origen *</Label>
                    <Input
                      id="origin"
                      value={trip.origin}
                      onChange={(e) => {
                        const v = e.target.value
                        setTrip({ ...trip, origin: v })
                        setOriginQuery(v)
                      }}
                      placeholder="Ciudad de origen"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                    {(originSuggestions.length > 0 || loadingSuggestions) && (
                      <ul className="absolute z-[9999] w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-auto shadow-2xl">
                        {loadingSuggestions ? (
                          <li className="p-3 text-slate-400 text-center">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                            Buscando lugares...
                          </li>
                        ) : (
                          originSuggestions.map((item, idx) => (
                            <li
                              key={`o_${idx}_${item.place_id}`}
                              className="p-3 cursor-pointer hover:bg-slate-600 text-slate-200"
                              onClick={() => {
                                setTrip({ ...trip, origin: item.display_name })
                                setOriginQuery(item.display_name)
                                setOriginSuggestions([])
                              }}
                            >
                              {item.display_name}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="destination" className="text-slate-200">Destino *</Label>
                    <Input
                      id="destination"
                      value={trip.destination}
                      onChange={(e) => {
                        const v = e.target.value
                        setTrip({ ...trip, destination: v })
                        setDestinationQuery(v)
                      }}
                      placeholder="Ciudad de destino"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                    {(destinationSuggestions.length > 0 || loadingSuggestions) && (
                      <ul className="absolute z-[9999] w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-48 overflow-auto shadow-2xl">
                        {loadingSuggestions ? (
                          <li className="p-3 text-slate-400 text-center">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                            Buscando lugares...
                          </li>
                        ) : (
                          destinationSuggestions.map((item, idx) => (
                            <li
                              key={`d_${idx}_${item.place_id}`}
                              className="p-3 cursor-pointer hover:bg-slate-600 text-slate-200"
                              onClick={() => {
                                const inferredCountry = item.address?.country || trip.country || ''
                                const inferredIso = item.address?.country_code ? String(item.address.country_code).toUpperCase() : ''
                                setTrip({ ...trip, destination: item.display_name, country: inferredCountry })
                                if (inferredIso) setIsoCountry(inferredIso)
                                setDestinationQuery(item.display_name)
                                setDestinationSuggestions([])
                              }}
                            >
                              {item.display_name}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  Fechas
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-slate-200">Fecha de inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={trip.startDate}
                      onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-slate-200">Fecha de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={trip.endDate}
                      onChange={(e) => setTrip({ ...trip, endDate: e.target.value })}
                      min={trip.startDate || new Date().toISOString().split('T')[0]}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  Participantes y presupuesto
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxParticipants" className="text-slate-200">Máximo de participantes</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={trip.maxParticipants}
                      onChange={(e) => setTrip({ ...trip, maxParticipants: e.target.value })}
                      placeholder="2"
                      min="1"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-200">Divisa</Label>
                    <CurrencySelect
                      value={trip.currency}
                      onChange={(e) => setTrip({ ...trip, currency: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetMin" className="text-slate-200">Presupuesto mínimo</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      value={trip.budgetMin}
                      onChange={(e) => setTrip({ ...trip, budgetMin: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budgetMax" className="text-slate-200">Presupuesto máximo</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      value={trip.budgetMax}
                      onChange={(e) => setTrip({ ...trip, budgetMax: e.target.value })}
                      placeholder="9999"
                      min="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-semibold text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-orange-400" />
                  </div>
                  Detalles adicionales
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="roomType" className="text-slate-200">Tipo de habitación</Label>
                    <select
                      id="roomType"
                      value={trip.roomType}
                      onChange={(e) => setTrip({ ...trip, roomType: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                    >
                      <option value="">Seleccionar</option>
                      <option value="shared">Compartida</option>
                      <option value="private">Privada</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Temporada (automático)</Label>
                    <div className="w-full rounded px-3 py-2 bg-slate-700 border border-slate-600 text-white">
                      {seasonLabelMap[computedSeason] || '—'}
                    </div>
                    <p className="text-xs text-slate-400">Se calcula según país y fecha de inicio.</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="text-slate-200">Descripción del viaje</Label>
                    <Textarea
                      id="description"
                      value={trip.description}
                      onChange={(e) => setTrip({ ...trip, description: e.target.value })}
                      placeholder="Describe tu viaje, qué planes tienes, qué tipo de compañía buscas..."
                      className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-red-300 font-medium">{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(ROUTES.MIS_VIAJES)}
                  className="px-8 py-3 text-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Guardando cambios...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
