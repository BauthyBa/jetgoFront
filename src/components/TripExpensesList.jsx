import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getTripExpenses, calculateExpenseStats, formatExpenseAmount, formatExpenseDate, getCategoryColor, getCategoryIcon } from '@/services/expenses'

export default function TripExpensesList({ 
  tripId, 
  userId,
  showStats = true,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  onCreate,
  onEdit,
  onDelete,
  limit = 20
}) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [stats, setStats] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('')

  const loadExpenses = async (reset = false) => {
    try {
      setLoading(true)
      setError('')

      const filters = {
        limit,
        offset: reset ? 0 : offset,
        trip_id: tripId
      }

      if (userId) filters.user_id = userId
      if (selectedCategory) filters.category = selectedCategory

      const response = await getTripExpenses(filters)
      
      if (response.ok) {
        const newExpenses = response.data || []
        
        if (reset) {
          setExpenses(newExpenses)
          setOffset(limit)
        } else {
          setExpenses(prev => [...prev, ...newExpenses])
          setOffset(prev => prev + limit)
        }
        
        setHasMore(newExpenses.length === limit)
        
        // Calcular estadísticas si hay gastos
        if (newExpenses.length > 0) {
          const allExpenses = reset ? newExpenses : [...expenses, ...newExpenses]
          setStats(calculateExpenseStats(allExpenses))
        }
      } else {
        setError(response.error || 'Error al cargar los gastos')
      }
    } catch (err) {
      console.error('Error loading expenses:', err)
      setError('Error al cargar los gastos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses(true)
  }, [tripId, userId, selectedCategory])

  const handleLoadMore = () => {
    loadExpenses(false)
  }

  const handleExpenseUpdate = (updatedExpense) => {
    setExpenses(prev => 
      prev.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    )
  }

  const handleExpenseDelete = (deletedExpense) => {
    setExpenses(prev => prev.filter(expense => expense.id !== deletedExpense.id))
    onDelete?.(deletedExpense)
  }

  const renderExpenseCard = (expense) => (
    <div key={expense.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: getCategoryColor(expense.category) }}
          >
            {getCategoryIcon(expense.category)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{expense.description}</h3>
            <p className="text-sm text-gray-500">
              {expense.payer?.nombre} {expense.payer?.apellido}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            {formatExpenseAmount(expense.amount, expense.currency)}
          </p>
          <p className="text-sm text-gray-500">
            {formatExpenseDate(expense.expense_date)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{expense.category}</span>
          {expense.location && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{expense.location}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {expense.status === 'pending' && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Pendiente
            </span>
          )}
          {expense.status === 'approved' && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              Aprobado
            </span>
          )}
          {expense.status === 'settled' && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Saldado
            </span>
          )}
        </div>
      </div>

      {expense.notes && (
        <p className="text-sm text-gray-600 mb-3">{expense.notes}</p>
      )}

      {/* Divisiones del gasto */}
      {expense.splits && expense.splits.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">División del gasto:</h4>
          <div className="space-y-1">
            {expense.splits.map((split) => (
              <div key={split.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {split.user?.nombre} {split.user?.apellido}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900">
                    {formatExpenseAmount(split.amount_owed, expense.currency)}
                  </span>
                  {split.is_settled && (
                    <span className="text-green-600">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comentarios */}
      {expense.comments && expense.comments.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Comentarios:</h4>
          <div className="space-y-2">
            {expense.comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {comment.user?.nombre} {comment.user?.apellido}
                  </span>
                  <span className="text-gray-500">
                    {formatExpenseDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-gray-600">{comment.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
        {canEdit && expense.payer_id === userId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit?.(expense)}
          >
            Editar
          </Button>
        )}
        {canDelete && expense.payer_id === userId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete?.(expense)}
            className="text-red-600 hover:text-red-700"
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  )

  const renderStats = () => {
    if (!stats || stats.expenseCount === 0) return null

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen de Gastos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatExpenseAmount(stats.totalExpenses)}
            </div>
            <div className="text-sm text-gray-600">Total Gastado</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatExpenseAmount(stats.averageExpense)}
            </div>
            <div className="text-sm text-gray-600">Promedio por Gasto</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.expenseCount}
            </div>
            <div className="text-sm text-gray-600">Total Gastos</div>
          </div>
        </div>

        {/* Desglose por categoría */}
        {stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Por categoría:</h4>
            {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <span className="text-sm text-gray-700">{category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatExpenseAmount(data.total)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.count} gasto{data.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">💰</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No hay gastos registrados
      </h3>
      <p className="text-gray-600 mb-4">
        Los gastos del viaje aparecerán aquí cuando se registren.
      </p>
      {canCreate && (
        <Button
          onClick={() => onCreate?.()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Registrar Primer Gasto
        </Button>
      )}
    </div>
  )

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading && expenses.length === 0) {
    return renderLoadingState()
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error al cargar gastos
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadExpenses(true)}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  if (expenses.length === 0) {
    return renderEmptyState()
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {showStats && renderStats()}

      {/* Filtros */}
      <div className="flex items-center space-x-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las categorías</option>
          <option value="Transporte">Transporte</option>
          <option value="Alojamiento">Alojamiento</option>
          <option value="Comida">Comida</option>
          <option value="Actividades">Actividades</option>
          <option value="Compras">Compras</option>
          <option value="Emergencias">Emergencias</option>
          <option value="Comunicación">Comunicación</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.map(renderExpenseCard)}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            onClick={handleLoadMore}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Cargando...' : 'Cargar más gastos'}
          </Button>
        </div>
      )}

      {/* No More Expenses */}
      {!hasMore && expenses.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Has visto todos los gastos disponibles
          </p>
        </div>
      )}
    </div>
  )
}
