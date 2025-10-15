import { useState, useEffect, useRef } from 'react'

export default function ParticleSystem({ 
  isActive, 
  particleCount = 20, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  intensity = 1 
}) {
  const [particles, setParticles] = useState([])
  const particleIdRef = useRef(0)
  const animationRef = useRef(null)

  useEffect(() => {
    if (!isActive) {
      setParticles([])
      return
    }

    // Crear partículas iniciales
    const createParticles = () => {
      const newParticles = []
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: particleIdRef.current++,
          x: Math.random() * 100,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 6 * intensity,
          vy: (Math.random() - 0.5) * 6 * intensity,
          life: 1,
          maxLife: 1,
          size: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10
        })
      }
      setParticles(newParticles)
    }

    createParticles()

    // Animar partículas
    const animate = () => {
      setParticles(prev => 
        prev.map(particle => {
          const newParticle = {
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 0.02,
            size: particle.size * 0.98,
            vx: particle.vx * 0.98,
            vy: particle.vy * 0.98,
            rotation: particle.rotation + particle.rotationSpeed
          }
          return newParticle
        }).filter(particle => particle.life > 0)
      )
    }

    animationRef.current = setInterval(animate, 50)

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isActive, particleCount, colors, intensity])

  if (!isActive || particles.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color,
            borderRadius: '50%',
            opacity: particle.life,
            transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
            transition: 'all 0.1s ease-out',
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            filter: 'blur(0.5px)'
          }}
        />
      ))}
    </div>
  )
}
