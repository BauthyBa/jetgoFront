import { useState, useEffect } from 'react'
import GlassCard from './GlassCard'
import { createUserReport, getReportReasons, uploadReportEvidence } from '@/services/api'
import { supabase } from '@/services/supabase'
import { censorText, containsBannedWords } from '@/utils/wordFilter'

export default function ReportUserModal({ isOpen, onClose, reportedUserId, reportedUserName }) {
  const [reasons, setReasons] = useState([])
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidencePreview, setEvidencePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [censoredDescription, setCensoredDescription] = useState('')
  const [wasFiltered, setWasFiltered] = useState(false)

  // Cargar usuario actual
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
      } catch (err) {
        console.error('Error getting current user:', err)
      }
    }
    getCurrentUser()
  }, [])

  // Cargar motivos de reporte
  useEffect(() => {
    async function loadReasons() {
      try {
        const response = await getReportReasons()
        if (response.ok) {
          setReasons(response.reasons || [])
        }
      } catch (err) {
        console.error('Error loading report reasons:', err)
      }
    }
    
    if (isOpen) {
      loadReasons()
    }
  }, [isOpen])

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('')
      setDescription('')
      setError('')
      setSuccess(false)
      setEvidenceFile(null)
      setEvidencePreview('')
      setCensoredDescription('')
      setWasFiltered(false)
    }
  }, [isOpen])

  // Aplicar filtro de palabras cuando cambie la descripción
  useEffect(() => {
    if (description) {
      const censored = censorText(description)
      const filtered = censored !== description
      setCensoredDescription(censored)
      setWasFiltered(filtered)
    } else {
      setCensoredDescription('')
      setWasFiltered(false)
    }
  }, [description])

  // Manejar selección de archivo de evidencia
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen (PNG, JPG, JPEG)')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setEvidenceFile(file)
    setError('')

    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setEvidencePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Remover archivo de evidencia
  const removeEvidence = () => {
    setEvidenceFile(null)
    setEvidencePreview('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentUser) {
      setError('Debes estar logueado para reportar usuarios')
      return
    }

    if (!selectedReason) {
      setError('Debes seleccionar un motivo')
      return
    }

    if (selectedReason === 'Otro motivo' && !description.trim()) {
      setError('Debes proporcionar una descripción para "Otro motivo"')
      return
    }

    try {
      setLoading(true)
      setError('')

      let evidenceUrl = ''

      // Subir imagen de evidencia si existe
      if (evidenceFile) {
        setUploadingImage(true)
        const uploadResult = await uploadReportEvidence(evidenceFile, currentUser.id)
        
        if (uploadResult.ok) {
          evidenceUrl = uploadResult.url
        } else {
          setError(`Error al subir imagen: ${uploadResult.error}`)
          return
        }
        setUploadingImage(false)
      }

      const response = await createUserReport({
        reporter_id: currentUser.id,
        reported_user_id: reportedUserId,
        reason: selectedReason,
        description: censoredDescription.trim(),
        evidence_image_url: evidenceUrl
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(response.error || 'Error al enviar el reporte')
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el reporte')
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                🚫 Reportar Usuario
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            {success ? (
              /* Mensaje de éxito */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h4 className="text-white font-medium mb-2">Reporte enviado</h4>
                <p className="text-gray-300 text-sm">
                  Gracias por reportar. Nuestro equipo revisará el caso.
                </p>
              </div>
            ) : (
              /* Formulario */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-gray-300 text-sm mb-4">
                    Estás reportando a <span className="font-medium text-white">{reportedUserName}</span>
                  </p>
                </div>

                {/* Selección de motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Motivo del reporte *
                  </label>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona un motivo</option>
                    {reasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descripción del motivo seleccionado */}
                {selectedReason && (
                  <div className="bg-slate-800/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-400">
                      {reasons.find(r => r.value === selectedReason)?.description}
                    </p>
                  </div>
                )}

                {/* Campo de descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción {selectedReason === 'Otro motivo' && '*'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe lo que ocurrió (opcional, excepto para 'Otro motivo')"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={3}
                    maxLength={500}
                    required={selectedReason === 'Otro motivo'}
                  />
                  
                  {/* Mostrar texto censurado si fue filtrado */}
                  {wasFiltered && censoredDescription && (
                    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 text-sm">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs text-yellow-300 mb-1">Texto filtrado automáticamente:</p>
                          <p className="text-sm text-gray-300 bg-slate-800/50 p-2 rounded border-l-2 border-yellow-500/50">
                            {censoredDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {description.length}/500 caracteres
                  </p>
                </div>

                {/* Subir imagen de evidencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    📷 Evidencia (opcional)
                  </label>
                  
                  {!evidencePreview ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-slate-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="evidence-upload"
                      />
                      <label
                        htmlFor="evidence-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                          📷
                        </div>
                        <p className="text-sm text-gray-400">
                          Subir imagen de evidencia
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG - Máximo 5MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={evidencePreview}
                        alt="Evidencia"
                        className="w-full h-32 object-cover rounded-lg border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={removeEvidence}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || uploadingImage || !selectedReason}
                  >
                    {uploadingImage ? 'Subiendo imagen...' : loading ? 'Enviando...' : 'Enviar Reporte'}
                  </button>
                </div>

                {/* Nota informativa */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-xs">
                    ⚠️ Los reportes falsos pueden resultar en la suspensión de tu cuenta.
                  </p>
                </div>
              </form>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
