import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation, Clock } from 'lucide-react'

export default function LocationMap({ 
  latitude, 
  longitude, 
  address, 
  timestamp, 
  isLive = false,
  onLocationUpdate 
}) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [marker, setMarker] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) return

    const initMap = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Función para esperar a que el contenedor esté disponible
        const waitForContainer = () => {
          return new Promise((resolve, reject) => {
            let attempts = 0
            const maxAttempts = 50 // 5 segundos máximo
            
            const checkContainer = () => {
              attempts++
              
              if (mapRef.current) {
                const rect = mapRef.current.getBoundingClientRect()
                if (rect.width > 0 && rect.height > 0) {
                  resolve()
                  return
                }
              }
              
              if (attempts >= maxAttempts) {
                reject(new Error('Timeout waiting for map container'))
                return
              }
              
              setTimeout(checkContainer, 100)
            }
            
            checkContainer()
          })
        }

        // Esperar a que el contenedor esté disponible
        await waitForContainer()

        // Crear el mapa usando Leaflet (más ligero que Google Maps)
        const L = await import('leaflet')
        
        // Importar estilos de Leaflet
        await import('leaflet/dist/leaflet.css')

        // Limpiar el contenedor si ya existe un mapa
        if (mapRef.current._leaflet_id) {
          mapRef.current._leaflet_id = null
        }

        // Crear el mapa
        const mapInstance = L.map(mapRef.current).setView([latitude, longitude], 15)
        
        // Agregar tiles con tema oscuro para coincidir con el chat
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors, © CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(mapInstance)

        // Crear marcador con colores del chat
        const markerInstance = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                background: #10b981;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 3px solid #1f2937;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  width: 10px;
                  height: 10px;
                  background: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(mapInstance)

        // Agregar popup con información (tema oscuro)
        const popupContent = `
          <div style="padding: 12px; min-width: 220px; background: #1f2937; border-radius: 8px;">
            <div style="font-weight: 600; color: #10b981; margin-bottom: 6px; font-size: 14px;">
              📍 Ubicación ${isLive ? 'en vivo' : 'compartida'}
            </div>
            ${address ? `<div style="color: #d1d5db; font-size: 13px; margin-bottom: 6px; line-height: 1.4;">${address}</div>` : ''}
            <div style="color: #9ca3af; font-size: 11px;">
              ${timestamp ? new Date(timestamp).toLocaleString() : 'Ahora'}
            </div>
          </div>
        `
        markerInstance.bindPopup(popupContent).openPopup()

        setMap(mapInstance)
        setMarker(markerInstance)

        // Si es ubicación en vivo, actualizar posición
        if (isLive && onLocationUpdate) {
          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude: lat, longitude: lng } = position.coords
              markerInstance.setLatLng([lat, lng])
              mapInstance.setView([lat, lng], 15)
              onLocationUpdate({ latitude: lat, longitude: lng })
            },
            (error) => {
              console.error('Error getting location:', error)
              setError('Error obteniendo ubicación')
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 1000
            }
          )

          return () => navigator.geolocation.clearWatch(watchId)
        }

      } catch (err) {
        console.error('Error initializing map:', err)
        if (err.message.includes('Timeout')) {
          setError('El mapa tardó demasiado en cargar. Intenta nuevamente.')
        } else {
          setError('Error cargando el mapa')
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Pequeño delay para asegurar que el componente esté montado
    const timeoutId = setTimeout(initMap, 200)
    
    return () => {
      clearTimeout(timeoutId)
      if (map) {
        map.remove()
      }
    }
  }, [latitude, longitude, isLive])

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-[#1f2937] rounded-lg flex items-center justify-center border border-slate-700">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-emerald-500 rounded-full"></div>
          Cargando mapa...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-48 bg-[#1f2937] border border-red-500/30 rounded-lg flex items-center justify-center">
        <div className="text-red-400 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <div className="font-medium">Error cargando mapa</div>
          <div className="text-sm text-red-300">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-48 rounded-lg overflow-hidden border border-slate-700" />
      
      {/* Información adicional (tema oscuro) */}
      <div className="mt-2 p-3 bg-[#1f2937] rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">
            {isLive ? 'Ubicación en vivo' : 'Ubicación compartida'}
          </span>
        </div>
        
        {address && (
          <div className="mt-1 text-sm text-slate-300 truncate">
            {address}
          </div>
        )}
        
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timestamp ? new Date(timestamp).toLocaleString() : 'Ahora'}
          </div>
          <div className="flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  )
}
