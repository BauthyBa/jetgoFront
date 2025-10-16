import { useState, useRef, useEffect } from 'react'

export default function AudioMessage({ message, isOwn, senderName }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => {
      const audioDuration = audio.duration
      setDuration(audioDuration)
      
      // Si no tenemos duración en la base de datos, actualizar el mensaje
      if (!message.audio_duration && audioDuration) {
        // Aquí podrías hacer una llamada al backend para actualizar la duración
        // Por ahora solo actualizamos el estado local
        console.log('Audio duration detected:', audioDuration)
      }
    }
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [message.audio_duration])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getWaveformBars = () => {
    // Generar barras de forma de onda simuladas
    const bars = []
    const barCount = 20
    for (let i = 0; i < barCount; i++) {
      const height = Math.random() * 100 + 20 // Altura aleatoria entre 20-120%
      bars.push(
        <div
          key={i}
          style={{
            width: '3px',
            height: `${height}%`,
            background: isPlaying ? '#22c55e' : '#6b7280',
            borderRadius: '1.5px',
            transition: 'all 0.1s ease'
          }}
        />
      )
    }
    return bars
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 8
    }}>
      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0
      }}>
        {senderName ? senderName.charAt(0).toUpperCase() : 'U'}
      </div>

      {/* Audio Message Bubble */}
      <div style={{
        maxWidth: '280px',
        background: isOwn ? '#22c55e' : '#ffffff',
        borderRadius: '18px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isOwn ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isOwn ? 'white' : '#374151',
            fontSize: 14,
            flexShrink: 0
          }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Waveform */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          height: 20,
          flex: 1
        }}>
          {getWaveformBars()}
        </div>

        {/* Time Display */}
        <div style={{
          fontSize: 12,
          color: isOwn ? 'rgba(255,255,255,0.8)' : '#6b7280',
          fontWeight: 500,
          minWidth: '35px',
          textAlign: 'right'
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timestamp and Read Receipts */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        gap: 2
      }}>
        <div style={{
          fontSize: 11,
          color: '#9ca3af',
          marginTop: 4
        }}>
          {new Date(message.created_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        {isOwn && (
          <div style={{ color: '#22c55e', fontSize: 12 }}>
            ✓✓
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={message.file_url}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </div>
  )
}
