import { useState, useEffect } from 'react'
import TripReviewCard from './TripReviewCard'
import { getTripReviews, calculateReviewStats } from '@/services/tripReviews'
import { Button } from '@/components/ui/button'

export default function TripReviewsList({ 
  tripId, 
  organizerId, 
  userId,
  showTripInfo = true,
  showOrganizerInfo = true,
  canEdit = false,
  canDelete = false,
  canRespond = false,
  onEdit,
  onDelete,
  onRespond,
  limit = 10
}) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [stats, setStats] = useState(null)

  const loadReviews = async (reset = false) => {
    try {
      setLoading(true)
      setError('')

      const filters = {
        limit,
        offset: reset ? 0 : offset
      }

      if (tripId) filters.trip_id = tripId
      if (organizerId) filters.organizer_id = organizerId
      if (userId) filters.reviewer_id = userId

      const response = await getTripReviews(filters)
      
      if (response.ok) {
        const newReviews = response.data || []
        
        if (reset) {
          setReviews(newReviews)
          setOffset(limit)
        } else {
          setReviews(prev => [...prev, ...newReviews])
          setOffset(prev => prev + limit)
        }
        
        setHasMore(newReviews.length === limit)
        
        // Calcular estadísticas si hay reseñas
        if (newReviews.length > 0) {
          const allReviews = reset ? newReviews : [...reviews, ...newReviews]
          setStats(calculateReviewStats(allReviews))
        }
      } else {
        setError(response.error || 'Error al cargar las reseñas')
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
      setError('Error al cargar las reseñas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews(true)
  }, [tripId, organizerId, userId])

  const handleLoadMore = () => {
    loadReviews(false)
  }

  const handleReviewUpdate = (updatedReview) => {
    setReviews(prev => 
      prev.map(review => 
        review.id === updatedReview.id ? updatedReview : review
      )
    )
  }

  const handleReviewDelete = (deletedReview) => {
    setReviews(prev => prev.filter(review => review.id !== deletedReview.id))
    onDelete?.(deletedReview)
  }

  const renderStats = () => {
    if (!stats || stats.totalReviews === 0) return null

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estadísticas de Reseñas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalReviews}
            </div>
            <div className="text-sm text-gray-600">Reseñas</div>
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

        {/* Rating Distribution */}
        {stats.ratingDistribution && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Distribución de calificaciones
            </h4>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-8">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ 
                        width: `${(stats.ratingDistribution[rating] / stats.totalReviews) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {stats.ratingDistribution[rating]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Averages */}
        {stats.categoryAverages && Object.keys(stats.categoryAverages).length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Promedios por categoría
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.categoryAverages).map(([category, average]) => (
                <div key={category} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {average.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">
                    {category.replace('_rating', '').replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">📝</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No hay reseñas aún
      </h3>
      <p className="text-gray-600">
        {tripId ? 'Este viaje no tiene reseñas todavía.' : 
         organizerId ? 'Este organizador no tiene reseñas todavía.' :
         'No tienes reseñas todavía.'}
      </p>
    </div>
  )

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading && reviews.length === 0) {
    return renderLoadingState()
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error al cargar reseñas
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadReviews(true)}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  if (reviews.length === 0) {
    return renderEmptyState()
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {renderStats()}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <TripReviewCard
            key={review.id}
            review={review}
            showTripInfo={showTripInfo}
            showOrganizerInfo={showOrganizerInfo}
            canEdit={canEdit && review.reviewer_id === userId}
            canDelete={canDelete && review.reviewer_id === userId}
            onEdit={(review) => {
              handleReviewUpdate(review)
              onEdit?.(review)
            }}
            onDelete={(review) => {
              handleReviewDelete(review)
              onDelete?.(review)
            }}
            onRespond={canRespond ? onRespond : undefined}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            onClick={handleLoadMore}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Cargando...' : 'Cargar más reseñas'}
          </Button>
        </div>
      )}

      {/* No More Reviews */}
      {!hasMore && reviews.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Has visto todas las reseñas disponibles
          </p>
        </div>
      )}
    </div>
  )
}
