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
    // Generar barras de forma de onda simuladas con patrón realista
    const bars = []
    const barCount = 30
    for (let i = 0; i < barCount; i++) {
      // Patrón más realista - picos en el centro
      const position = i / barCount
      const centerFactor = 1 - Math.abs(position - 0.5) * 2
      const baseHeight = 30 + (Math.sin(i * 0.5) * 20)
      const height = Math.max(25, baseHeight + (centerFactor * 40))
      
      // Color based on playback progress
      const progress = duration > 0 ? currentTime / duration : 0
      const isPassed = (i / barCount) < progress
      
      bars.push(
        <div
          key={i}
          style={{
            width: '2px',
            height: `${height}%`,
            maxHeight: '24px',
            background: isPlaying && isPassed 
              ? (isOwn ? '#128C7E' : '#25D366')
              : (isOwn ? '#a8dba8' : '#d4d4d8'),
            borderRadius: '2px',
            transition: 'all 0.15s ease'
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
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
      maxWidth: '100%'
    }}>
      {/* Avatar */}
      {!isOwn && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {senderName ? senderName.charAt(0).toUpperCase() : 'U'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '65%' }}>
        {/* Sender name (only for others) */}
        {!isOwn && senderName && (
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#9ca3af',
            paddingLeft: 12
          }}>
            {senderName}
          </div>
        )}

        {/* Audio Message Bubble */}
        <div style={{
          minWidth: '250px',
          maxWidth: '100%',
          background: isOwn ? '#dcf8c6' : '#ffffff',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          position: 'relative'
        }}>
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isOwn ? '#128C7E' : '#25D366',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 16,
              flexShrink: 0,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {isPlaying ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <rect x="0" y="0" width="4" height="14" rx="1"/>
                <rect x="8" y="0" width="4" height="14" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <path d="M0 0L12 7L0 14V0Z"/>
              </svg>
            )}
          </button>

          {/* Waveform */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 24,
            flex: 1,
            minWidth: '120px'
          }}>
            {getWaveformBars()}
          </div>

          {/* Time Display and Status */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2
          }}>
            <div style={{
              fontSize: 11,
              color: isOwn ? '#6b7280' : '#9ca3af',
              fontWeight: 500,
              minWidth: '38px',
              textAlign: 'right',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {isPlaying ? formatTime(currentTime) : formatTime(duration || 0)}
            </div>
            {isOwn && (
              <div style={{ 
                fontSize: 14,
                color: '#4ade80',
                lineHeight: 1
              }}>
                ✓✓
              </div>
            )}
          </div>
        </div>

        {/* Timestamp below bubble */}
        <div style={{
          fontSize: 10,
          color: '#9ca3af',
          marginTop: 2,
          paddingLeft: isOwn ? 0 : 12,
          paddingRight: isOwn ? 12 : 0,
          textAlign: isOwn ? 'right' : 'left'
        }}>
          {new Date(message.created_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
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
