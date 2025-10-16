import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { 
  User, 
  LogIn, 
  UserPlus, 
  Car, 
  MessageCircle, 
  Bell, 
  LogOut, 
  ChevronDown,
  Settings,
  Users,
  Heart
} from 'lucide-react'
import NotificationButton from './NotificationButton'

export default function ProfileMenu({ isLoggedIn, user, onThemeToggle }) {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState('system')
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') || 'system'
      setTheme(stored)
    } catch {}
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('access_token')
      navigate('/')
      setIsOpen(false)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleThemeToggle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    try { 
      localStorage.setItem('theme', next) 
    } catch {}
    
    // Apply theme immediately
    const isDark = next === 'dark' || (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    if (onThemeToggle) onThemeToggle(next)
  }

  const getThemeIcon = () => {
    return theme === 'light' ? '🌞' : theme === 'dark' ? '🌚' : '🌓'
  }

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Usuario'
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Menú de usuario"
      >
        {isLoggedIn && user ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {getUserInitials()}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 top-full mt-2 w-64 sm:w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-slide-in-from-top max-h-[80vh] overflow-y-auto">
          {/* User Info Header (only when logged in) */}
          {isLoggedIn && user && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                  {getUserInitials()}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {getUserName()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section - Solo para usuarios logueados */}
          {isLoggedIn && (
            <div className="border-b border-slate-200 dark:border-slate-600">
              <NotificationButton onNavigate={(path) => navigate(path)} />
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            {!isLoggedIn ? (
              // Not logged in menu
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar sesión
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  Registrarse
                </Link>
              </>
            ) : (
              // Logged in menu
              <>
                <Link
                  to="/dashboard?tab=trips#trips"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Car className="w-4 h-4" />
                  Mis viajes
                </Link>
                <Link
                  to="/modern-chat"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chats
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Perfil
                </Link>
                <Link
                  to="/amigos"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  Amigos
                </Link>
                <Link
                  to="/social"
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Heart className="w-4 h-4" />
                  Social
                </Link>
                
                {/* Separator */}
                <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                
                {/* Theme Toggle */}
                <button
                  onClick={handleThemeToggle}
                  className="flex items-center gap-3 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                  <span className="text-lg">{getThemeIcon()}</span>
                  <span className="text-sm">
                    {theme === 'light' ? 'Modo claro' : theme === 'dark' ? 'Modo oscuro' : 'Sistema'}
                  </span>
                </button>
                
                {/* Separator */}
                <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
