import { useState, useEffect } from 'react'
import { MapPin, Navigation, X, Send, Loader } from 'lucide-react'
import SimpleLocationMap from './SimpleLocationMap'

export default function LocationCapture({ onLocationSend, onCancel }) {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está disponible en este dispositivo')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Intentar múltiples veces para obtener la mejor precisión
      let bestPosition = null
      let bestAccuracy = Infinity
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
            })
          })
          
          // Si esta posición es más precisa, usarla
          if (position.coords.accuracy < bestAccuracy) {
            bestPosition = position
            bestAccuracy = position.coords.accuracy
          }
          
          // Si la precisión es muy buena (menos de 10 metros), usar esta
          if (position.coords.accuracy <= 10) {
            break
          }
          
          // Esperar un poco antes del siguiente intento
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (err) {
          console.warn(`Intento ${attempt + 1} falló:`, err)
          if (attempt === 2) throw err
        }
      }

      if (!bestPosition) {
        throw new Error('No se pudo obtener una ubicación precisa')
      }

      const { latitude, longitude, accuracy } = bestPosition.coords
      console.log(`Precisión obtenida: ${accuracy} metros`)
      
      setCurrentLocation({ latitude, longitude })

      // Obtener dirección usando reverse geocoding
      await getAddressFromCoords(latitude, longitude)

    } catch (err) {
      console.error('Error getting location:', err)
      if (err.code === 1) {
        setError('Permisos de ubicación denegados. Por favor, permite el acceso a la ubicación.')
      } else if (err.code === 2) {
        setError('Ubicación no disponible. Verifica tu conexión a internet.')
      } else if (err.code === 3) {
        setError('Tiempo de espera agotado. Intenta nuevamente.')
      } else {
        setError('Error obteniendo ubicación. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getAddressFromCoords = async (lat, lng) => {
    try {
      // Usar Nominatim (OpenStreetMap) para reverse geocoding con mejor precisión
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`,
        {
          headers: {
            'User-Agent': 'JetGoApp/1.0'
          }
        }
      )
      const data = await response.json()
      
      if (data.display_name) {
        // Formatear la dirección de manera más legible
        let formattedAddress = data.display_name
        
        // Si hay información más específica, usarla
        if (data.address) {
          const addr = data.address
          const parts = []
          
          if (addr.house_number && addr.road) {
            parts.push(`${addr.road} ${addr.house_number}`)
          } else if (addr.road) {
            parts.push(addr.road)
          }
          
          if (addr.suburb || addr.neighbourhood) {
            parts.push(addr.suburb || addr.neighbourhood)
          }
          
          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village)
          }
          
          if (addr.state) {
            parts.push(addr.state)
          }
          
          if (addr.country) {
            parts.push(addr.country)
          }
          
          if (parts.length > 0) {
            formattedAddress = parts.join(', ')
          }
        }
        
        setAddress(formattedAddress)
      }
    } catch (err) {
      console.error('Error getting address:', err)
      // No es crítico si no se puede obtener la dirección
    }
  }

  const handleSendLocation = async () => {
    if (!currentLocation) return

    setIsLoading(true)
    try {
      await onLocationSend({
        ...currentLocation,
        address,
        timestamp: new Date().toISOString(),
        isLive
      })
    } catch (err) {
      console.error('Error sending location:', err)
      setError('Error enviando ubicación')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLiveLocation = () => {
    setIsLive(!isLive)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">
              {isLive ? 'Ubicación en vivo' : 'Compartir ubicación'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-red-600 font-medium mb-2">Error de ubicación</div>
              <div className="text-sm text-slate-600 mb-4">{error}</div>
              <button
                onClick={getCurrentLocation}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Intentar nuevamente
              </button>
            </div>
          ) : isLoading && !currentLocation ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
              <div className="text-slate-600">Obteniendo ubicación...</div>
            </div>
          ) : currentLocation ? (
            <>
              {/* Mapa */}
              <div className="mb-4">
                <SimpleLocationMap
                  latitude={currentLocation.latitude}
                  longitude={currentLocation.longitude}
                  address={address}
                  timestamp={new Date().toISOString()}
                  isLive={isLive}
                />
              </div>

              {/* Controles */}
              <div className="space-y-3">
                {/* Toggle ubicación en vivo */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium">Ubicación en vivo</span>
                  </div>
                  <button
                    onClick={toggleLiveLocation}
                    className={`relative w-12 h-6 rounded-full transition ${
                      isLive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                        isLive ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Información de ubicación */}
                {address && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Dirección aproximada:</div>
                    <div className="text-sm text-slate-700">{address}</div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {currentLocation && (
          <div className="flex gap-3 p-4 border-t border-slate-200">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendLocation}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isLive ? 'Iniciar en vivo' : 'Enviar ubicación'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
