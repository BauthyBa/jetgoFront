import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Car, 
  Users, 
  DollarSign, 
  Star, 
  MapPin, 
  Calendar,
  ArrowRight,
  CheckCircle,
  Heart,
  Globe,
  Shield,
  Plane,
  Bus,
  Train,
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  Sparkles,
  Target,
  Route
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSession } from '@/services/supabase'

export default function CreateTripLanding() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await getSession()
        if (session?.user) {
          setProfile(session.user)
        }
      } catch (error) {
        console.error('Error cargando perfil:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="pt-20 pb-12">
        <div className="max-w-full mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              ¡Nuevo! Crea tu viaje en minutos
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Organiza tu próximo <span className="text-emerald-400">viaje</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Conecta con viajeros que comparten tu destino y convierte cada viaje en una aventura compartida
            </p>
            <Button 
              onClick={() => navigate('/crear-viaje/formulario')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all duration-300"
            >
              <Route className="w-5 h-5 mr-2" />
              Crear mi viaje
            </Button>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">2,500+</div>
                  <div className="text-slate-400 text-lg">Viajeros activos</div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">40+</div>
                  <div className="text-slate-400 text-lg">Países conectados</div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">85%</div>
                  <div className="text-slate-400 text-lg">Ahorro promedio</div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              ¿Por qué crear tu viaje en JetGo?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Ahorra dinero</h3>
                <p className="text-slate-300 text-lg">
                  Divide los costos de transporte, alojamiento y actividades con otros viajeros
                </p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Conoce gente</h3>
                <p className="text-slate-300 text-lg">
                  Conecta con personas que comparten tus intereses y pasión por viajar
                </p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Viaja seguro</h3>
                <p className="text-slate-300 text-lg">
                  Sistema de verificación y calificaciones para garantizar viajes seguros
                </p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Fácil de usar</h3>
                <p className="text-slate-300 text-lg">
                  Crea tu viaje en minutos con nuestro formulario intuitivo
                </p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Heart className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Experiencias únicas</h3>
                <p className="text-slate-300 text-lg">
                  Descubre lugares y actividades que no encontrarías viajando solo
                </p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Flexibilidad total</h3>
                <p className="text-slate-300 text-lg">
                  Define tus fechas, presupuesto y preferencias a tu medida
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Cómo funciona
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 text-white font-bold text-2xl">
                  1
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Crea tu viaje</h3>
                <p className="text-slate-300 text-lg">
                  Completa el formulario con destino, fechas, presupuesto y preferencias
                </p>
              </div>

              <div className="text-center bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 text-white font-bold text-2xl">
                  2
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Recibe solicitudes</h3>
                <p className="text-slate-300 text-lg">
                  Otros viajeros se unirán a tu aventura y podrás conocerlos antes del viaje
                </p>
              </div>

              <div className="text-center bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 text-white font-bold text-2xl">
                  3
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">¡Viaja juntos!</h3>
                <p className="text-slate-300 text-lg">
                  Disfruta de una experiencia única compartiendo gastos y momentos
                </p>
              </div>
            </div>
          </div>

          {/* Transport types */}
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Elige tu medio de transporte
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 text-center hover:scale-105">
                <Car className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <div className="text-white font-semibold text-xl">Auto</div>
              </div>
              
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 text-center hover:scale-105">
                <Bus className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <div className="text-white font-semibold text-xl">Bus</div>
              </div>
              
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 text-center hover:scale-105">
                <Train className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <div className="text-white font-semibold text-xl">Tren</div>
              </div>
              
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 hover:border-emerald-500/30 transition-all duration-300 text-center hover:scale-105">
                <Plane className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <div className="text-white font-semibold text-xl">Avión</div>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mb-20">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Star className="w-10 h-10 text-emerald-400" />
              </div>
              <blockquote className="text-2xl text-slate-200 italic mb-8 max-w-4xl mx-auto leading-relaxed">
                "Creé mi primer viaje a Bariloche y conocí a 3 personas increíbles. No solo ahorramos dinero, sino que hicimos amigos para toda la vida. ¡JetGo cambió completamente mi forma de viajar!"
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  M
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">María González</div>
                  <div className="text-slate-400">Viajera desde 2023</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center bg-slate-800/30 backdrop-blur-sm rounded-3xl p-12 border border-slate-700/30">
            <h2 className="text-4xl font-bold text-white mb-6">
              ¿Listo para tu próxima aventura?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto">
              Únete a miles de viajeros que ya están creando experiencias inolvidables
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                onClick={() => navigate('/crear-viaje/formulario')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 text-xl font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105"
              >
                <Route className="w-6 h-6 mr-3" />
                Crear mi viaje
              </Button>
              <Button 
                onClick={() => navigate('/viajes')}
                variant="secondary"
                className="px-10 py-5 text-xl font-semibold rounded-xl hover:scale-105 transition-all duration-300"
              >
                <MapPin className="w-6 h-6 mr-3" />
                Ver viajes disponibles
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}