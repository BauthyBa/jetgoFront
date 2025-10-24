import { useState } from 'react'
import TripCardEnhanced from './TripCardEnhanced'
import ViewToggle from './ViewToggle'
import { Filter, Search } from 'lucide-react'

export default function TripGridEnhanced({ 
  trips, 
  onJoin, 
  onLeave, 
  joiningId, 
  leavingId, 
  onEdit, 
  canEdit, 
  isMemberFn, 
  isOwnerFn, 
  onApply, 
  hasAppliedFn,
  showViewToggle = true,
  showFilters = true
}) {
  const [viewMode, setViewMode] = useState('card')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  // Filtrar viajes
  const filteredTrips = (trips || []).filter(trip => {
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        trip.name?.toLowerCase().includes(searchLower) ||
        trip.origin?.toLowerCase().includes(searchLower) ||
        trip.destination?.toLowerCase().includes(searchLower) ||
        trip.country?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Filtro por tipo de transporte
    if (filterType !== 'all' && trip.tipo !== filterType) {
      return false
    }

    return true
  })

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleFilterChange = (type) => {
    setFilterType(type)
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar viajes..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 w-full sm:w-64"
            />
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="all">Todos los transportes</option>
                <option value="auto">Auto</option>
                <option value="bus">Bus</option>
                <option value="tren">Tren</option>
                <option value="avion">Avión</option>
              </select>
            </div>
          )}
        </div>

        {/* Toggle de vista */}
        {showViewToggle && (
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange}
          />
        )}
      </div>

      {/* Resultados */}
      <div className="text-sm text-slate-400 mb-4">
        {filteredTrips.length} viaje{filteredTrips.length !== 1 ? 's' : ''} encontrado{filteredTrips.length !== 1 ? 's' : ''}
        {searchTerm && ` para "${searchTerm}"`}
        {filterType !== 'all' && ` con transporte ${filterType}`}
      </div>

      {/* Grid de viajes */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No se encontraron viajes</h3>
          <p className="text-slate-400">
            {searchTerm || filterType !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'No hay viajes disponibles en este momento'
            }
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'card' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredTrips.map((trip) => (
            <TripCardEnhanced
              key={trip.id}
              trip={trip}
              viewMode={viewMode}
              joining={joiningId === trip.id}
              leaving={leavingId === trip.id}
              onJoin={() => onJoin(trip)}
              onLeave={() => onLeave && onLeave(trip)}
              onEdit={onEdit ? () => onEdit(trip) : undefined}
              canEdit={!!canEdit && canEdit(trip)}
              isMember={!!isMemberFn && isMemberFn(trip)}
              isOwner={!!isOwnerFn && isOwnerFn(trip)}
              onApply={onApply ? () => onApply(trip) : undefined}
              hasApplied={!!hasAppliedFn && hasAppliedFn(trip)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
