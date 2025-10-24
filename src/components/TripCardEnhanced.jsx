import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  MapPin, 
  Calendar, 
  Car,
  Bus,
  Train,
  Plane,
  Users,
  DollarSign,
  Clock,
  Star,
  Home,
  Globe,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'
import { getFeaturedImage } from '@/services/wikipedia'

export default function TripCardEnhanced({ 
  trip, 
  onJoin, 
  onLeave, 
  joining, 
  leaving, 
  onEdit, 
  canEdit, 
  isMember, 
  isOwner, 
  onApply, 
  hasApplied,
  viewMode = 'card' // 'card' o 'list'
}) {
  const [destinationImage, setDestinationImage] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)

  // Cargar imagen del destino
  useEffect(() => {
    if (trip?.destination) {
      setImageLoading(true)
      getFeaturedImage(trip.destination)
        .then(imageUrl => {
          setDestinationImage(imageUrl)
        })
        .catch(error => {
          console.error('Error loading destination image:', error)
          setDestinationImage(null)
        })
        .finally(() => {
          setImageLoading(false)
        })
    }
  }, [trip?.destination])

  if (!trip) return null

  const getTransportIcon = (type) => {
    switch (type) {
      case 'auto': return <Car className="w-4 h-4" />
      case 'bus': return <Bus className="w-4 h-4" />
      case 'tren': return <Train className="w-4 h-4" />
      case 'avion': return <Plane className="w-4 h-4" />
      default: return <Car className="w-4 h-4" />
    }
  }

  const getTransportColor = (type) => {
    switch (type) {
      case 'auto': return 'text-blue-500'
      case 'bus': return 'text-green-500'
      case 'tren': return 'text-purple-500'
      case 'avion': return 'text-orange-500'
      default: return 'text-blue-500'
    }
  }

  const formatDate = (date) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatBudget = () => {
    if (!trip.budgetMin && !trip.budgetMax) return null
    const min = trip.budgetMin ? `$${trip.budgetMin}` : '?'
    const max = trip.budgetMax ? `$${trip.budgetMax}` : '?'
    return `${min} - ${max}`
  }

  const formatParticipants = () => {
    if (trip.currentParticipants == null && trip.maxParticipants == null) return null
    const current = trip.currentParticipants ?? '?'
    const max = trip.maxParticipants ?? '?'
    return `${current}/${max}`
  }

  const isFull = trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants

  // Renderizado en modo tarjeta
  if (viewMode === 'card') {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:bg-slate-800/70 transition-all duration-300 group">
        {/* Imagen del destino */}
        <div className="relative h-48 overflow-hidden">
          {imageLoading ? (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : destinationImage ? (
            <img 
              src={destinationImage} 
              alt={trip.destination}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="w-16 h-16 text-emerald-400" />
            </div>
          )}
          
          {/* Overlay con información básica */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                {trip.name}
              </h3>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">
                  {trip.origin} → {trip.destination}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido de la tarjeta */}
        <div className="p-6">
          {/* Fechas */}
          {trip.startDate && (
            <div className="flex items-center gap-2 mb-4 text-slate-300">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">
                {formatDate(trip.startDate)}
                {trip.endDate && ` - ${formatDate(trip.endDate)}`}
              </span>
            </div>
          )}

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Transporte */}
            {trip.tipo && (
              <div className="flex items-center gap-2">
                <div className={getTransportColor(trip.tipo)}>
                  {getTransportIcon(trip.tipo)}
                </div>
                <span className="text-sm text-slate-300 capitalize">{trip.tipo}</span>
              </div>
            )}

            {/* Participantes */}
            {formatParticipants() && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{formatParticipants()}</span>
              </div>
            )}

            {/* Presupuesto */}
            {formatBudget() && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{formatBudget()}</span>
              </div>
            )}

            {/* País */}
            {trip.country && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300 truncate">{trip.country}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {trip.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30"
                >
                  {tag}
                </span>
              ))}
              {trip.tags.length > 3 && (
                <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                  +{trip.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Botón de acción */}
          <div className="flex gap-2">
            {canEdit && (
              <button 
                className="btn secondary flex-1" 
                type="button" 
                onClick={onEdit}
              >
                Editar
              </button>
            )}
            
            {isMember ? (
              <button 
                className="btn secondary flex-1" 
                type="button" 
                disabled={leaving} 
                onClick={onLeave}
              >
                {isOwner ? (leaving ? 'Eliminando…' : 'Eliminar') : (leaving ? 'Saliendo…' : 'Abandonar')}
              </button>
            ) : hasApplied ? (
              <button
                className="btn secondary flex-1"
                type="button"
                disabled={true}
                title="Ya enviaste una solicitud para este viaje"
              >
                Solicitud enviada
              </button>
            ) : (
              <button
                className={`btn flex-1 ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
                disabled={joining || isFull}
                onClick={onApply || onJoin}
                title={isFull ? 'Cupos completos' : ''}
              >
                {joining ? 'Aplicando…' : (isFull ? 'Sin cupo' : 'Aplicar')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Renderizado en modo lista
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:bg-slate-800/70 transition-all duration-300 w-full max-w-4xl">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Imagen del destino */}
        <div className="flex-shrink-0">
          {imageLoading ? (
            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : destinationImage ? (
            <img 
              src={destinationImage} 
              alt={trip.destination}
              className="w-32 h-32 rounded-lg object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="w-12 h-12 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Información principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Título y ruta */}
            <div className="flex-1 min-w-0">
              <Link 
                to={`/trip/${trip.id}`} 
                className="text-xl font-bold text-white hover:text-emerald-400 transition-colors line-clamp-1"
              >
                {trip.name}
              </Link>
              
              <div className="flex items-center gap-2 mt-2 text-slate-300">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {trip.origin || 'Origen no especificado'} → {trip.destination || 'Destino no especificado'}
                </span>
              </div>

              {/* Fechas */}
              {trip.startDate && (
                <div className="flex items-center gap-2 mt-2 text-slate-300">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {formatDate(trip.startDate)}
                    {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="flex flex-wrap gap-4 text-sm">
              {/* Transporte */}
              {trip.tipo && (
                <div className="flex items-center gap-2">
                  <div className={getTransportColor(trip.tipo)}>
                    {getTransportIcon(trip.tipo)}
                  </div>
                  <span className="text-slate-300 capitalize">{trip.tipo}</span>
                </div>
              )}

              {/* Participantes */}
              {formatParticipants() && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{formatParticipants()} participantes</span>
                </div>
              )}

              {/* Presupuesto */}
              {formatBudget() && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{formatBudget()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Detalles adicionales */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {trip.country && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{trip.country}</span>
              </div>
            )}
            
            {trip.roomType && (
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{trip.roomType}</span>
              </div>
            )}
            
            {trip.season && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{trip.season}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {trip.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Descripción */}
          {trip.description && (
            <div className="mt-4">
              <p className="text-slate-300 text-sm line-clamp-2">
                {trip.description}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex-shrink-0 flex flex-col gap-3">
          {canEdit && (
            <button 
              className="btn secondary w-full" 
              type="button" 
              onClick={onEdit}
            >
              Editar
            </button>
          )}
          
          {isMember ? (
            <button 
              className="btn secondary w-full" 
              type="button" 
              disabled={leaving} 
              onClick={onLeave}
            >
              {isOwner ? (leaving ? 'Eliminando…' : 'Eliminar viaje') : (leaving ? 'Saliendo…' : 'Abandonar')}
            </button>
          ) : hasApplied ? (
            <button
              className="btn secondary w-full"
              type="button"
              disabled={true}
              title="Ya enviaste una solicitud para este viaje"
            >
              Solicitud enviada
            </button>
          ) : (
            <button
              className={`btn w-full ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
              type="button"
              disabled={joining || isFull}
              onClick={onApply || onJoin}
              title={isFull ? 'Cupos completos' : ''}
            >
              {joining ? 'Aplicando…' : (isFull ? 'Sin cupo' : 'Aplicar')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
