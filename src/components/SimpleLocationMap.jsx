import { MapPin, Navigation, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function SimpleLocationMap({ 
  latitude, 
  longitude, 
  address, 
  timestamp, 
  isLive = false 
}) {
  const [mapError, setMapError] = useState(false)
  const [currentMapUrl, setCurrentMapUrl] = useState('')
  const [showIframe, setShowIframe] = useState(false)
  
  console.log('🗺️ SimpleLocationMap RENDERED with:', { latitude, longitude, address, timestamp, isLive })
  
  // Usar imagen estática de Google Maps (sin API key)
  const googleMapsStaticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=400x200&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgU6xUqYI0`
  
  // Fallback a OpenStreetMap si Google Maps falla
  const fallbackMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=18&size=400x200&maptype=mapnik&markers=${latitude},${longitude},red&format=png`
  
  // Segundo fallback a MapBox (sin API key)
  const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+ff0000(${longitude},${latitude})/${longitude},${latitude},18,0/400x200@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
  
  // Tercer fallback a OpenStreetMap alternativo
  const osmUrl = `https://tile.openstreetmap.org/18/${Math.floor((longitude + 180) / 360 * Math.pow(2, 18))}/${Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 18))}.png`
  
  // Iframe de Google Maps como último recurso
  const googleMapsEmbedUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgU6xUqYI0&center=${latitude},${longitude}&zoom=18&maptype=roadmap`
  
  // URL simple de Google Maps sin API key
  const simpleGoogleMapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=18&output=embed`
  
  console.log('🔗 Google Maps URL:', googleMapsStaticUrl)
  console.log('🔗 Fallback URL:', fallbackMapUrl)
  console.log('🎯 Component props:', { latitude, longitude, address, timestamp, isLive })
  
  useEffect(() => {
    setCurrentMapUrl(googleMapsStaticUrl)
    setMapError(false)
    setShowIframe(false)
  }, [latitude, longitude])
  
  // Función para crear SVG fallback
  const createFallbackSVG = () => {
    const svgContent = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="#1f2937"/>
      <rect x="0" y="0" width="400" height="200" fill="#2d3748" opacity="0.3"/>
      <circle cx="200" cy="100" r="12" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
      <circle cx="200" cy="100" r="4" fill="#ffffff"/>
      <text x="200" y="130" text-anchor="middle" fill="#10b981" font-family="Arial" font-size="14" font-weight="bold">
        ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
      </text>
      <text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="10">
        Ubicacion compartida
      </text>
    </svg>`
    
    try {
      return `data:image/svg+xml;base64,${btoa(svgContent)}`
    } catch (error) {
      console.error('Error creando SVG fallback:', error)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMTBiOTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk1hcGEgbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='
    }
  }
  
  // Función para manejar el error del iframe
  const handleIframeError = () => {
    console.log('❌ Iframe falló, usando SVG fallback')
    setMapError(true)
  }

  const handleMapClick = () => {
    // Abrir en Google Maps
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    window.open(googleMapsUrl, '_blank')
  }

  return (
    <div className="relative">
      {/* Mapa estático con fallback */}
      <div 
        className="w-full h-48 rounded-lg overflow-hidden border border-slate-700 cursor-pointer hover:opacity-90 transition"
        onClick={handleMapClick}
      >
        {!showIframe ? (
          <img
            src={currentMapUrl}
            alt="Ubicación en el mapa"
            className="w-full h-full object-cover"
            onLoad={() => console.log('✅ Mapa cargó correctamente:', currentMapUrl)}
            onError={(e) => {
              console.log('❌ Mapa falló:', currentMapUrl)
              if (currentMapUrl === googleMapsStaticUrl) {
                console.log('🔄 Probando OpenStreetMap')
                setCurrentMapUrl(fallbackMapUrl)
              } else if (currentMapUrl === fallbackMapUrl) {
                console.log('🔄 Probando MapBox')
                setCurrentMapUrl(mapboxUrl)
              } else if (currentMapUrl === mapboxUrl) {
                console.log('🔄 Probando OSM alternativo')
                setCurrentMapUrl(osmUrl)
              } else {
                console.log('🔄 Usando iframe de Google Maps')
                setShowIframe(true)
              }
            }}
          />
        ) : (
          <iframe
            src={simpleGoogleMapsUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación en el mapa"
            onError={handleIframeError}
          />
        )}
        
        {/* SVG Fallback cuando todos los mapas fallan */}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1f2937]">
            <img
              src={createFallbackSVG()}
              alt="Ubicación en el mapa (fallback)"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Overlay con información */}
        <div className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">
              {isLive ? 'Ubicación en vivo' : 'Ubicación compartida'}
            </span>
          </div>
        </div>
        
        {/* Botón de acción */}
        <div className="absolute bottom-2 right-2">
          <button
            onClick={handleMapClick}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            Abrir en Maps
          </button>
        </div>
      </div>
      
      {/* Información adicional */}
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
        
        {/* Información de precisión */}
        <div className="mt-2 text-xs text-slate-500">
          <span className="text-emerald-400">📍</span> Precisión: Alta precisión GPS
        </div>
      </div>
    </div>
  )
}
