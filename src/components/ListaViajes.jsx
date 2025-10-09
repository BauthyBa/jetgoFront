import { useState } from 'react'
import TarjetaViaje from './TarjetaViaje'
import { Car, Bus, Train, Loader2 } from 'lucide-react'

export default function ListaViajes({ viajes, loading, desde, hasta, creadoresInfo }) {
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const tiposTransporte = [
    { value: 'todos', label: 'Todos', icon: null },
    { value: 'auto', label: 'Auto', icon: Car },
    { value: 'bus', label: 'Bus', icon: Bus },
    { value: 'tren', label: 'Tren', icon: Train }
  ]

  const viajesFiltrados = filtroTipo === 'todos' 
    ? viajes 
    : viajes.filter(viaje => viaje.tipo === filtroTipo)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando viajes...</span>
        </div>
      </div>
    )
  }

  if (viajesFiltrados.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No se encontraron viajes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No se encontraron viajes para tu búsqueda. Probá cambiar los filtros.
          </p>
          {desde && hasta && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {desde} → {hasta}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header con contador y filtros de tipo */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {viajesFiltrados.length} viajes disponibles
          </h2>
        </div>

        {/* Filtros de tipo de transporte */}
        <div className="flex gap-2 flex-wrap">
          {tiposTransporte.map((tipo) => {
            const Icon = tipo.icon
            return (
              <button
                key={tipo.value}
                onClick={() => setFiltroTipo(tipo.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTipo === tipo.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {tipo.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de viajes */}
      <div className="space-y-4">
        {viajesFiltrados.map((viaje) => (
          <TarjetaViaje 
            key={viaje.id} 
            viaje={viaje} 
            creadorNombre={creadoresInfo[viaje.creatorId] || 'Usuario'}
          />
        ))}
      </div>

      {/* Información adicional */}
      {viajesFiltrados.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Mostrando {viajesFiltrados.length} de {viajes.length} viajes
          </p>
        </div>
      )}
    </div>
  )
}
