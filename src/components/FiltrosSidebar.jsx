import { useState } from 'react'
import { RotateCcw, Clock, Shield, Car, Users } from 'lucide-react'

export default function FiltrosSidebar({ filtros, onFiltrosChange, onLimpiarFiltros }) {
  const [filtrosLocales, setFiltrosLocales] = useState(filtros)

  const handleFiltroChange = (campo, valor) => {
    const nuevosFiltros = { ...filtrosLocales, [campo]: valor }
    setFiltrosLocales(nuevosFiltros)
    onFiltrosChange(nuevosFiltros)
  }


  const opcionesOrdenar = [
    { value: 'fecha_asc', label: 'Fecha más temprana' },
    { value: 'fecha_desc', label: 'Fecha más tardía' },
    { value: 'precio_asc', label: 'Precio más bajo' },
    { value: 'precio_desc', label: 'Precio más alto' },
    { value: 'participantes_asc', label: 'Menos participantes' },
    { value: 'participantes_desc', label: 'Más participantes' }
  ]

  const opcionesPresupuesto = [
    { value: '0-100', label: 'Hasta $100' },
    { value: '100-500', label: '$100 - $500' },
    { value: '500-1000', label: '$500 - $1000' },
    { value: '1000+', label: 'Más de $1000' }
  ]

  const opcionesParticipantes = [
    { value: '1-2', label: '1-2 personas' },
    { value: '3-5', label: '3-5 personas' },
    { value: '6-10', label: '6-10 personas' },
    { value: '10+', label: 'Más de 10 personas' }
  ]

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
      {/* Header con botón limpiar */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Ordenar por</h3>
        <button
          onClick={onLimpiarFiltros}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Borrar todo
        </button>
      </div>

      {/* Filtros de ordenamiento */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-slate-300 mb-4">Ordenar por</h4>
        <div className="space-y-2">
          {opcionesOrdenar.map((opcion) => (
            <label
              key={opcion.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="ordenar"
                value={opcion.value}
                checked={filtrosLocales.ordenar === opcion.value}
                onChange={(e) => handleFiltroChange('ordenar', e.target.value)}
                className="w-4 h-4 text-blue-600 bg-transparent border-2 border-slate-400 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                {opcion.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtros de presupuesto */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Rango de precio
        </h4>
        <div className="space-y-2">
          {opcionesPresupuesto.map((opcion) => (
            <label
              key={opcion.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filtrosLocales.presupuesto?.includes(opcion.value) || false}
                onChange={(e) => {
                  const nuevasOpciones = e.target.checked
                    ? [...(filtrosLocales.presupuesto || []), opcion.value]
                    : (filtrosLocales.presupuesto || []).filter(p => p !== opcion.value)
                  handleFiltroChange('presupuesto', nuevasOpciones)
                }}
                className="w-4 h-4 text-blue-600 bg-transparent border-2 border-slate-400 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                {opcion.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtro de participantes */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Número de participantes
        </h4>
        <div className="space-y-2">
          {opcionesParticipantes.map((opcion) => (
            <label
              key={opcion.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filtrosLocales.participantes?.includes(opcion.value) || false}
                onChange={(e) => {
                  const nuevasOpciones = e.target.checked
                    ? [...(filtrosLocales.participantes || []), opcion.value]
                    : (filtrosLocales.participantes || []).filter(p => p !== opcion.value)
                  handleFiltroChange('participantes', nuevasOpciones)
                }}
                className="w-4 h-4 text-blue-600 bg-transparent border-2 border-slate-400 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                {opcion.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filtro de confianza */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Calificación
        </h4>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={filtrosLocales.confianza}
            onChange={(e) => handleFiltroChange('confianza', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-transparent border-2 border-slate-400 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
            Solo viajes con buena calificación
          </span>
        </label>
      </div>

      {/* Resumen de filtros activos */}
      {((filtrosLocales.presupuesto && filtrosLocales.presupuesto.length > 0) || 
        (filtrosLocales.participantes && filtrosLocales.participantes.length > 0) || 
        filtrosLocales.confianza) && (
        <div className="pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Filtros activos:</h4>
          <div className="space-y-1">
            {filtrosLocales.presupuesto && filtrosLocales.presupuesto.length > 0 && (
              <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                Precio: {filtrosLocales.presupuesto.length} rangos
              </span>
            )}
            {filtrosLocales.participantes && filtrosLocales.participantes.length > 0 && (
              <span className="inline-block px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                Participantes: {filtrosLocales.participantes.length} opciones
              </span>
            )}
            {filtrosLocales.confianza && (
              <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                Solo viajes con buena calificación
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
