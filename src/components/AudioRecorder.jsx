import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AudioRecorder({ onAudioRecorded, onCancel }) {
  console.log('🎤 AudioRecorder component mounted!')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  
  const mediaRecorderRef = useRef(null)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('🎤 Media stream obtained:', stream)
      
      const mediaRecorder = new MediaRecorder(stream)
      console.log('🎤 MediaRecorder created:', mediaRecorder)
      console.log('🎤 MediaRecorder mimeType:', mediaRecorder.mimeType)
      
      mediaRecorderRef.current = mediaRecorder

      const chunks = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        console.log('🎤 Recording stopped, processing audio...')
        // Detectar el tipo MIME correcto del MediaRecorder
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        console.log('🎤 Detected mimeType:', mimeType)
        const blob = new Blob(chunks, { type: mimeType })
        console.log('🎤 Audio blob created:', blob)
        console.log('🎤 Blob size:', blob.size, 'bytes')
        console.log('🎤 Blob type:', blob.type)
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Crear elemento de audio para obtener duración
        const audio = new Audio(url)
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration)
        }
        
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const sendAudio = () => {
    if (audioBlob) {
      console.log('🎤 Sending audio blob:', audioBlob)
      console.log('🎤 Blob type:', audioBlob.type)
      console.log('🎤 Blob size:', audioBlob.size)
      onAudioRecorded(audioBlob)
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      setAudioDuration(0)
    }
  }

  const cancelRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setAudioDuration(0)
    onCancel()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="glass-card" style={{ padding: 12, margin: '8px 0' }}>
      {!audioBlob ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isRecording ? (
              <button
                onClick={startRecording}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16
                }}
                title="Iniciar grabación"
              >
                🎤
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  animation: 'pulse 1s infinite'
                }}
                title="Detener grabación"
              >
                ⏹️
              </button>
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: '100%', 
                height: 4, 
                background: isRecording ? '#ef4444' : '#374151',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {isRecording && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: '#dc2626',
                    width: '100%',
                    animation: 'wave 1s ease-in-out infinite alternate'
                  }} />
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {isRecording ? `Grabando... ${formatTime(recordingTime)}` : 'Presiona para grabar'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#22c55e',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16
            }}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: '100%', 
                height: 4, 
                background: '#374151',
                borderRadius: 2,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  background: '#22c55e',
                  width: '100%',
                  borderRadius: 2
                }} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {formatTime(audioDuration)}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              onClick={cancelRecording}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Cancelar
            </Button>
            <Button
              onClick={sendAudio}
              style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
      
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={handleAudioEnded}
        style={{ display: 'none' }}
      />
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes wave {
          0% { transform: scaleX(0.8); }
          100% { transform: scaleX(1.2); }
        }
      `}</style>
    </div>
  )
}
