import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import FiltrosSidebar from '@/components/FiltrosSidebar'
import ListaViajes from '@/components/ListaViajes'
import Navigation from '@/components/Navigation'
import { listTrips } from '@/services/trips'
import { supabase } from '@/services/supabase'
import { Filter, X } from 'lucide-react'

export default function ViajesPage() {
  const [searchParams] = useSearchParams()
  const [filtros, setFiltros] = useState({
    ordenar: 'fecha_asc',
    presupuesto: [],
    participantes: [],
    confianza: false
  })
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [creadoresInfo, setCreadoresInfo] = useState({})

  // Obtener parámetros de búsqueda
  const desde = searchParams.get('desde') || ''
  const hasta = searchParams.get('hasta') || ''
  const fecha = searchParams.get('fecha') || ''

  // Función para obtener información de los creadores
  const fetchCreadoresInfo = async (viajes) => {
    const creatorIds = viajes
      .map(viaje => viaje.creatorId)
      .filter(Boolean)
      .filter((id, index, arr) => arr.indexOf(id) === index) // Eliminar duplicados
    
    if (creatorIds.length === 0) return {}
    
    try {
      const { data, error } = await supabase
        .from('User')
        .select('userid, nombre, apellido')
        .in('userid', creatorIds)
      
      if (error) throw error
      
      const map = {}
      for (const row of data || []) {
        const fullName = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && fullName) {
          map[row.userid] = fullName
        }
      }
      return map
    } catch (error) {
      console.error('Error cargando información de creadores:', error)
      return {}
    }
  }

  useEffect(() => {
    const cargarViajes = async () => {
      setLoading(true)
      try {
        const viajesReales = await listTrips()
        
        // Filtrar viajes según los parámetros de búsqueda
        let viajesFiltrados = viajesReales
        
        if (desde) {
          viajesFiltrados = viajesFiltrados.filter(viaje => 
            viaje.origin?.toLowerCase().includes(desde.toLowerCase())
          )
        }
        
        if (hasta) {
          viajesFiltrados = viajesFiltrados.filter(viaje => 
            viaje.destination?.toLowerCase().includes(hasta.toLowerCase())
          )
        }
        
        if (fecha) {
          const fechaBusqueda = new Date(fecha)
          viajesFiltrados = viajesFiltrados.filter(viaje => {
            if (!viaje.startDate) return true
            const fechaViaje = new Date(viaje.startDate)
            return fechaViaje.toDateString() === fechaBusqueda.toDateString()
          })
        }
        
        setViajes(viajesFiltrados)
        
        // Cargar información de los creadores
        const creadores = await fetchCreadoresInfo(viajesFiltrados)
        setCreadoresInfo(creadores)
      } catch (error) {
        console.error('Error cargando viajes:', error)
        setViajes([])
      } finally {
        setLoading(false)
      }
    }

    cargarViajes()
  }, [desde, hasta, fecha])

  const aplicarFiltros = (nuevosFiltros) => {
    setFiltros(nuevosFiltros)
    // Aquí se aplicarían los filtros a los datos
    // Por ahora solo actualizamos el estado
  }

  const limpiarFiltros = () => {
    setFiltros({
      ordenar: 'fecha_asc',
      presupuesto: [],
      participantes: [],
      confianza: false
    })
  }

  const viajesFiltrados = viajes.filter(viaje => {
    // Aplicar filtros aquí
    if (filtros.tipo_vehiculo !== 'todos' && viaje.tipo !== filtros.tipo_vehiculo) {
      return false
    }
    if (filtros.confianza && viaje.conductor.rating < 4.5) {
      return false
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      <div className="w-full">
        {/* Header con búsqueda */}
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Viajes disponibles
            </h1>
            {desde && hasta && (
              <p className="text-slate-300">
                {desde} → {hasta} • {fecha || 'Hoy'}
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full">
          {/* Filtros Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-1/3 xl:w-1/4 bg-white/5 backdrop-blur-sm border-r border-white/10 min-h-screen">
            <div className="p-6">
              <FiltrosSidebar
                filtros={filtros}
                onFiltrosChange={aplicarFiltros}
                onLimpiarFiltros={limpiarFiltros}
              />
            </div>
          </div>

          {/* Filtros Mobile - Botón para abrir */}
          <div className="lg:hidden fixed top-20 left-4 z-40">
            <button
              onClick={() => setFiltrosAbiertos(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white border border-white/30 hover:bg-white/30 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Lista de viajes */}
          <div className="flex-1 lg:w-2/3 xl:w-3/4 p-6">
            <ListaViajes
              viajes={viajesFiltrados}
              loading={loading}
              desde={desde}
              hasta={hasta}
              creadoresInfo={creadoresInfo}
            />
          </div>
        </div>

        {/* Modal de filtros para móvil */}
        {filtrosAbiertos && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setFiltrosAbiertos(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-800 shadow-xl">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filtros</h3>
                <button
                  onClick={() => setFiltrosAbiertos(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <FiltrosSidebar
                  filtros={filtros}
                  onFiltrosChange={aplicarFiltros}
                  onLimpiarFiltros={limpiarFiltros}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
