import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

const TripHistory = ({ userId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      loadTripHistory();
    }
  }, [userId]);

  const loadTripHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trip-history/', { params: { user_id: userId } });
      
      if (response.data?.ok) {
        setHistory(response.data.history || []);
      } else {
        setError('No se pudo cargar el historial de viajes');
      }
    } catch (err) {
      console.error('Error loading trip history:', err);
      setError('Error al cargar el historial de viajes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleText = (role) => {
    return role === 'organizer' ? 'Organizador' : 'Participante';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      case 'abandoned': return 'Abandonado';
      default: return status;
    }
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`text-lg ${
              i < rating ? 'text-yellow-400' : 'text-gray-400'
            }`}
          >
            ★
          </span>
        ))}
        <span className="text-sm text-gray-400 ml-2">({rating}/5)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={loadTripHistory}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">✈️</div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Sin viajes completados</h3>
        <p className="text-gray-400">Este usuario aún no ha completado ningún viaje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Historial de Viajes</h2>
        <span className="text-sm text-gray-400">{history.length} viaje{history.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-4">
        {history.map((trip) => (
          <div
            key={trip.id}
            className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600 hover:border-gray-500 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{trip.trip_details.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trip.role === 'organizer' 
                      ? 'bg-blue-600 text-blue-100' 
                      : 'bg-green-600 text-green-100'
                  }`}>
                    {getRoleText(trip.role)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-gray-300 mb-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">📍</span>
                    <span>{trip.trip_details.origin} → {trip.trip_details.destination}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">🗓️</span>
                    <span>{formatDate(trip.trip_details.date)}</span>
                  </div>
                  {trip.trip_details.country && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">🌍</span>
                      <span>{trip.trip_details.country}</span>
                    </div>
                  )}
                </div>
              </div>

              {trip.trip_details.image_url && (
                <img
                  src={trip.trip_details.image_url}
                  alt={trip.trip_details.name}
                  className="w-20 h-20 object-cover rounded-lg ml-4"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trip.status === 'completed' 
                    ? 'bg-green-600 text-green-100' 
                    : trip.status === 'cancelled'
                    ? 'bg-red-600 text-red-100'
                    : 'bg-yellow-600 text-yellow-100'
                }`}>
                  {getStatusText(trip.status)}
                </span>
                
                <span className="text-sm text-gray-400">
                  Completado el {formatDate(trip.joined_at)}
                </span>
              </div>

              {trip.rating_given && (
                <div className="flex items-center gap-2">
                  {renderStars(trip.rating_given)}
                </div>
              )}
            </div>

            {trip.review_text && (
              <div className="mt-4 p-3 bg-gray-600 rounded-lg">
                <p className="text-gray-200 text-sm italic">"{trip.review_text}"</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripHistory;
