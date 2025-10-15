import { Link, useLocation } from 'react-router-dom'
import GlassCard from './GlassCard'
import ThemeToggle from '@/components/ThemeToggle'
import ColorBar from '@/components/ColorBar'

export default function DashboardLayout({ children }) {
  const location = useLocation()
  const nav = [
    { label: 'Inicio', path: '/dashboard?tab=inicio#inicio', hash: '#inicio', matchPath: '/dashboard' },
    { label: 'Perfil', path: '/dashboard?tab=profile#profile', hash: '#profile', matchPath: '/dashboard' },
    { label: 'Chats', path: '/modern-chat', matchPath: '/modern-chat' },
    { label: 'Viajes', path: '/dashboard?tab=trips#trips', hash: '#trips', matchPath: '/dashboard' },
    { label: 'Gastos', path: '/dashboard?tab=expenses#expenses', hash: '#expenses', matchPath: '/dashboard' },
  ]
  const isActive = (item) => {
    const currentHash = location.hash || '#inicio'
    if (item.hash && item.matchPath) {
      return location.pathname === item.matchPath && currentHash === item.hash
    }
    if (item.matchPath) {
      return location.pathname === item.matchPath
    }
    return currentHash === (item.hash || '')
  }
  return (
    <div className="min-h-screen bg-gradient-hero text-foreground" style={{ display: 'flex', flexDirection: 'column' }}>
      <nav className="sticky top-0 z-40 glass-nav">
        <ColorBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-16">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <img src="/jetgo.png?v=2" alt="JetGo" width="36" height="36" />
                <span className="text-2xl font-extrabold text-brand-gradient hover:opacity-90 transition-colors">JetGo</span>
              </Link>
            </div>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center justify-center space-x-6">
              {nav.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  className={"font-medium transition-colors " + (isActive(n) ? 'text-blue-500' : 'text-slate-200 hover:text-emerald-400')}
                >
                  {n.label}
                </Link>
              ))}
            </div>
            {/* Mobile nav: collapsible */}
            <div className="md:hidden flex items-center justify-end">
              <details>
                <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
                  <span className="btn" style={{ height: 34, padding: '0 10px' }}>Menú</span>
                </summary>
                <div className="glass-card" style={{ position: 'absolute', right: 16, marginTop: 8, padding: 8, display: 'grid', gap: 6 }}>
                  {nav.map((n) => (
                    <Link key={n.path} to={n.path} className={"font-medium " + (isActive(n) ? 'text-blue-400' : 'text-slate-200')}>
                      {n.label}
                    </Link>
                  ))}
                </div>
              </details>
            </div>
            <div className="hidden md:flex items-center justify-end gap-3">
              <ThemeToggle />
              <span className="text-xs text-slate-500 dark:text-slate-400">v1.0.0</span>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}


