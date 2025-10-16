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
  Route,
  Award,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  CreditCard,
  Smartphone,
  Wifi,
  Coffee,
  Camera,
  Music
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSession } from '@/services/supabase'

export default function CreateTripLanding() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)

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
        <div className="w-full px-6 max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 w-full rounded-3xl p-12 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'}}>
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
            <div className="absolute top-20 right-20 w-32 h-32 bg-blue-500/20 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 left-1/4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                ¡Nuevo! Crea tu viaje en minutos
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Organiza tu próximo <span className="text-emerald-400">viaje</span>
              </h1>
              <p className="text-xl text-slate-200 mb-8 max-w-3xl mx-auto">
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
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 w-full">
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
          <div className="mb-20 w-full">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              ¿Por qué crear tu viaje en JetGo?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
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
          <div className="mb-20 w-full">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Cómo funciona
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
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
          <div className="mb-20 w-full">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Elige tu medio de transporte
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
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
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mb-20 w-full">
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

          {/* Premium Features */}
          <div className="mb-20 w-full">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Características Premium
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
              <div className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-8 border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-emerald-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Award className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Verificación Premium</h3>
                <p className="text-slate-300 text-lg">
                  Perfil verificado con documentos oficiales para mayor confianza
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-blue-500/30 rounded-xl flex items-center justify-center mb-6">
                  <MessageCircle className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Chat en Tiempo Real</h3>
                <p className="text-slate-300 text-lg">
                  Comunicación instantánea con otros viajeros antes y durante el viaje
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-purple-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Seguro de Viaje</h3>
                <p className="text-slate-300 text-lg">
                  Protección automática incluida en todos los viajes publicados
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-orange-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Smartphone className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">App Móvil</h3>
                <p className="text-slate-300 text-lg">
                  Gestiona tus viajes desde cualquier lugar con nuestra app
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-cyan-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Wifi className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">WiFi Gratuito</h3>
                <p className="text-slate-300 text-lg">
                  Acceso a internet durante el viaje para mantenerte conectado
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-green-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Coffee className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Paradas Personalizadas</h3>
                <p className="text-slate-300 text-lg">
                  Planifica paradas en lugares de interés durante tu viaje
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-20 w-full">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              Preguntas Frecuentes
            </h2>
            
            <div className="space-y-4 w-full">
              {[
                {
                  question: "¿Cómo funciona el sistema de pagos?",
                  answer: "Los pagos se realizan de forma segura a través de nuestra plataforma. El dinero se libera automáticamente al completar el viaje, garantizando la seguridad de todos."
                },
                {
                  question: "¿Puedo cancelar mi viaje?",
                  answer: "Sí, puedes cancelar tu viaje hasta 24 horas antes de la fecha de salida. Los reembolsos se procesan automáticamente según nuestras políticas."
                },
                {
                  question: "¿Qué pasa si mi conductor no aparece?",
                  answer: "Tenemos un sistema de respaldo que te ayuda a encontrar transporte alternativo. Además, ofrecemos reembolso completo en estos casos."
                },
                {
                  question: "¿Es seguro viajar con desconocidos?",
                  answer: "Sí, todos nuestros usuarios pasan por un proceso de verificación. Además, tenemos un sistema de calificaciones y reseñas que garantiza la seguridad."
                },
                {
                  question: "¿Puedo llevar equipaje extra?",
                  answer: "Sí, puedes especificar el espacio disponible en tu vehículo y coordinar con los pasajeros sobre el equipaje antes del viaje."
                }
              ].map((faq, index) => (
                <div key={index} className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <button
                    className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="text-xl font-semibold text-white">{faq.question}</span>
                    {openFaq === index ? (
                      <ChevronUp className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-slate-300 text-lg leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="mb-20 w-full">
            <h2 className="text-4xl font-bold text-white text-center mb-16">
              ¿Necesitas Ayuda?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 text-center hover:border-emerald-500/30 transition-all duration-300">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Llamada</h3>
                <p className="text-slate-300 text-lg mb-4">+1 (555) 123-4567</p>
                <p className="text-slate-400">Lun - Vie: 9:00 - 18:00</p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 text-center hover:border-emerald-500/30 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Email</h3>
                <p className="text-slate-300 text-lg mb-4">soporte@jetgo.com</p>
                <p className="text-slate-400">Respuesta en 24h</p>
              </div>

              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30 text-center hover:border-emerald-500/30 transition-all duration-300">
                <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">Chat</h3>
                <p className="text-slate-300 text-lg mb-4">Chat en vivo</p>
                <p className="text-slate-400">Disponible 24/7</p>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center bg-slate-800/30 backdrop-blur-sm rounded-3xl p-12 border border-slate-700/30 w-full">
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