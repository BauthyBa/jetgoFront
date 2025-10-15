import { useState, useEffect, useRef } from 'react'

export default function SoundWaves({ isActive, intensity = 1 }) {
  const [waves, setWaves] = useState([])
  const waveIdRef = useRef(0)

  useEffect(() => {
    if (!isActive) {
      setWaves([])
      return
    }

    const createWave = () => {
      const newWave = {
        id: waveIdRef.current++,
        x: 50,
        y: 50,
        size: 0,
        maxSize: 100 + Math.random() * 50,
        opacity: 0.8,
        color: Math.random() > 0.5 ? '#3b82f6' : '#10b981',
        speed: 0.5 + Math.random() * 0.5
      }
      setWaves(prev => [...prev, newWave])
    }

    // Crear ondas cada 200ms
    const interval = setInterval(createWave, 200)
    
    // Animar ondas
    const animate = () => {
      setWaves(prev => 
        prev.map(wave => ({
          ...wave,
          size: wave.size + wave.speed * intensity,
          opacity: wave.opacity - 0.02
        })).filter(wave => wave.opacity > 0 && wave.size < wave.maxSize)
      )
    }

    const animationInterval = setInterval(animate, 50)

    return () => {
      clearInterval(interval)
      clearInterval(animationInterval)
    }
  }, [isActive, intensity])

  if (!isActive || waves.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {waves.map(wave => (
        <div
          key={wave.id}
          className="absolute border-2 rounded-full"
          style={{
            left: `${wave.x}%`,
            top: `${wave.y}%`,
            width: `${wave.size}px`,
            height: `${wave.size}px`,
            borderColor: wave.color,
            opacity: wave.opacity,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.1s ease-out',
            boxShadow: `0 0 ${wave.size / 4}px ${wave.color}`
          }}
        />
      ))}
    </div>
  )
}
