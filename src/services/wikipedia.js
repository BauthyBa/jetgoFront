/**
 * Servicio para obtener imágenes de Wikipedia usando la API de MediaWiki
 * Basado en la documentación: https://www.mediawiki.org/wiki/API:Images
 * Ahora funciona como fallback cuando Unsplash no tiene resultados
 */

import { getFeaturedImage as getUnsplashImage, searchDestinationImages as searchUnsplashImages } from './unsplash'

const WIKIPEDIA_API_URL = 'https://es.wikipedia.org/w/api.php'

/**
 * Busca imágenes relacionadas con un destino específico
 * Ahora usa Unsplash como fuente principal y Wikipedia como fallback
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes encontradas
 */
export const searchDestinationImages = async (destination, options = {}) => {
  if (!destination || destination.trim().length < 2) {
    return []
  }

  try {
    // Primero intentamos con Unsplash
    const unsplashImages = await searchUnsplashImages(destination, options)
    
    if (unsplashImages.length > 0) {
      return unsplashImages
    }

    // Si Unsplash no tiene resultados, usamos Wikipedia como fallback
    console.log('No images found on Unsplash, trying Wikipedia...')
    return await searchWikipediaImages(destination, options)
  } catch (error) {
    console.error('Error searching images:', error)
    return []
  }
}

/**
 * Busca imágenes en Wikipedia (método original)
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Promise<Array>} Lista de imágenes encontradas
 */
const searchWikipediaImages = async (destination, options = {}) => {
  const {
    limit = 5,
    language = 'es'
  } = options

  try {
    // Primero buscamos páginas relacionadas con el destino
    const searchParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: destination,
      srlimit: 3,
      srnamespace: 0,
      origin: '*'
    })

    const searchResponse = await fetch(`${WIKIPEDIA_API_URL}?${searchParams}`)
    if (!searchResponse.ok) {
      throw new Error(`HTTP error! status: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const pages = searchData.query?.search || []

    if (pages.length === 0) {
      return []
    }

    // Obtenemos las imágenes de las páginas encontradas
    const pageTitles = pages.map(page => page.title).join('|')
    
    const imageParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'images',
      titles: pageTitles,
      imlimit: limit,
      origin: '*'
    })

    const imageResponse = await fetch(`${WIKIPEDIA_API_URL}?${imageParams}`)
    if (!imageResponse.ok) {
      throw new Error(`HTTP error! status: ${imageResponse.status}`)
    }

    const imageData = await imageResponse.json()
    const pagesData = imageData.query?.pages || {}

    // Procesamos las imágenes encontradas
    const images = []
    Object.values(pagesData).forEach(page => {
      if (page.images) {
        page.images.forEach(img => {
          // Filtrar solo imágenes relevantes (no archivos de sistema)
          if (img.title && !img.title.includes('Commons:') && !img.title.includes('User:')) {
            images.push({
              title: img.title,
              filename: img.title.replace('File:', ''),
              url: getImageUrl(img.title),
              pageTitle: page.title
            })
          }
        })
      }
    })

    return images.slice(0, limit)
  } catch (error) {
    console.error('Error searching Wikipedia images:', error)
    return []
  }
}

/**
 * Obtiene la URL de una imagen de Wikipedia
 * @param {string} imageTitle - Título de la imagen (ej: "File:Example.jpg")
 * @returns {string} URL de la imagen
 */
const getImageUrl = (imageTitle) => {
  if (!imageTitle || !imageTitle.startsWith('File:')) {
    return null
  }

  const filename = imageTitle.replace('File:', '')
  const encodedFilename = encodeURIComponent(filename)
  
  // URL para obtener la imagen en tamaño mediano (300px)
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${getImagePath(filename)}/300px-${encodedFilename}`
}

/**
 * Construye la ruta de la imagen basada en su nombre
 * @param {string} filename - Nombre del archivo
 * @returns {string} Ruta de la imagen
 */
const getImagePath = (filename) => {
  const firstChar = filename.charAt(0).toUpperCase()
  const firstTwoChars = filename.substring(0, 2).toUpperCase()
  
  if (filename.length >= 2) {
    return `${firstChar}/${firstTwoChars}/${filename}`
  }
  return `${firstChar}/${filename}`
}

/**
 * Obtiene información detallada de una imagen específica
 * @param {string} imageTitle - Título de la imagen
 * @returns {Promise<Object|null>} Información de la imagen
 */
export const getImageInfo = async (imageTitle) => {
  if (!imageTitle) return null

  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      titles: imageTitle,
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: 300,
      origin: '*'
    })

    const response = await fetch(`${WIKIPEDIA_API_URL}?${params}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const pages = data.query?.pages || {}
    
    for (const page of Object.values(pages)) {
      if (page.imageinfo && page.imageinfo.length > 0) {
        const imageInfo = page.imageinfo[0]
        return {
          url: imageInfo.thumburl || imageInfo.url,
          width: imageInfo.thumbwidth || imageInfo.width,
          height: imageInfo.thumbheight || imageInfo.height,
          mime: imageInfo.mime,
          size: imageInfo.size,
          description: imageInfo.extmetadata?.ImageDescription?.value || '',
          artist: imageInfo.extmetadata?.Artist?.value || ''
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error getting image info:', error)
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
    `${cityName} ciudad`,
    `${cityName} turismo`,
    `${cityName} lugares`,
    `${cityName} paisaje`
  ]

  const allImages = []
  
  for (const term of searchTerms) {
    const images = await searchDestinationImages(term, { ...options, limit: 2 })
    allImages.push(...images)
  }

  // Eliminar duplicados
  const uniqueImages = allImages.filter((img, index, self) => 
    index === self.findIndex(i => i.title === img.title)
  )

  return uniqueImages.slice(0, options.limit || 5)
}

/**
 * Obtiene una imagen destacada para un destino
 * Ahora usa Unsplash como fuente principal y Wikipedia como fallback
 * @param {string} destination - Nombre del destino
 * @returns {Promise<string|null>} URL de la imagen destacada
 */
export const getFeaturedImage = async (destination) => {
  try {
    // Primero intentamos con Unsplash
    const unsplashImage = await getUnsplashImage(destination)
    
    if (unsplashImage) {
      return unsplashImage
    }

    // Si Unsplash no tiene resultados, usamos Wikipedia como fallback
    console.log('No image found on Unsplash, trying Wikipedia...')
    const images = await searchWikipediaImages(destination, { limit: 1 })
    return images.length > 0 ? images[0].url : null
  } catch (error) {
    console.error('Error getting featured image:', error)
    return null
  }
}

/**
 * Hook personalizado para cargar imágenes de destino
 * @param {string} destination - Nombre del destino
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Estado de la carga y datos
 */
export const useDestinationImages = (destination, options = {}) => {
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
