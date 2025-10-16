import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TripReviewStats from './TripReviewStats'
import TripReviewsList from './TripReviewsList'
import { Button } from '@/components/ui/button'
import { getTripReviews, checkTripReviewEligibility } from '@/services/tripReviews'

export default function TripReviewsSection({ 
  tripId, 
  tripName,
  organizerId,
  currentUserId,
  isParticipant = false,
  canReview = false,
  hasReviewed = false
}) {
  const navigate = useNavigate()
  const [reviewsCount, setReviewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState(null)

  useEffect(() => {
    loadReviewsCount()
    if (currentUserId) {
      checkEligibility()
    }
  }, [tripId, currentUserId])

  const loadReviewsCount = async () => {
    try {
      setLoading(true)
      const response = await getTripReviews({ trip_id: tripId, limit: 1 })
      if (response.ok) {
        setReviewsCount(response.count || 0)
      }
    } catch (error) {
      console.error('Error loading reviews count:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkEligibility = async () => {
    try {
      const response = await checkTripReviewEligibility(tripId, currentUserId)
      if (response.ok) {
        setEligibility(response)
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
    }
  }

  const handleViewAllReviews = () => {
    navigate(`/trip/${tripId}/reviews`)
  }

  const handleWriteReview = () => {
    navigate(`/trip/${tripId}/reviews`)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Reseñas del viaje
          </h3>
          <p className="text-sm text-gray-600">
            {reviewsCount} reseña{reviewsCount !== 1 ? 's' : ''} de participantes
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {eligibility?.can_review && (
            <Button
              onClick={handleWriteReview}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Escribir Reseña
            </Button>
          )}
          
          {reviewsCount > 0 && (
            <Button
              onClick={handleViewAllReviews}
              size="sm"
              variant="outline"
            >
              Ver todas
            </Button>
          )}
        </div>
      </div>

      {/* Stats Preview */}
      {reviewsCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <TripReviewStats 
            tripId={tripId}
            showDetailed={false}
          />
        </div>
      )}

      {/* Reviews Preview */}
      {reviewsCount > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <TripReviewsList
            tripId={tripId}
            showTripInfo={false}
            showOrganizerInfo={true}
            canEdit={false}
            canDelete={false}
            canRespond={false}
            limit={3} // Mostrar solo las primeras 3 reseñas
          />
          
          {reviewsCount > 3 && (
            <div className="text-center mt-4">
              <Button
                onClick={handleViewAllReviews}
                variant="outline"
                size="sm"
              >
                Ver {reviewsCount - 3} reseña{reviewsCount - 3 !== 1 ? 's' : ''} más
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-4xl mb-3">📝</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Aún no hay reseñas
          </h4>
          <p className="text-gray-600 mb-4">
            {isParticipant 
              ? 'Como participante de este viaje, puedes ser el primero en compartir tu experiencia.'
              : 'Los participantes del viaje podrán dejar reseñas una vez que termine.'
            }
          </p>
          
          {eligibility?.can_review && (
            <Button
              onClick={handleWriteReview}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Escribir la primera reseña
            </Button>
          )}
        </div>
      )}

      {/* Review Status for Participants */}
      {isParticipant && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-blue-600">💭</div>
            <div>
              <h4 className="font-medium text-blue-900">
                {eligibility?.can_review ? 'Puedes reseñar este viaje' : eligibility?.reason || 'No puedes reseñar este viaje'}
              </h4>
              <p className="text-sm text-blue-700">
                {eligibility?.can_review 
                  ? 'Como participante, puedes compartir tu experiencia y ayudar a otros viajeros.'
                  : eligibility?.reason || 'No cumples los requisitos para reseñar este viaje.'
                }
              </p>
            </div>
            {eligibility?.can_review && (
              <Button
                onClick={handleWriteReview}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Escribir Reseña
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
