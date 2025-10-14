import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/DashboardLayout'
import TripReviewsList from '@/components/TripReviewsList'
import TripReviewStats from '@/components/TripReviewStats'
import TripReviewForm from '@/components/TripReviewForm'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { checkTripReviewEligibility } from '@/services/tripReviews'

export default function TripReviews() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [eligibility, setEligibility] = useState(null)

  useEffect(() => {
    loadTripData()
  }, [tripId])

  const loadTripData = async () => {
    try {
      setLoading(true)
      setError('')

      // Cargar información del viaje
      const tripResponse = await api.get(`/trips/${tripId}/`)
      if (tripResponse.data) {
        setTrip(tripResponse.data)
      }

      // Verificar elegibilidad para reseñar
      await checkUserEligibility()

    } catch (err) {
      console.error('Error loading trip data:', err)
      setError('Error al cargar la información del viaje')
    } finally {
      setLoading(false)
    }
  }

  const checkUserEligibility = async () => {
    try {
      const currentUserId = localStorage.getItem('user_id') // Ajustar según tu sistema de auth
      if (currentUserId) {
        const response = await checkTripReviewEligibility(tripId, currentUserId)
        if (response.ok) {
          setEligibility(response)
        }
      }
    } catch (err) {
      console.error('Error checking eligibility:', err)
    }
  }

  const handleReviewSuccess = (reviewData) => {
    setShowReviewForm(false)
    // Recargar la página para mostrar la nueva reseña
    window.location.reload()
  }

  const handleBackToTrip = () => {
    navigate(`/trip/${tripId}`)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar el viaje
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBackToTrip}>
              Volver al viaje
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!trip) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Viaje no encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              El viaje que buscas no existe o no tienes permisos para verlo.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={handleBackToTrip}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2"
            >
              ← Volver al viaje
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Reseñas del viaje
            </h1>
            <p className="text-gray-600">
              {trip.name} - {trip.destination}
            </p>
          </div>
          
          {eligibility?.can_review && (
            <Button
              onClick={() => setShowReviewForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Escribir Reseña
            </Button>
          )}
        </div>

        {/* Review Form Modal */}
        {showReviewForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <TripReviewForm
                tripId={tripId}
                organizerId={trip.creator_id}
                reviewerId={localStorage.getItem('user_id')} // Ajustar según tu sistema de auth
                tripName={trip.name}
                organizerName={trip.creator_name || 'Organizador'}
                onSuccess={handleReviewSuccess}
                onCancel={() => setShowReviewForm(false)}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8">
          <TripReviewStats tripId={tripId} />
        </div>

        {/* Reviews List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Reseñas de participantes
          </h2>
          <TripReviewsList
            tripId={tripId}
            showTripInfo={false} // Ya estamos en la página del viaje
            showOrganizerInfo={true}
            canEdit={false} // Solo el autor puede editar
            canDelete={false} // Solo el autor puede eliminar
            canRespond={false} // Solo organizadores pueden responder
          />
        </div>

        {/* User Review Status */}
        {eligibility && (
          <div className={`border rounded-lg p-4 ${
            eligibility.can_review 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={eligibility.can_review ? 'text-blue-600' : 'text-gray-600'}>
                {eligibility.can_review ? '💭' : 'ℹ️'}
              </div>
              <div>
                <h3 className={`font-medium ${
                  eligibility.can_review ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {eligibility.can_review ? 'Puedes reseñar este viaje' : 'No puedes reseñar este viaje'}
                </h3>
                <p className={`text-sm ${
                  eligibility.can_review ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {eligibility.reason}
                </p>
              </div>
              {eligibility.can_review && (
                <Button
                  onClick={() => setShowReviewForm(true)}
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
    </DashboardLayout>
  )
}
