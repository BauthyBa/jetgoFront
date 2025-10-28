/**
 * Servicio para obtener imágenes de Unsplash
 * API Documentation: https://unsplash.com/developers
 */

const UNSPLASH_ACCESS_KEY = '3mRQnmdKlbPt4Im-miwXXfGuNIdPAk4OE3tf4G75nG0'
const UNSPLASH_SECRET_KEY = 'sgrXRvohmerAC1-NZ6Vhz5YxjxLlEeH1M-79xzUcPFU'
const UNSPLASH_API_URL = 'https://api.unsplash.com'

/**
 * Busca imágenes relacionadas con un destino específico
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes encontradas
 */
export const searchDestinationImages = async (destination, options = {}) => {
  if (!destination || destination.trim().length < 2) {
    return []
  }

  const {
    limit = 5,
    orientation = 'landscape',
    quality = 'regular'
  } = options

  try {
    const params = new URLSearchParams({
      query: destination,
      per_page: limit.toString(),
      orientation,
      client_id: UNSPLASH_ACCESS_KEY
    })

    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return data.results.map(photo => ({
      id: photo.id,
      url: photo.urls[quality] || photo.urls.regular,
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      regular: photo.urls.regular,
      full: photo.urls.full,
      raw: photo.urls.raw,
      width: photo.width,
      height: photo.height,
      description: photo.description || photo.alt_description,
      alt_description: photo.alt_description,
      color: photo.color,
      user: {
        name: photo.user.name,
        username: photo.user.username,
        profile_image: photo.user.profile_image.small
      },
      created_at: photo.created_at,
      likes: photo.likes,
      downloads: photo.downloads
    }))
  } catch (error) {
    console.error('Error searching Unsplash images:', error)
    return []
  }
}

/**
 * Obtiene una imagen destacada para un destino
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<string|null>} URL de la imagen destacada
 */
export const getFeaturedImage = async (destination, options = {}) => {
  try {
    const images = await searchDestinationImages(destination, { ...options, limit: 1 })
    return images.length > 0 ? images[0].url : null
  } catch (error) {
    console.error('Error getting featured image from Unsplash:', error)
    return null
  }
}

/**
 * Busca imágenes de ciudades específicas
 * @param {string} cityName - Nombre de la ciudad
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes de la ciudad
 */
export const searchCityImages = async (cityName, options = {}) => {
  const searchTerms = [
    cityName,
    `${cityName} city`,
    `${cityName} travel`,
    `${cityName} tourism`,
    `${cityName} landmarks`,
    `${cityName} architecture`
  ]

  const allImages = []
  
  for (const term of searchTerms) {
    const images = await searchDestinationImages(term, { ...options, limit: 2 })
    allImages.push(...images)
  }

  // Eliminar duplicados basado en el ID
  const uniqueImages = allImages.filter((img, index, self) => 
    index === self.findIndex(i => i.id === img.id)
  )

  return uniqueImages.slice(0, options.limit || 5)
}

/**
 * Obtiene imágenes por categoría de destino
 * @param {string} destination - Nombre del destino
 * @param {string} category - Categoría (city, nature, architecture, etc.)
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes de la categoría
 */
export const searchImagesByCategory = async (destination, category, options = {}) => {
  const searchQuery = `${destination} ${category}`
  return await searchDestinationImages(searchQuery, options)
}

/**
 * Obtiene imágenes populares de un destino
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes populares
 */
export const getPopularImages = async (destination, options = {}) => {
  try {
    const params = new URLSearchParams({
      query: destination,
      per_page: (options.limit || 5).toString(),
      order_by: 'popular',
      orientation: 'landscape',
      client_id: UNSPLASH_ACCESS_KEY
    })

    const response = await fetch(`${UNSPLASH_API_URL}/search/photos?${params}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      regular: photo.urls.regular,
      full: photo.urls.full,
      width: photo.width,
      height: photo.height,
      description: photo.description || photo.alt_description,
      alt_description: photo.alt_description,
      color: photo.color,
      user: {
        name: photo.user.name,
        username: photo.user.username
      },
      likes: photo.likes,
      downloads: photo.downloads
    }))
  } catch (error) {
    console.error('Error getting popular images from Unsplash:', error)
    return []
  }
}

/**
 * Obtiene información de un fotógrafo
 * @param {string} username - Username del fotógrafo
 * @returns {Promise<Object|null>} Información del fotógrafo
 */
export const getPhotographerInfo = async (username) => {
  try {
    const response = await fetch(`${UNSPLASH_API_URL}/users/${username}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      id: data.id,
      username: data.username,
      name: data.name,
      bio: data.bio,
      location: data.location,
      profile_image: data.profile_image,
      total_photos: data.total_photos,
      total_likes: data.total_likes,
      total_collections: data.total_collections
    }
  } catch (error) {
    console.error('Error getting photographer info from Unsplash:', error)
    return null
  }
}

/**
 * Hook personalizado para cargar imágenes de destino desde Unsplash
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Estado de la carga y datos
 */
export const useUnsplashImages = (destination, options = {}) => {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setImages([])
      return
    }

    const loadImages = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const results = await searchDestinationImages(destination, options)
        setImages(results)
      } catch (err) {
        setError(err.message)
        setImages([])
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [destination, JSON.stringify(options)])

  return { images, loading, error }
}

/**
 * Obtiene una imagen optimizada para diferentes tamaños
 * @param {Object} photo - Objeto de foto de Unsplash
 * @param {string} size - Tamaño deseado (thumb, small, regular, full)
 * @returns {string} URL de la imagen optimizada
 */
export const getOptimizedImageUrl = (photo, size = 'regular') => {
  if (!photo || !photo.urls) return null
  
  const sizeMap = {
    thumb: photo.urls.thumb,
    small: photo.urls.small,
    regular: photo.urls.regular,
    full: photo.urls.full,
    raw: photo.urls.raw
  }
  
  return sizeMap[size] || photo.urls.regular
}

/**
 * Genera un placeholder con el color dominante de la imagen
 * @param {Object} photo - Objeto de foto de Unsplash
 * @returns {string} CSS background con el color dominante
 */
export const getColorPlaceholder = (photo) => {
  if (!photo || !photo.color) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  
  return `linear-gradient(135deg, ${photo.color} 0%, ${photo.color}CC 100%)`
}
