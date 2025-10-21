import { useState } from 'react'
import { respondToApplication } from '../services/applications'

export default function ApplicationCard({ application, onResponse }) {
  const [loading, setLoading] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  const handleResponse = async (action) => {
    setLoading(true)
    try {
      await respondToApplication(application.id, action)
      onResponse?.(application.id, action)
    } catch (error) {
      alert(error?.response?.data?.error || 'Error al responder la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600'
      case 'accepted': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      case 'withdrawn': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'accepted': return 'Aceptada'
      case 'rejected': return 'Rechazada'
      case 'withdrawn': return 'Retirada'
      default: return status
    }
  }

  return (
    <div className="glass-card p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">
            {application.applicant_name} {application.applicant_last_name}
          </h3>
          <p className="text-sm text-gray-600">{application.applicant_email}</p>
          <p className="text-sm text-gray-500">
            Aplicó el {new Date(application.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <span className={`font-medium ${getStatusColor(application.status)}`}>
            {getStatusText(application.status)}
          </span>
        </div>
      </div>

      {application.message && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
            "{application.message}"
          </p>
        </div>
      )}

      {application.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleResponse('accept')}
            disabled={loading}
            className="btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Aceptando...' : 'Aceptar'}
          </button>
          <button
            onClick={() => handleResponse('reject')}
            disabled={loading}
            className="btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      )}

      {application.status === 'accepted' && (
        <div className="text-green-600 text-sm font-medium">
          ✓ Solicitud aceptada
        </div>
      )}

      {application.status === 'rejected' && (
        <div className="text-red-600 text-sm font-medium">
          ✗ Solicitud rechazada
        </div>
      )}
    </div>
  )
}
