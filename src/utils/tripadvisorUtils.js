// Utilidades para detectar y procesar enlaces de TripAdvisor

/**
 * Detecta si una URL es de TripAdvisor
 * @param {string} url - URL a verificar
 * @returns {boolean} - true si es un enlace de TripAdvisor
 */
export function isTripAdvisorUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  return (url.includes('tripadvisor.com') || url.includes('tripadvisor.es') || url.includes('tripadvisor.co.uk') || url.includes('tripadvisor.fr') || url.includes('tripadvisor.de') || url.includes('tripadvisor.it')) && (
    url.includes('/d/') || 
    url.includes('/Attraction_Review') ||
    url.includes('/Restaurant_Review') ||
    url.includes('/Hotel_Review')
  )
}

/**
 * Extrae el ID de ubicación de una URL de TripAdvisor
 * @param {string} url - URL de TripAdvisor
 * @returns {string|null} - ID de la ubicación o null si no se puede extraer
 */
export function extractLocationId(url) {
  if (!isTripAdvisorUrl(url)) return null
  
  try {
    // Patrones comunes de URLs de TripAdvisor
    const patterns = [
      // Patrones con /d/ (formato estándar)
      /tripadvisor\.(com|es|co\.uk|fr|de|it)\/[^\/]+\/d\/(\d+)/,  // /Attraction_Review-d{id}
      /tripadvisor\.(com|es|co\.uk|fr|de|it)\/[^\/]+\/d\/(\d+)-/,  // /Attraction_Review-d{id}-
      /tripadvisor\.(com|es|co\.uk|fr|de|it)\/[^\/]+\/d\/(\d+)\?/, // /Attraction_Review-d{id}?
      /tripadvisor\.(com|es|co\.uk|fr|de|it)\/[^\/]+\/d\/(\d+)$/,  // /Attraction_Review-d{id} (end of string)
      
      // Patrones con -d{id}- (formato alternativo como el que enviaste)
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

/**
 * Encuentra todos los enlaces de TripAdvisor en un texto
 * @param {string} text - Texto a analizar
 * @returns {Array} - Array de objetos con {url, startIndex, endIndex}
 */
export function findTripAdvisorLinks(text) {
  if (!text || typeof text !== 'string') return []
  
  const links = []
  // Regex mejorado para capturar URLs de TripAdvisor con diferentes formatos
  const urlRegex = /https?:\/\/(?:www\.)?tripadvisor\.(?:com|es|co\.uk|fr|de|it)\/[^\s]+/g
  let match
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]
    if (isTripAdvisorUrl(url)) {
      links.push({
        url: url,
        startIndex: match.index,
        endIndex: match.index + url.length
      })
    }
  }
  
  return links
}

/**
 * Procesa un mensaje y extrae enlaces de TripAdvisor
 * @param {string} message - Contenido del mensaje
 * @returns {Object} - {hasTripAdvisorLinks: boolean, links: Array, cleanMessage: string}
 */
export function processMessageForTripAdvisor(message) {
  if (!message || typeof message !== 'string') {
    return { hasTripAdvisorLinks: false, links: [], cleanMessage: message }
  }
  
  const links = findTripAdvisorLinks(message)
  
  return {
    hasTripAdvisorLinks: links.length > 0,
    links: links,
    cleanMessage: message // Por ahora mantenemos el mensaje original
  }
}

/**
 * Valida si una URL de TripAdvisor es válida y procesable
 * @param {string} url - URL a validar
 * @returns {boolean} - true si la URL es válida y procesable
 */
export function isValidTripAdvisorUrl(url) {
  if (!isTripAdvisorUrl(url)) return false
  
  const locationId = extractLocationId(url)
  return locationId !== null && locationId.length > 0
}

/**
 * Normaliza una URL de TripAdvisor para mejor procesamiento
 * @param {string} url - URL original
 * @returns {string} - URL normalizada
 */
export function normalizeTripAdvisorUrl(url) {
  if (!isTripAdvisorUrl(url)) return url
  
  try {
    const urlObj = new URL(url)
    // Remover parámetros innecesarios pero mantener la estructura básica
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`
  } catch {
    return url
  }
}
