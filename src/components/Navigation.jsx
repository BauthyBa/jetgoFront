import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import { getUserAvatar as getUserAvatarApi } from '@/services/api'
import { MapPin, MessageCircle, Users, Heart, CloudSun, ChevronLeft, ChevronRight, Search, Plus, UserRound, Bell } from 'lucide-react'
import ROUTES from '@/config/routes'
import { useNotifications } from '@/hooks/useNotifications'
import FloatingNotificationPanel from './FloatingNotificationPanel'
import { loadUserAvatar } from '@/utils/avatarHelper'

const EXPANDED_WIDTH = 288
const COLLAPSED_WIDTH = 80

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
  const location = useLocation()
  const { unreadCount, markAllAsRead } = useNotifications()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nav-collapsed')
      if (stored) {
        setIsCollapsed(stored === 'true')
      }
    } catch (_error) {}
  }, [])

  useEffect(() => {
    let mounted = true
    getSession().then((s) => {
      if (mounted) {
        setLoggedIn(!!s?.user)
        setUser(s?.user || null)
      }
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) {
        setLoggedIn(!!session?.user)
        setUser(session?.user || null)
      }
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
  }, [sidebarWidth])

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty('--sidebar-width', '0px')
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadUserProfile = async () => {
      if (!loggedIn || !user?.id) {
        if (active) setUserProfile(null)
        return
      }
      try {
        // Cargar avatar desde el backend (usa admin, sin problemas de RLS)
        const avatarUrl = await loadUserAvatar(user.id)
        
        // Cargar datos del usuario
        const { data, error } = await supabase
          .from('User')
          .select('userid,nombre,apellido')
          .eq('userid', user.id)
          .single()
        
        if (!active) return
        
        if (data && !error) {
          setUserProfile({
            ...data,
            avatar_url: avatarUrl || null
          })
        } else {
          // Fallback si no hay datos en User
          setUserProfile({
            userid: user.id,
            avatar_url: avatarUrl || user.user_metadata?.avatar_url
          })
        }
      } catch (profileError) {
        console.error('Error loading user profile in navigation:', profileError)
      }
    }

    loadUserProfile()

    return () => {
      active = false
    }
  }, [loggedIn, user])

  const navItems = useMemo(
    () => [
      {
        label: 'Viajes',
        path: ROUTES.VIAJES,
        to: `${ROUTES.VIAJES}?view=search`,
        icon: MapPin,
        isActive: (loc) => loc.pathname === ROUTES.VIAJES,
      },
      {
        label: 'Chats',
        path: ROUTES.MODERN_CHAT,
        icon: MessageCircle,
        isActive: (loc) =>
          loc.pathname === ROUTES.CHATS || loc.pathname.startsWith(ROUTES.MODERN_CHAT) || loc.pathname.startsWith(ROUTES.DASHBOARD),
      },
      {
        label: 'Perfil',
        path: ROUTES.PROFILE,
        icon: UserRound,
        isActive: (loc) => loc.pathname.startsWith(ROUTES.PROFILE),
      },
      {
        label: 'Amigos',
        path: ROUTES.AMIGOS,
        icon: Users,
        isActive: (loc) => loc.pathname.startsWith(ROUTES.AMIGOS),
      },
      {
        label: 'Social',
        path: ROUTES.SOCIAL,
        icon: Heart,
        isActive: (loc) => loc.pathname.startsWith(ROUTES.SOCIAL),
      },
      {
        label: 'Clima',
        path: ROUTES.CLIMA,
        icon: CloudSun,
        isActive: (loc) => loc.pathname.startsWith(ROUTES.CLIMA),
      },
    ],
    [],
  )

  const desktopNavItems = useMemo(() => navItems.filter((item) => item.label !== 'Perfil'), [navItems])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('nav-collapsed', String(next))
      } catch (_error) {}
      return next
    })
  }

  const hideMobileNav =
    location.pathname.startsWith(ROUTES.MODERN_CHAT) ||
    location.pathname.startsWith(ROUTES.CHATS) ||
    location.pathname.startsWith(ROUTES.DASHBOARD)

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden h-screen flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur md:flex transition-[width] duration-300"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-5">
            <Link to={ROUTES.HOME} className="flex items-center gap-2">
              <img src="/jetgo.png?v=2" alt="JetGo" width="36" height="36" className="rounded-lg shadow-lg" />
              {!isCollapsed && <span className="text-2xl font-bold text-white">JetGo</span>}
            </Link>
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10"
              aria-label={isCollapsed ? 'Mostrar navegación' : 'Ocultar navegación'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="px-4 pb-4">
            <Link to={`${ROUTES.VIAJES}?view=search`} className="mb-3 block">
              <Button
                variant="secondary"
                className={`w-full justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 ${isCollapsed ? 'px-2' : ''}`}
              >
                <Search className="h-4 w-4" />
                {!isCollapsed && <span>Buscar viajes</span>}
              </Button>
            </Link>
            <Link to={ROUTES.CREAR_VIAJE} className="block">
              <Button className="w-full justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400">
                <Plus className="h-4 w-4" />
                {!isCollapsed && <span>Crear viaje</span>}
              </Button>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            <nav className="space-y-1 pb-6">
              {desktopNavItems.map((item) => {
                const Icon = item.icon
                const active = item.isActive(location)
                return (
                  <Link
                    key={item.path}
                    to={item.to || item.path}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-200 hover:bg-white/5 hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-emerald-400' : 'text-slate-300'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
              
              {/* Botón de Notificaciones */}
              <Link
                to="/notificaciones"
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition text-slate-200 hover:bg-white/5 hover:text-white ${location.pathname === '/notificaciones' ? 'bg-emerald-500/10 text-emerald-400' : ''} ${isCollapsed ? 'justify-center' : ''}`}
              >
                <div className="relative">
                  <Bell className={`h-5 w-5 ${location.pathname === '/notificaciones' ? 'text-emerald-400' : 'text-slate-300'}`} />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                {!isCollapsed && <span>Notificaciones</span>}
              </Link>
            </nav>
          </div>

          <div className="border-t border-white/5 px-4 py-5">
            {loggedIn ? (
              <Link
                to={ROUTES.PROFILE}
                className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition ${
                  isCollapsed ? 'justify-center hover:border-emerald-400/50' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <UserAvatar user={user} userProfile={userProfile} isCollapsed={isCollapsed} />
                {!isCollapsed && (
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-white">{getUserDisplayName(user, userProfile)}</span>
                    <span className="text-xs text-slate-400">Ver perfil</span>
                  </div>
                )}
              </Link>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className={`flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white ${
                  isCollapsed ? '' : 'bg-white/5'
                }`}
              >
                {isCollapsed ? <UserRound className="h-5 w-5" /> : <span>Iniciar sesión</span>}
              </Link>
            )}
          </div>
        </div>
      </aside>

      {!hideMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-900/90 backdrop-blur-lg md:hidden">
          <div className="mx-auto flex max-w-xl justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = item.isActive(location)
              return (
                <Link
                  key={item.path}
                  to={item.to || item.path}
                  className={`flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    active ? 'text-emerald-400' : 'text-slate-200 hover:text-emerald-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'fill-emerald-500/20 text-emerald-400' : 'text-slate-200'}`} />
                  <span className="mt-1">{item.label}</span>
                </Link>
              )
            })}
            
            {/* Botón de Notificaciones Móvil */}
            <Link
              to="/notificaciones"
              className={`flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${location.pathname === '/notificaciones' ? 'text-emerald-400' : 'text-slate-200 hover:text-emerald-200'}`}
            >
              <div className="relative">
                <Bell className={`h-5 w-5 ${location.pathname === '/notificaciones' ? 'text-emerald-400' : 'text-slate-200'}`} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <span className="mt-1">Notif.</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Panel de Notificaciones */}
      <FloatingNotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNavigate={(path) => {
          setIsNotificationPanelOpen(false)
          window.location.href = path
        }}
      />
    </>
  )
}

