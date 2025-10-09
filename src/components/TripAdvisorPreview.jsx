import { useState, useEffect } from 'react'
import { searchLocations, getLocationDetails } from '@/services/tripadvisor'

export default function TripAdvisorPreview({ url, onClose }) {
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPreview() {
      try {
        setLoading(true)
        setError(null)
        
        // Extraer ID de la URL de TripAdvisor
        const locationId = extractLocationId(url)
        
        if (!locationId) {
          throw new Error('No se pudo extraer el ID de la ubicación')
        }

        // Por ahora, crear un preview básico sin API
        const basicPreview = {
          name: extractNameFromUrl(url),
          location_string: extractLocationFromUrl(url),
          rating: null,
          num_reviews: null,
          description: 'Información de TripAdvisor',
          photo: null
        }
        
        setPreviewData(basicPreview)
        
        // TODO: Implementar llamada real a la API cuando esté disponible
        // const details = await getLocationDetails(locationId)
        // if (details && details.data) {
        //   setPreviewData(details.data)
        // } else {
        //   throw new Error('No se pudieron obtener los detalles')
        // }
      } catch (err) {
        console.error('Error fetching TripAdvisor preview:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (url) {
      fetchPreview()
    }
  }, [url])

  // Función para extraer el ID de la ubicación de la URL
  function extractLocationId(url) {
    try {
      // Patrones comunes de URLs de TripAdvisor
      const patterns = [
        /tripadvisor\.com\/[^\/]+\/d\/(\d+)/,  // /Attraction_Review-d{id}
        /tripadvisor\.com\/[^\/]+\/d\/(\d+)-/,  // /Attraction_Review-d{id}-
        /tripadvisor\.com\/[^\/]+\/d\/(\d+)\?/, // /Attraction_Review-d{id}?
        /-d(\d+)-/,  // -d{id}-
        /-d(\d+)\./, // -d{id}.
        /-d(\d+)$/,  // -d{id} (end of string)
      ]
      
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Función para extraer el nombre del lugar de la URL
  function extractNameFromUrl(url) {
    try {
      // Buscar el nombre después de "Reviews-"
      const match = url.match(/Reviews-([^-]+)/)
      if (match && match[1]) {
        return match[1].replace(/-/g, ' ')
      }
      return 'Lugar en TripAdvisor'
    } catch {
      return 'Lugar en TripAdvisor'
    }
  }

  // Función para extraer la ubicación de la URL
  function extractLocationFromUrl(url) {
    try {
      // Buscar la ubicación al final de la URL
      const match = url.match(/-([A-Za-z_]+)$/)
      if (match && match[1]) {
        return match[1].replace(/_/g, ' ')
      }
      return 'Ubicación'
    } catch {
      return 'Ubicación'
    }
  }


  if (loading) {
    return (
      <div className="glass-card" style={{ 
        padding: 12, 
        margin: '8px 0', 
        border: '1px solid rgba(96, 165, 250, 0.3)',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(59, 130, 246, 0.05))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 16, 
            height: 16, 
            border: '2px solid #60a5fa', 
            borderTop: '2px solid transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }} />
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Cargando información de TripAdvisor...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card" style={{ 
        padding: 12, 
        margin: '8px 0', 
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
              Error al cargar preview
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              No se pudo obtener la información de TripAdvisor
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#94a3b8', 
              cursor: 'pointer',
              fontSize: 18,
              padding: 4
            }}
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  if (!previewData) {
    return null
  }

  const handleOpenTripAdvisor = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="glass-card" style={{ 
      padding: 12, 
      margin: '8px 0', 
      border: '1px solid rgba(96, 165, 250, 0.3)',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(59, 130, 246, 0.05))',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
    onClick={handleOpenTripAdvisor}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 8px 25px rgba(96, 165, 250, 0.2)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Imagen */}
        {previewData.photo && (
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '8px', 
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src={previewData.photo.images.medium?.url || previewData.photo.images.small?.url} 
              alt={previewData.name}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover' 
              }}
            />
          </div>
        )}
        
        {/* Información */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <h4 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                margin: 0, 
                marginBottom: 4,
                color: '#f1f5f9',
                lineHeight: 1.3
              }}>
                {previewData.name}
              </h4>
              {previewData.location_string && (
                <p style={{ 
                  fontSize: 12, 
                  color: '#94a3b8', 
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  📍 {previewData.location_string}
                </p>
              )}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: '#94a3b8', 
                cursor: 'pointer',
                fontSize: 16,
                padding: 4,
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ×
            </button>
          </div>

          {/* Rating */}
          {previewData.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                  ⭐ {previewData.rating}
                </span>
                {previewData.num_reviews && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    ({previewData.num_reviews} reseñas)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Descripción */}
          {previewData.description && (
            <p style={{ 
              fontSize: 12, 
              color: '#cbd5e1', 
              margin: 0,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {previewData.description}
            </p>
          )}

          {/* Botón de acción */}
          <div style={{ 
            marginTop: 8, 
            padding: '6px 12px', 
            background: 'rgba(96, 165, 250, 0.2)', 
            borderRadius: '6px',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            display: 'inline-block'
          }}>
            <span style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              🔗 Ver en TripAdvisor
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

