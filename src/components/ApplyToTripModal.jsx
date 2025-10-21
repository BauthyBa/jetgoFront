import { useState } from 'react'
import { applyToTrip, getUserApplications } from '../services/applications'
import { getSession } from '@/services/supabase'

export default function ApplyToTripModal({ trip, isOpen, onClose, onSuccess }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let userId = ''
      try {
        const session = await getSession()
        userId = session?.user?.id || ''
      } catch {}

      if (userId) {
        try {
          const apps = await getUserApplications(userId)
          const already = Array.isArray(apps) && apps.some(a => String(a?.trip_id) === String(trip.id))
          if (already) {
            alert('Ya enviaste una solicitud para este viaje. No puedes aplicar dos veces al mismo viaje.')
            return
          }
        } catch {}
      }
      const result = await applyToTrip(trip.id, message, userId)
      onSuccess?.(result?.room_id)
      onClose()
      setMessage('')
    } catch (error) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Error al aplicar al viaje'
      if (errorMessage.includes('Ya has aplicado')) {
        alert('Ya enviaste una solicitud para este viaje. No puedes aplicar dos veces al mismo viaje.')
      } else {
        alert(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass-card p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Aplicar a {trip.name}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Mensaje para el anfitrión (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cuéntale al anfitrión por qué quieres unirte a este viaje..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="btn bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded flex-1"
            >
              {loading ? 'Aplicando...' : 'Aplicar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
