import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import ColorBar from '@/components/ColorBar'
import ProfileMenu from '@/components/ProfileMenu'
import { MapPin, MessageCircle, Plus, Search, UserRound, Users, Heart } from 'lucide-react'

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()

  const hideNavLinks =
    location.pathname === '/viajes' ||
    location.pathname.startsWith('/crear-viaje') ||
    location.pathname === '/amigos' ||
    location.pathname === '/chats' ||
    location.pathname === '/modern-chat' ||
    location.pathname === '/social' ||
    location.pathname.startsWith('/profile')

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

  const navItems = useMemo(
    () => [
      {
        label: 'Mis viajes',
        path: '/viajes',
        icon: MapPin,
        isActive: (pathname) => pathname === '/viajes' || pathname.startsWith('/trip'),
      },
      {
        label: 'Chats',
        path: '/chats',
        icon: MessageCircle,
        isActive: (pathname) => pathname === '/chats' || pathname.startsWith('/modern-chat') || pathname.startsWith('/dashboard'),
      },
      {
        label: 'Perfil',
        path: '/profile',
        icon: UserRound,
        isActive: (pathname) => pathname.startsWith('/profile'),
      },
      {
        label: 'Amigos',
        path: '/amigos',
        icon: Users,
        isActive: (pathname) => pathname.startsWith('/amigos'),
      },
      {
        label: 'Social',
        path: '/social',
        icon: Heart,
        isActive: (pathname) => pathname.startsWith('/social'),
      },
    ],
    [],
  )

  return (
    <>
      <nav className="fixed top-0 z-50 hidden w-full md:block glass-nav" style={{ position: 'fixed' }}>
        <ColorBar />
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex flex-shrink-0 items-center gap-2">
            <img src="/jetgo.png?v=2" alt="JetGo" width="44" height="44" />
            <Link to="/" className="text-3xl font-extrabold text-white transition-colors hover:text-emerald-400">
              JetGo
            </Link>
          </div>
          {!hideNavLinks && (
            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center space-x-8 md:flex">
              <a href="#como-funciona" className="font-medium text-slate-200 transition-colors hover:text-emerald-400">
                Cómo funciona
              </a>
              <a href="#beneficios" className="font-medium text-slate-200 transition-colors hover:text-emerald-400">
                Beneficios
              </a>
              <a href="#testimonios" className="font-medium text-slate-200 transition-colors hover:text-emerald-400">
                Testimonios
              </a>
            </div>
          )}
          <div className="ml-auto flex flex-shrink-0 items-center space-x-3">
            <Link to="/viajes" className="hidden md:flex">
              <Button variant="secondary" className="flex items-center gap-2 bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-600">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Buscar viajes</span>
                <span className="sm:hidden">🔍</span>
              </Button>
            </Link>
            <Link to="/crear-viaje">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 font-medium text-white hover:from-emerald-500 hover:to-emerald-400">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Crear Viaje</span>
                <span className="sm:hidden">+</span>
              </Button>
            </Link>
            <ProfileMenu isLoggedIn={loggedIn} user={user} />
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-900/90 backdrop-blur-lg md:hidden">
        <div className="mx-auto flex max-w-xl justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  active ? 'text-emerald-400' : 'text-slate-200 hover:text-emerald-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'fill-emerald-500/20 text-emerald-400' : 'text-slate-200'}`} />
                <span className="mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

