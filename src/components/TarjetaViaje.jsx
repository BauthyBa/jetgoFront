import { Link } from 'react-router-dom'
import { 
  Clock, 
  MapPin, 
  Star, 
  Users, 
  Car, 
  Bus, 
  Train,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'

export default function TarjetaViaje({ viaje, creadorNombre }) {
  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  // Formatear hora
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calcular duración
  const getDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return ''
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end - start
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours}h${diffMinutes.toString().padStart(2, '0')}`
  }

  // Obtener precio formateado
  const getFormattedPrice = () => {
    if (viaje.budgetMin && viaje.budgetMax) {
      return `$${viaje.budgetMin} - $${viaje.budgetMax}`
    } else if (viaje.budgetMin) {
      return `$${viaje.budgetMin}`
    } else if (viaje.budgetMax) {
      return `$${viaje.budgetMax}`
    }
    return 'Consultar precio'
  }

  // Obtener estado del viaje
  const getTripStatus = () => {
    if (viaje.status === 'completed') return 'Completo'
    if (viaje.status === 'cancelled') return 'Cancelado'
    if (viaje.maxParticipants && viaje.currentParticipants >= viaje.maxParticipants) {
      return 'Completo'
    }
    return 'Disponible'
  }

  const isAvailable = getTripStatus() === 'Disponible'

  return (
    <Link
      to={`/trip/${viaje.id}`}
      className="block group"
    >
      <div className={`bg-slate-700/30 backdrop-blur-sm rounded-xl border transition-all duration-200 hover:shadow-lg hover:bg-slate-600/30 ${
        isAvailable 
          ? 'border-white/10 hover:border-white/20' 
          : 'border-white/5 opacity-60'
      }`}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            {/* Información principal */}
            <div className="flex-1">
              {/* Nombre del viaje */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {viaje.name || 'Viaje sin nombre'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatTime(viaje.startDate)}
                    </span>
                    <span>→</span>
                    <span className="font-medium">
                      {formatTime(viaje.endDate)}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {getDuration(viaje.startDate, viaje.endDate)}
                  </div>
                </div>
              </div>

              {/* Ruta */}
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-4 h-4 text-slate-300" />
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {viaje.origin}
                  </div>
                  <div className="text-slate-300 text-sm">
                    {viaje.destination}
                  </div>
                </div>
              </div>

              {/* Imagen del destino si existe */}
              {viaje.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={viaje.imageUrl} 
                    alt={viaje.destination}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Información del organizador */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                  {creadorNombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">
                    {creadorNombre}
                  </div>
                  {viaje.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-slate-300">
                        {viaje.rating} ({viaje.totalRatings || 0} reseñas)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {viaje.currentParticipants || 0}/{viaje.maxParticipants || '∞'} participantes
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(viaje.startDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Precio y estado */}
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-white mb-1">
                {getFormattedPrice()}
              </div>
              <div className={`text-sm font-medium ${
                isAvailable 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                {getTripStatus()}
              </div>
            </div>
          </div>

          {/* Tags si existen */}
          {viaje.tags && viaje.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex flex-wrap gap-2">
                {viaje.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
