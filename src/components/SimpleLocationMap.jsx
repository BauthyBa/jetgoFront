import { MapPin, Navigation, Clock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

let leafletModulePromise = null
let leafletCssPromise = null

async function loadLeaflet() {
  if (!leafletModulePromise) {
    leafletModulePromise = import('leaflet').then((module) => module.default || module)
  }
  if (!leafletCssPromise) {
    leafletCssPromise = import('leaflet/dist/leaflet.css')
  }

  const L = await leafletModulePromise
  await leafletCssPromise
  return L
}

export default function SimpleLocationMap({
  latitude,
  longitude,
  address,
  timestamp,
  isLive = false,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function initialiseMap() {
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        setMapError(true)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setMapError(false)

      try {
        const waitForContainer = () =>
          new Promise((resolve, reject) => {
            let attempts = 0
            const maxAttempts = 50

            const check = () => {
              attempts += 1
              if (cancelled) {
                reject(new Error('Cancelled'))
                return
              }
              const el = mapContainerRef.current
              if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                resolve()
                return
              }
              if (attempts >= maxAttempts) {
                reject(new Error('Timeout waiting for map container'))
                return
              }
              setTimeout(check, 100)
            }

            check()
          })

        await waitForContainer()

        const L = await loadLeaflet()
        if (cancelled || !mapContainerRef.current) {
          return
        }

        // Limpiar instancias previas
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        const map = L.map(mapContainerRef.current, {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false,
        })

        mapInstanceRef.current = map

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '© OpenStreetMap contributors, © CARTO',
        }).addTo(map)

        map.setView([latitude, longitude], 16)
        map.dragging.disable()
        map.scrollWheelZoom.disable()
        map.doubleClickZoom.disable()
        map.boxZoom.disable()
        map.keyboard.disable()
        if (map.tap) {
          map.tap.disable()
        }

        const marker = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'simple-location-marker',
            html: `
              <div style="
                background: #10b981;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                border: 3px solid #1f2937;
                box-shadow: 0 6px 12px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  width: 8px;
                  height: 8px;
                  background: white;
                  border-radius: 50%;
                "></div>
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        }).addTo(map)

        markerRef.current = marker
        map.whenReady(() => {
          if (!cancelled) {
            setIsLoading(false)
          }
        })
        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (error) {
        if (error?.message === 'Cancelled') {
          return
        }
        console.error('Error inicializando mapa simple:', error)
        if (!cancelled) {
          setMapError(true)
          setIsLoading(false)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
          }
        }
      }
    }

    initialiseMap()

    return () => {
      cancelled = true
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [latitude, longitude])

  const createFallbackSVG = () => {
    const safeLat = typeof latitude === 'number' ? latitude : 0
    const safeLng = typeof longitude === 'number' ? longitude : 0
    const svgContent = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="#1f2937"/>
      <rect x="0" y="0" width="400" height="200" fill="#2d3748" opacity="0.3"/>
      <circle cx="200" cy="100" r="12" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
      <circle cx="200" cy="100" r="4" fill="#ffffff"/>
      <text x="200" y="130" text-anchor="middle" fill="#10b981" font-family="Arial" font-size="14" font-weight="bold">
        ${safeLat.toFixed(6)}, ${safeLng.toFixed(6)}
      </text>
      <text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="10">
        Ubicación compartida
      </text>
    </svg>`

    try {
      return `data:image/svg+xml;base64,${btoa(svgContent)}`
    } catch (error) {
      console.error('Error creando SVG fallback:', error)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMTBiOTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk1hcGEgbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='
    }
  }

  const handleMapClick = () => {
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative">
      <div
        className="w-full h-48 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:opacity-90 transition"
        onClick={handleMapClick}
      >
        {!mapError ? (
          <div className="relative h-full w-full">
            <div
              ref={mapContainerRef}
              className={`h-full w-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1f2937]">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-emerald-500 rounded-full" />
                  Cargando mapa...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1f2937]">
            <img
              src={createFallbackSVG()}
              alt="Ubicación en el mapa (fallback)"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2 pointer-events-none">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">
              {isLive ? 'Ubicación en vivo' : 'Ubicación compartida'}
            </span>
          </div>
        </div>

        <div className="absolute bottom-2 right-2">
          <button
            type="button"
            onClick={handleMapClick}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            Abrir en Maps
          </button>
        </div>
      </div>

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
            {typeof latitude === 'number' && typeof longitude === 'number'
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : 'Coordenadas no disponibles'}
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          <span className="text-emerald-400">📍</span> Precisión: Alta precisión GPS
        </div>
      </div>
    </div>
  )
}
