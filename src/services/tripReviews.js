import { api } from './api'

/**
 * Servicios para manejo de reseñas de viajes
 */

// Crear una nueva reseña de viaje
export async function createTripReview(reviewData) {
  try {
    const response = await api.post('/trip-reviews/', reviewData)
    return response.data
  } catch (error) {
    console.error('Error creating trip review:', error)
    throw error
  }
}

// Obtener lista de reseñas con filtros
export async function getTripReviews(filters = {}) {
  try {
    const params = new URLSearchParams()
    
    if (filters.trip_id) params.append('trip_id', filters.trip_id)
    if (filters.organizer_id) params.append('organizer_id', filters.organizer_id)
    if (filters.reviewer_id) params.append('reviewer_id', filters.reviewer_id)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)

    const response = await api.get(`/trip-reviews/list/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('Error fetching trip reviews:', error)
    throw error
  }
}

// Obtener detalles de una reseña específica
export async function getTripReviewDetail(reviewId) {
  try {
    const response = await api.get(`/trip-reviews/${reviewId}/`)
    return response.data
  } catch (error) {
    console.error('Error fetching trip review detail:', error)
    throw error
  }
}

// Actualizar una reseña existente
export async function updateTripReview(reviewId, updateData) {
  try {
    const response = await api.put(`/trip-reviews/${reviewId}/update/`, updateData)
    return response.data
  } catch (error) {
    console.error('Error updating trip review:', error)
    throw error
  }
}

// Eliminar una reseña
export async function deleteTripReview(reviewId, reviewerId) {
  try {
    const response = await api.delete(`/trip-reviews/${reviewId}/delete/`, {
      data: { reviewer_id: reviewerId }
    })
    return response.data
  } catch (error) {
    console.error('Error deleting trip review:', error)
    throw error
  }
}

// Responder a una reseña (solo organizadores)
export async function respondToTripReview(reviewId, responseData) {
  try {
    const response = await api.post(`/trip-reviews/${reviewId}/response/`, responseData)
    return response.data
  } catch (error) {
    console.error('Error responding to trip review:', error)
    throw error
  }
}

// Obtener categorías de evaluación disponibles
export async function getTripReviewCategories() {
  try {
    const response = await api.get('/trip-reviews/categories/')
    return response.data
  } catch (error) {
    console.error('Error fetching trip review categories:', error)
    throw error
  }
}

// Verificar si un usuario puede reseñar un viaje
export async function checkTripReviewEligibility(tripId, userId) {
  try {
    const response = await api.get(`/trip-reviews/eligibility/?trip_id=${tripId}&user_id=${userId}`)
    return response.data
  } catch (error) {
    console.error('Error checking trip review eligibility:', error)
    throw error
  }
}

// Obtener reseñas de un viaje específico
export async function getTripReviewsByTrip(tripId, limit = 10, offset = 0) {
  return getTripReviews({ trip_id: tripId, limit, offset })
}

// Obtener reseñas de un organizador específico
export async function getTripReviewsByOrganizer(organizerId, limit = 10, offset = 0) {
  return getTripReviews({ organizer_id: organizerId, limit, offset })
}

// Obtener reseñas de un usuario específico
export async function getTripReviewsByUser(userId, limit = 10, offset = 0) {
  return getTripReviews({ reviewer_id: userId, limit, offset })
}

// Calcular estadísticas de reseñas
export function calculateReviewStats(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {},
      recommendationRate: 0,
      wouldTravelAgainRate: 0,
      categoryAverages: {}
    }
  }

  const totalReviews = reviews.length
  
  // Calcular promedio general
  const totalRating = reviews.reduce((sum, review) => sum + (review.overall_rating || 0), 0)
  const averageRating = totalRating / totalReviews

  // Distribución de ratings
  const ratingDistribution = {}
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i] = reviews.filter(r => r.overall_rating === i).length
  }

  // Tasas de recomendación
  const recommendedCount = reviews.filter(r => r.would_recommend).length
  const wouldTravelAgainCount = reviews.filter(r => r.would_travel_again).length
  
  const recommendationRate = (recommendedCount / totalReviews) * 100
  const wouldTravelAgainRate = (wouldTravelAgainCount / totalReviews) * 100

  // Promedios por categoría
  const categoryAverages = {}
  const categories = ['destination_rating', 'organization_rating', 'communication_rating', 'value_rating']
  
  categories.forEach(category => {
    const validRatings = reviews.filter(r => r[category] !== null && r[category] !== undefined)
    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, r) => acc + r[category], 0)
      categoryAverages[category] = sum / validRatings.length
    }
  })

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    recommendationRate: Math.round(recommendationRate * 10) / 10,
    wouldTravelAgainRate: Math.round(wouldTravelAgainRate * 10) / 10,
    categoryAverages
  }
}

// Formatear fecha para mostrar
export function formatReviewDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Generar texto de rating
export function getRatingText(rating) {
  const ratingTexts = {
    1: 'Muy malo',
    2: 'Malo', 
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente'
  }
  return ratingTexts[rating] || 'Sin calificar'
}

// Generar estrellas para mostrar
export function generateStars(rating, maxStars = 5) {
  const stars = []
  for (let i = 1; i <= maxStars; i++) {
    stars.push({
      value: i,
      filled: i <= rating,
      half: i === Math.ceil(rating) && rating % 1 !== 0
    })
  }
  return stars
}

// Validar datos de reseña antes de enviar
export function validateTripReviewData(data) {
  const errors = []
  
  if (!data.trip_id) errors.push('ID del viaje es requerido')
  if (!data.reviewer_id) errors.push('ID del revisor es requerido')
  if (!data.organizer_id) errors.push('ID del organizador es requerido')
  
  if (!data.overall_rating || data.overall_rating < 1 || data.overall_rating > 5) {
    errors.push('La calificación general debe estar entre 1 y 5')
  }
  
  // Validar ratings opcionales
  const optionalRatings = ['destination_rating', 'organization_rating', 'communication_rating', 'value_rating']
  optionalRatings.forEach(rating => {
    if (data[rating] !== undefined && data[rating] !== null && (data[rating] < 1 || data[rating] > 5)) {
      errors.push(`La calificación de ${rating} debe estar entre 1 y 5`)
    }
  })
  
  // Validar que al menos un comentario esté presente
  const commentFields = ['overall_comment', 'destination_comment', 'organization_comment', 'communication_comment', 'value_comment', 'trip_highlights']
  const hasComment = commentFields.some(field => data[field] && data[field].trim())
  
  if (!hasComment) {
    errors.push('Debes proporcionar al menos un comentario sobre el viaje')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
