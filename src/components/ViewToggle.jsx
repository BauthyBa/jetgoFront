import { Grid, List, LayoutGrid } from 'lucide-react'

export default function ViewToggle({ viewMode, onViewModeChange, className = '' }) {
  return (
    <div className={`flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50 ${className}`}>
      <button
        onClick={() => onViewModeChange('card')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'card'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
        }`}
        title="Vista de tarjetas"
      >
        <Grid className="w-4 h-4" />
        <span className="hidden sm:inline">Tarjetas</span>
      </button>
      
      <button
        onClick={() => onViewModeChange('list')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'list'
            ? 'bg-emerald-500 text-white shadow-lg'
            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
        }`}
        title="Vista de lista"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Lista</span>
      </button>
    </div>
  )
}
