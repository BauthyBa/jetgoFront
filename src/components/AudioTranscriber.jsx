import React, { useState, useRef, useEffect } from 'react'

const AudioTranscriber = ({ onTranscriptionComplete, onCancel }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Verificar si el navegador soporta Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true)
      initializeSpeechRecognition()
    } else {
      console.warn('Web Speech API no está soportada en este navegador')
    }
  }, [])

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES' // Español
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 Reconocimiento de voz iniciado')
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setTranscript(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event) => {
      console.error('Error en reconocimiento de voz:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('🎤 Reconocimiento de voz finalizado')
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const handleSendTranscription = () => {
    if (transcript.trim()) {
      onTranscriptionComplete(transcript.trim())
    }
  }

  const handleCancel = () => {
    if (isListening) {
      stopListening()
    }
    onCancel()
  }

  if (!isSupported) {
    return (
      <div className="glass-card" style={{ padding: 12, margin: '8px 0' }}>
        <p className="text-red-400 text-sm">
          Tu navegador no soporta reconocimiento de voz. 
          Usa Chrome, Edge o Safari para esta funcionalidad.
        </p>
        <button
          onClick={onCancel}
          className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded text-sm hover:bg-red-500/30"
        >
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 12, margin: '8px 0' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">
          🎙️ Transcripción de Voz
        </h3>
        <button
          onClick={handleCancel}
          className="text-slate-400 hover:text-white text-lg"
        >
          ×
        </button>
      </div>

      <div className="mb-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 min-h-[60px]">
          {transcript ? (
            <p className="text-sm text-white">{transcript}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              {isListening ? 'Escuchando...' : 'Haz clic en el micrófono para empezar'}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isListening ? (
            <button
              onClick={startListening}
              className="flex items-center space-x-2 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <span className="text-sm">🎤</span>
              <span className="text-sm">Grabar</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <span className="text-sm">⏹️</span>
              <span className="text-sm">Detener</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          {transcript && (
            <button
              onClick={handleSendTranscription}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Enviar
            </button>
          )}
        </div>
      </div>

      {isListening && (
        <div className="mt-2 flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-slate-400">Grabando...</span>
        </div>
      )}
    </div>
  )
}

export default AudioTranscriber
