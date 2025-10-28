import { useRef, useEffect, useState } from 'react'
import { Camera, X, RotateCcw } from 'lucide-react'

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' = cámara trasera, 'user' = frontal

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  const startCamera = async () => {
    try {
      setError(null)
      
      // Detener stream anterior si existe
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setIsStreaming(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convertir a blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob)
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  const handleCancel = () => {
    stopCamera()
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* Video Preview */}
        <div className="relative bg-black rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-auto"
            playsInline
            muted
          />
          
          {/* Canvas oculto para captura */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Overlay de controles */}
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X className="w-6 h-6" />
              </button>
              
              <button
                onClick={switchCamera}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                title="Cambiar cámara"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Footer con botón de captura */}
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                disabled={!isStreaming}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-8 h-8 text-black" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-center text-white/80 text-sm">
          Toca el botón blanco para tomar la foto
        </div>
      </div>
    </div>
  )
}
