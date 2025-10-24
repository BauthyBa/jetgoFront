/**
 * Servicio para integración con la API de Nominatim (OpenStreetMap)
 * Proporciona autocompletado de lugares para formularios de viajes
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

/**
 * Busca lugares usando la API de Nominatim
 * @param {string} query - Texto de búsqueda
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de lugares encontrados
 */
export const searchPlaces = async (query, options = {}) => {
  if (!query || query.length < 2) {
    return []
  }

  const {
    limit = 10,
    countrycodes = '',
    addressdetails = 1,
    format = 'json',
    dedupe = 1
  } = options

  try {
    const params = new URLSearchParams({
      q: query,
      format,
      limit: limit.toString(),
      addressdetails: addressdetails.toString(),
      dedupe: dedupe.toString(),
      countrycodes,
      'accept-language': 'es,en'
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'JetGo-Travel-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Procesar y formatear los resultados
    return data.map(place => ({
      place_id: place.place_id,
      display_name: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      type: place.type,
      importance: place.importance,
      address: place.address || {},
      boundingbox: place.boundingbox
    }))
  } catch (error) {
    console.error('Error searching places with Nominatim:', error)
    return []
  }
}

/**
 * Busca ciudades específicamente (filtra por tipo de lugar)
 * @param {string} query - Texto de búsqueda
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de ciudades encontradas
 */
export const searchCities = async (query, options = {}) => {
  const {
    limit = 8,
    countrycodes = '',
    addressdetails = 1
  } = options

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: limit.toString(),
      addressdetails: addressdetails.toString(),
      dedupe: '1',
      countrycodes,
      'accept-language': 'es,en',
      // Filtrar por tipos de lugares relevantes para viajes
      featuretype: 'city,town,village,airport,station'
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'JetGo-Travel-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    // Procesar y formatear los resultados, priorizando ciudades
    return data
      .map(place => ({
        place_id: place.place_id,
        display_name: formatPlaceName(place),
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type,
        importance: place.importance,
        address: place.address || {},
        boundingbox: place.boundingbox
      }))
      .sort((a, b) => b.importance - a.importance) // Ordenar por importancia
  } catch (error) {
    console.error('Error searching cities with Nominatim:', error)
    return []
  }
}

/**
 * Busca países específicamente
 * @param {string} query - Texto de búsqueda
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de países encontrados
 */
export const searchCountries = async (query, options = {}) => {
  const {
    limit = 5,
    addressdetails = 1
  } = options

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: limit.toString(),
      addressdetails: addressdetails.toString(),
      dedupe: '1',
      'accept-language': 'es,en',
      featuretype: 'country'
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'JetGo-Travel-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return data.map(place => ({
      place_id: place.place_id,
      display_name: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      type: place.type,
      importance: place.importance,
      address: place.address || {},
      country_code: place.address?.country_code?.toUpperCase() || ''
    }))
  } catch (error) {
    console.error('Error searching countries with Nominatim:', error)
    return []
  }
}

/**
 * Formatea el nombre del lugar para mostrar de manera más amigable
 * @param {Object} place - Lugar de Nominatim
 * @returns {string} Nombre formateado
 */
const formatPlaceName = (place) => {
  const { address = {}, display_name } = place
  
  // Si es una ciudad, mostrar: Ciudad, País
  if (address.city || address.town || address.village) {
    const cityName = address.city || address.town || address.village
    const countryName = address.country || ''
    return countryName ? `${cityName}, ${countryName}` : cityName
  }
  
  // Si es un aeropuerto, mostrar: Aeropuerto, Ciudad, País
  if (address.aeroway || place.type === 'airport') {
    const airportName = address.aeroway || 'Aeropuerto'
    const cityName = address.city || address.town || ''
    const countryName = address.country || ''
    
    if (cityName && countryName) {
      return `${airportName}, ${cityName}, ${countryName}`
    } else if (cityName) {
      return `${airportName}, ${cityName}`
    }
  }
  
  // Si es una estación, mostrar: Estación, Ciudad, País
  if (address.railway || place.type === 'station') {
    const stationName = address.railway || 'Estación'
    const cityName = address.city || address.town || ''
    const countryName = address.country || ''
    
    if (cityName && countryName) {
      return `${stationName}, ${cityName}, ${countryName}`
    } else if (cityName) {
      return `${stationName}, ${cityName}`
    }
  }
  
  // Fallback al nombre completo
  return display_name
}

/**
 * Obtiene detalles de un lugar específico por su place_id
 * @param {string} placeId - ID del lugar en Nominatim
 * @returns {Promise<Object|null>} Detalles del lugar
 */
export const getPlaceDetails = async (placeId) => {
  if (!placeId) return null

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      format: 'json',
      addressdetails: '1',
      'accept-language': 'es,en'
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}/details?${params}`, {
      headers: {
        'User-Agent': 'JetGo-Travel-App/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting place details from Nominatim:', error)
    return null
  }
}

/**
 * Hook personalizado para debounce de búsquedas
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Delay en milisegundos
 * @returns {Function} Función con debounce
 */
export const useDebounce = (callback, delay = 300) => {
  let timeoutId
  
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => callback(...args), delay)
  }
}
