import React, { useState } from 'react';
import { api } from '@/services/api';

const TripRatingModal = ({ isOpen, onClose, trip, userId, onRated }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/trips/rate/', {
        user_id: userId,
        trip_id: trip.trip_id,
        rating: rating,
        review_text: reviewText.trim()
      });

      if (response.data?.ok) {
        onRated?.();
        onClose();
        setRating(0);
        setReviewText('');
      } else {
        setError(response.data?.error || 'Error al calificar el viaje');
      }
    } catch (err) {
      console.error('Error rating trip:', err);
      setError('Error al calificar el viaje');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setReviewText('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Calificar Viaje</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {trip?.trip_details?.name}
            </h3>
            <p className="text-gray-300 text-sm">
              {trip?.trip_details?.origin} → {trip?.trip_details?.destination}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-white font-medium mb-3">
                Calificación *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-colors ${
                      star <= rating 
                        ? 'text-yellow-400 hover:text-yellow-300' 
                        : 'text-gray-400 hover:text-yellow-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  {rating === 1 && 'Muy malo'}
                  {rating === 2 && 'Malo'}
                  {rating === 3 && 'Regular'}
                  {rating === 4 && 'Bueno'}
                  {rating === 5 && 'Excelente'}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-white font-medium mb-3">
                Reseña (opcional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia en este viaje..."
                className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                {reviewText.length}/500 caracteres
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  'Enviar Calificación'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TripRatingModal;