function getUserDisplayName(user, userProfile) {
  if (userProfile?.nombre && userProfile?.apellido) {
    return `${userProfile.nombre} ${userProfile.apellido}`
  }
  if (userProfile?.nombre) {
    return userProfile.nombre
  }
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }
  if (user?.email) {
    return user.email.split('@')[0]
  }
  return 'Mi perfil'
}

function getUserAvatarUrl(user, userProfile) {
  if (userProfile?.avatar_url) return userProfile.avatar_url
  if (user?.user_metadata?.avatar_url) return user.user_metadata.avatar_url
  return null
}

function getUserInitials(user, userProfile) {
  if (userProfile?.nombre && userProfile?.apellido) {
    return `${userProfile.nombre.charAt(0)}${userProfile.apellido.charAt(0)}`.toUpperCase()
  }
  if (userProfile?.nombre) {
    return userProfile.nombre.charAt(0).toUpperCase()
  }
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }
  if (user?.email) {
    return user.email.charAt(0).toUpperCase()
  }
  return 'U'
}

function UserAvatar({ user, userProfile, isCollapsed }) {
  const avatarUrl = getUserAvatarUrl(user, userProfile)
  const initials = getUserInitials(user, userProfile)

  if (avatarUrl) {
    return <img src={avatarUrl} alt="Avatar de usuario" className={`h-10 w-10 rounded-full border-2 border-white/10 object-cover shadow-lg ${isCollapsed ? '' : 'bg-slate-900'}`} />
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-semibold text-white shadow-lg">
      {initials}
    </div>
  )
}
