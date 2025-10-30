import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, StopCircle, Lock, Unlock, ArrowLeft, Play, Pause } from 'lucide-react'

export default function AudioRecorder({ onAudioRecorded, onCancel }) {
  console.log('AudioRecorder component mounted!')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [locked, setLocked] = useState(false)
  const [slideOffset, setSlideOffset] = useState(0) // negativo al deslizar a la izquierda

  const mediaRecorderRef = useRef(null)
  const audioRef = useRef(null)
  const intervalRef = useRef(null)
  const startPosRef = useRef({ x: 0, y: 0 })

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

  // Listeners de gesto mientras se mantiene pulsado (no bloqueado)
  useEffect(() => {
    if (!(isHolding && isRecording && !locked)) return
    const handleMove = (e) => {
      const touch = e.touches ? e.touches[0] : e
      const dx = touch.clientX - startPosRef.current.x
      const dy = touch.clientY - startPosRef.current.y
      setSlideOffset(dx)
      // Deslizar arriba para bloquear
      if (dy < -60) {
        setLocked(true)
        setIsHolding(false)
      }
      // Deslizar a la izquierda para cancelar
      if (dx < -80) {
        // Cancelación inmediata
        try { mediaRecorderRef.current && mediaRecorderRef.current.stop() } catch {}
        setIsRecording(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
        // Reset visual y estado
        setSlideOffset(0)
        setIsHolding(false)
        setLocked(false)
        setAudioBlob(null)
        setAudioUrl(null)
        setRecordingTime(0)
        setAudioDuration(0)
        onCancel()
        // remover listeners
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
    const handleEnd = () => {
      if (!locked) {
        stopRecording()
      }
      setIsHolding(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isHolding, isRecording, locked])

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
      // Reset gestos
      setIsHolding(false)
      setLocked(false)
      setSlideOffset(0)
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
    setIsHolding(false)
    setLocked(false)
    setSlideOffset(0)
    onCancel()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePressStart = (e) => {
    // Soporta mouse y touch
    const touch = e.touches ? e.touches[0] : e
    startPosRef.current = { x: touch.clientX, y: touch.clientY }
    setIsHolding(true)
    setSlideOffset(0)
    setLocked(false)
    // Inicia grabación al presionar
    startRecording()
    // Evita scroll durante gesto
    if (e.cancelable) e.preventDefault()
  }

  return (
    <div className="glass-card" style={{ padding: 12, margin: '8px 0' }}>
      {!audioBlob ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Botón de micrófono (pulsar y mantener) */}
          {!isRecording ? (
            <button
              onMouseDown={handlePressStart}
              onTouchStart={handlePressStart}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#128C7E',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px rgba(18,140,126,0.25)'
              }}
              title="Mantén presionado para grabar"
            >
              <Mic size={18} />
            </button>
          ) : (
            // Grabando: mostrar barra con tiempo y pistas de gesto
            <button
              onClick={locked ? stopRecording : undefined}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#ef4444',
                border: 'none',
                color: 'white',
                cursor: locked ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1s infinite'
              }}
              title={locked ? 'Detener grabación' : 'Grabando'}
            >
              {locked ? <StopCircle size={18} /> : <Mic size={16} />}
            </button>
          )}

          {/* Centro: timeline + mensajes */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {!isRecording ? (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Mantén presionado para hablar</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 60, color: '#ef4444', fontWeight: 700 }}>
                  {formatTime(recordingTime)}
                </div>
                <div style={{ flex: 1, position: 'relative', height: 40, background: '#0b1220', borderRadius: 10, boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.08)' }}>
                  {/* Desliza para cancelar pista */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 10 + Math.max(-100, Math.min(0, slideOffset)),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#94a3b8',
                    fontSize: 12,
                    transition: locked ? 'opacity 0.2s' : 'none',
                    opacity: locked ? 0.4 : 1
                  }}>
                    <ArrowLeft size={14} /> Desliza para cancelar
                  </div>
                  {/* Onda animada simple */}
                  <div style={{
                    position: 'absolute', left: 10, right: 10, bottom: 8, height: 6,
                    background: 'rgba(239,68,68,0.25)', borderRadius: 999, overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '130%', height: '100%', background: '#ef4444',
                      transform: 'translateX(0)', animation: 'wave 1.1s ease-in-out infinite alternate'
                    }} />
                  </div>
                </div>
                {/* Candado para manos libres */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: locked ? '#22c55e' : '#0b1220',
                  color: locked ? 'white' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14
                }}>
                  {locked ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
              </div>
            )}
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
              boxShadow: '0 6px 16px rgba(34,197,94,0.25)'
            }}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
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
          0% { transform: translateX(-20%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  )
}
