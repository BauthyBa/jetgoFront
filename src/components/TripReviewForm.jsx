import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createTripReview, validateTripReviewData } from '@/services/tripReviews'
import { generateStars, getRatingText } from '@/services/tripReviews'

export default function TripReviewForm({ 
  tripId, 
  organizerId, 
  reviewerId, 
  onSuccess, 
  onCancel,
  tripName = '',
  organizerName = ''
}) {
  const [formData, setFormData] = useState({
    trip_id: tripId,
    reviewer_id: reviewerId,
    organizer_id: organizerId,
    overall_rating: 0,
    destination_rating: 0,
    organization_rating: 0,
    communication_rating: 0,
    value_rating: 0,
    overall_comment: '',
    destination_comment: '',
    organization_comment: '',
    communication_comment: '',
    value_comment: '',
    trip_highlights: '',
    trip_improvements: '',
    would_recommend: false,
    would_travel_again: false,
    is_anonymous: false
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleRatingChange = (field, rating) => {
    setFormData(prev => ({ ...prev, [field]: rating }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Validar datos
    const validation = validateTripReviewData(formData)
    if (!validation.isValid) {
      setErrors({ general: validation.errors })
      setLoading(false)
      return
    }

    try {
      const response = await createTripReview(formData)
      if (response.ok) {
        onSuccess?.(response.data)
      } else {
        setErrors({ general: [response.error] })
      }
    } catch (error) {
      console.error('Error creating review:', error)
      setErrors({ general: ['Error al crear la reseña. Inténtalo de nuevo.'] })
    } finally {
      setLoading(false)
    }
  }

  const renderRatingSection = (field, label, description = '') => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mb-2">{description}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {generateStars(formData[field], 5).map((star) => (
          <button
            key={star.value}
            type="button"
            onClick={() => handleRatingChange(field, star.value)}
            className={`text-2xl transition-colors ${
              star.filled 
                ? 'text-yellow-400' 
                : 'text-gray-300 hover:text-yellow-300'
            }`}
          >
            ★
          </button>
        ))}
        <span className="text-sm text-gray-600 ml-2">
          {formData[field] > 0 && getRatingText(formData[field])}
        </span>
      </div>
    </div>
  )

  const renderCommentSection = (field, label, placeholder = '') => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Textarea
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full"
      />
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Califica tu experiencia general
        </h3>
        <p className="text-sm text-gray-600">
          ¿Cómo calificarías el viaje a {tripName} organizado por {organizerName}?
        </p>
      </div>

      {renderRatingSection('overall_rating', 'Calificación General', 'Evalúa tu experiencia general del viaje')}
      
      {renderCommentSection(
        'overall_comment', 
        'Comentario General', 
        'Cuéntanos sobre tu experiencia general en el viaje...'
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Evalúa aspectos específicos
        </h3>
        <p className="text-sm text-gray-600">
          Califica diferentes aspectos del viaje
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {renderRatingSection('destination_rating', 'Destino', '¿Qué tal estuvo el destino elegido?')}
          {renderCommentSection('destination_comment', 'Comentario sobre el destino', '¿Qué te gustó o no del destino?')}
        </div>

        <div className="space-y-4">
          {renderRatingSection('organization_rating', 'Organización', '¿Qué tal estuvo la planificación?')}
          {renderCommentSection('organization_comment', 'Comentario sobre la organización', '¿Cómo estuvo la organización del viaje?')}
        </div>

        <div className="space-y-4">
          {renderRatingSection('communication_rating', 'Comunicación', '¿Qué tal la comunicación del organizador?')}
          {renderCommentSection('communication_comment', 'Comentario sobre la comunicación', '¿Cómo fue la comunicación durante el viaje?')}
        </div>

        <div className="space-y-4">
          {renderRatingSection('value_rating', 'Valor', '¿Qué tal la relación calidad-precio?')}
          {renderCommentSection('value_comment', 'Comentario sobre el valor', '¿Crees que valió la pena el precio?')}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comparte más detalles
        </h3>
        <p className="text-sm text-gray-600">
          Ayúdanos a entender mejor tu experiencia
        </p>
      </div>

      {renderCommentSection(
        'trip_highlights', 
        'Lo mejor del viaje', 
        '¿Qué fue lo que más te gustó del viaje?'
      )}

      {renderCommentSection(
        'trip_improvements', 
        'Qué se podría mejorar', 
        '¿Qué sugerencias tienes para mejorar futuros viajes?'
      )}

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="would_recommend"
            checked={formData.would_recommend}
            onChange={(e) => handleInputChange('would_recommend', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="would_recommend" className="text-sm font-medium text-gray-700">
            ¿Recomendarías este organizador a otros viajeros?
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="would_travel_again"
            checked={formData.would_travel_again}
            onChange={(e) => handleInputChange('would_travel_again', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="would_travel_again" className="text-sm font-medium text-gray-700">
            ¿Viajarías de nuevo con este organizador?
          </label>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Configuración de privacidad
        </h3>
        <p className="text-sm text-gray-600">
          Elige cómo quieres que aparezca tu reseña
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="is_anonymous"
            checked={formData.is_anonymous}
            onChange={(e) => handleInputChange('is_anonymous', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_anonymous" className="text-sm font-medium text-gray-700">
            Publicar como anónimo
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Si marcas esta opción, tu reseña aparecerá sin mostrar tu nombre
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Resumen de tu reseña:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Calificación general: {formData.overall_rating}/5</p>
          {formData.destination_rating > 0 && <p>• Destino: {formData.destination_rating}/5</p>}
          {formData.organization_rating > 0 && <p>• Organización: {formData.organization_rating}/5</p>}
          {formData.communication_rating > 0 && <p>• Comunicación: {formData.communication_rating}/5</p>}
          {formData.value_rating > 0 && <p>• Valor: {formData.value_rating}/5</p>}
          <p>• Recomendar: {formData.would_recommend ? 'Sí' : 'No'}</p>
          <p>• Viajar de nuevo: {formData.would_travel_again ? 'Sí' : 'No'}</p>
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      default: return renderStep1()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Reseñar Viaje
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Paso {currentStep} de {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Errors */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-600">
              {Array.isArray(errors.general) ? errors.general.join(', ') : errors.general}
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              variant="outline"
            >
              Anterior
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                disabled={currentStep === 1 && formData.overall_rating === 0}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Enviando...' : 'Enviar Reseña'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
