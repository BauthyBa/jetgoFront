import { useState, useEffect } from 'react'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowStatus(true)
      setTimeout(() => setShowStatus(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showStatus && isOnline) return null

  return (
    <div className={`
      fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300
      ${isOnline 
        ? 'bg-emerald-500/90 text-white' 
        : 'bg-red-500/90 text-white'
      }
    `}>
      <div className="flex items-center gap-2">
        <div className={`
          w-2 h-2 rounded-full animate-pulse
          ${isOnline ? 'bg-white' : 'bg-white'}
        `} />
        <span className="text-sm font-medium">
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </span>
      </div>
    </div>
  )
}
