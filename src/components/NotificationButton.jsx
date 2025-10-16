import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import FloatingNotificationPanel from './FloatingNotificationPanel'

export default function NotificationButton({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const buttonRef = useRef(null)

  // Simular carga de notificaciones (reemplazar con tu lógica real)
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Aquí iría tu lógica para cargar notificaciones
        // Por ahora simulamos con un número aleatorio
        const count = Math.floor(Math.random() * 5)
        setUnreadCount(count)
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()
    
    // Simular nuevas notificaciones cada 30 segundos
    const interval = setInterval(() => {
      const newCount = Math.floor(Math.random() * 3)
      if (newCount > 0) {
        setUnreadCount(prev => prev + newCount)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left"
      >
        <Bell className="w-4 h-4" />
        <span className="flex-1">Notificaciones</span>
        
        {/* Badge de notificaciones - sin animación bounce */}
        {unreadCount > 0 && (
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Panel de notificaciones */}
      <FloatingNotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigate={onNavigate}
      />

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        `
      }} />
    </>
  )
}
