import { useState, useEffect } from 'react'
import { getTripReviews, calculateReviewStats } from '@/services/tripReviews'

export default function TripReviewStats({ 
  tripId, 
  organizerId, 
  userId,
  showDetailed = true 
}) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [tripId, organizerId, userId])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError('')

      const filters = { limit: 100 } // Cargar más reseñas para estadísticas precisas
      if (tripId) filters.trip_id = tripId
      if (organizerId) filters.organizer_id = organizerId
      if (userId) filters.reviewer_id = userId

      const response = await getTripReviews(filters)
      
      if (response.ok) {
        const reviews = response.data || []
        const calculatedStats = calculateReviewStats(reviews)
        setStats(calculatedStats)
      } else {
        setError(response.error || 'Error al cargar estadísticas')
      }
    } catch (err) {
      console.error('Error loading stats:', err)
      setError('Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  const renderRatingBar = (rating, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0
    
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 w-8">
          <span className="text-sm text-gray-600">{rating}</span>
          <span className="text-yellow-400">★</span>
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="w-8 text-right">
          <span className="text-sm text-gray-600">{count}</span>
        </div>
        <div className="w-12 text-right">
          <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    )
  }

  const renderCategoryStats = () => {
    if (!stats.categoryAverages || Object.keys(stats.categoryAverages).length === 0) {
      return null
    }

    const categoryLabels = {
      destination_rating: 'Destino',
      organization_rating: 'Organización', 
      communication_rating: 'Comunicación',
      value_rating: 'Valor'
    }

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Promedios por categoría</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(stats.categoryAverages).map(([category, average]) => (
            <div key={category} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {categoryLabels[category] || category}
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {average.toFixed(1)}/5
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-sm ${
                      star <= average ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error al cargar estadísticas
          </h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin estadísticas disponibles
          </h3>
          <p className="text-gray-600">
            No hay suficientes reseñas para mostrar estadísticas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Estadísticas de Reseñas
        </h3>
        <div className="text-sm text-gray-500">
          {stats.totalReviews} reseña{stats.totalReviews !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalReviews}
          </div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.averageRating}
          </div>
          <div className="text-sm text-gray-600">Promedio</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.recommendationRate}%
          </div>
          <div className="text-sm text-gray-600">Recomiendan</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.wouldTravelAgainRate}%
          </div>
          <div className="text-sm text-gray-600">Viajarían de nuevo</div>
        </div>
      </div>

      {showDetailed && (
        <>
          {/* Rating Distribution */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Distribución de calificaciones
            </h4>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map(rating => 
                renderRatingBar(
                  rating, 
                  stats.ratingDistribution[rating] || 0, 
                  stats.totalReviews
                )
              )}
            </div>
          </div>

          {/* Category Stats */}
          {renderCategoryStats()}
        </>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-lg ${
                  star <= Math.round(stats.averageRating) ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-sm text-gray-600">
            Calificación promedio: {stats.averageRating}/5
          </span>
        </div>
        
        {stats.recommendationRate > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {stats.recommendationRate}% de los usuarios recomiendan este {tripId ? 'viaje' : 'organizador'}
          </p>
        )}
      </div>
    </div>
  )
}
