import { useState } from 'react'
import { formatReviewDate, getRatingText, generateStars } from '@/services/tripReviews'
import { Button } from '@/components/ui/button'

export default function TripReviewCard({ 
  review, 
  showTripInfo = true, 
  showOrganizerInfo = true,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onRespond
}) {
  const [showFullComment, setShowFullComment] = useState(false)
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  const handleResponseSubmit = async (e) => {
    e.preventDefault()
    if (!responseText.trim()) return

    setSubmittingResponse(true)
    try {
      await onRespond?.(review.id, responseText.trim())
      setShowResponseForm(false)
      setResponseText('')
    } catch (error) {
      console.error('Error submitting response:', error)
    } finally {
      setSubmittingResponse(false)
    }
  }

  const renderRatingStars = (rating, label) => {
    if (!rating || rating === 0) return null

    return (
      <div className="flex items-center space-x-2">
        <div className="flex">
          {generateStars(rating, 5).map((star) => (
            <span
              key={star.value}
              className={`text-sm ${
                star.filled ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {rating}/5 - {getRatingText(rating)}
        </span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    )
  }

  const renderComment = (comment, label) => {
    if (!comment || comment.trim() === '') return null

    const isLong = comment.length > 200
    const displayText = showFullComment || !isLong ? comment : comment.substring(0, 200) + '...'

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">{label}:</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setShowFullComment(!showFullComment)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showFullComment ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </div>
    )
  }

  const renderRecommendationBadges = () => {
    const badges = []
    
    if (review.would_recommend) {
      badges.push(
        <span key="recommend" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Recomienda
        </span>
      )
    }
    
    if (review.would_travel_again) {
      badges.push(
        <span key="travel-again" className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          ✈️ Viajaría de nuevo
        </span>
      )
    }

    return badges.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {badges}
      </div>
    ) : null
  }

  const renderResponse = () => {
    if (!review.responses || review.responses.length === 0) return null

    const response = review.responses[0] // Solo puede haber una respuesta por reseña

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-900">
            Respuesta del organizador
          </p>
          <span className="text-xs text-gray-500">
            {formatReviewDate(response.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {response.response_text}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {review.is_anonymous ? (
              <span className="text-gray-500 text-sm">👤</span>
            ) : (
              <span className="text-gray-600 font-medium">
                {review.reviewer?.nombre?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {review.is_anonymous ? 'Usuario anónimo' : 
                `${review.reviewer?.nombre || ''} ${review.reviewer?.apellido || ''}`.trim() || 'Usuario'}
            </p>
            <p className="text-sm text-gray-500">
              {formatReviewDate(review.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit?.(review)}
            >
              Editar
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete?.(review)}
              className="text-red-600 hover:text-red-700"
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Trip Info */}
      {showTripInfo && review.trips && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Viaje: {review.trips.name}
          </p>
          {review.trips.destination && (
            <p className="text-xs text-blue-700">
              Destino: {review.trips.destination}
            </p>
          )}
        </div>
      )}

      {/* Organizer Info */}
      {showOrganizerInfo && review.organizer && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-900">
            Organizador: {review.organizer.nombre} {review.organizer.apellido}
          </p>
        </div>
      )}

      {/* Overall Rating */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex">
            {generateStars(review.overall_rating, 5).map((star) => (
              <span
                key={star.value}
                className={`text-lg ${
                  star.filled ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-lg font-semibold text-gray-900">
            {review.overall_rating}/5
          </span>
          <span className="text-sm text-gray-600">
            {getRatingText(review.overall_rating)}
          </span>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="space-y-3 mb-4">
        {renderRatingStars(review.destination_rating, 'Destino')}
        {renderRatingStars(review.organization_rating, 'Organización')}
        {renderRatingStars(review.communication_rating, 'Comunicación')}
        {renderRatingStars(review.value_rating, 'Valor')}
      </div>

      {/* Comments */}
      <div className="space-y-4 mb-4">
        {renderComment(review.overall_comment, 'Comentario general')}
        {renderComment(review.destination_comment, 'Sobre el destino')}
        {renderComment(review.organization_comment, 'Sobre la organización')}
        {renderComment(review.communication_comment, 'Sobre la comunicación')}
        {renderComment(review.value_comment, 'Sobre el valor')}
        {renderComment(review.trip_highlights, 'Lo mejor del viaje')}
        {renderComment(review.trip_improvements, 'Sugerencias de mejora')}
      </div>

      {/* Recommendation Badges */}
      {renderRecommendationBadges()}

      {/* Response Form */}
      {showResponseForm && (
        <form onSubmit={handleResponseSubmit} className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Responder a esta reseña
            </label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Escribe tu respuesta..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowResponseForm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingResponse || !responseText.trim()}
              >
                {submittingResponse ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Response Button */}
      {onRespond && !showResponseForm && (!review.responses || review.responses.length === 0) && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowResponseForm(true)}
          >
            Responder
          </Button>
        </div>
      )}

      {/* Existing Response */}
      {renderResponse()}
    </div>
  )
}
