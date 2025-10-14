import { useState, useEffect } from 'react'
import { getTripExpenseSummary, formatExpenseAmount } from '@/services/expenses'

export default function TripExpenseSummary({ 
  tripId, 
  userId = null,
  showUserBalance = true 
}) {
  const [summary, setSummary] = useState(null)
  const [userBalance, setUserBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSummary()
  }, [tripId, userId])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await getTripExpenseSummary(tripId, userId)
      
      if (response.ok) {
        setSummary(response.data.summary)
        if (showUserBalance && userId) {
          setUserBalance(response.data.user_balance)
        }
      } else {
        setError(response.error || 'Error al cargar el resumen')
      }
    } catch (err) {
      console.error('Error loading summary:', err)
      setError('Error al cargar el resumen')
    } finally {
      setLoading(false)
    }
  }

  const renderLoadingState = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderErrorState = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center">
        <div className="text-red-400 text-4xl mb-2">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error al cargar resumen
        </h3>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center">
        <div className="text-gray-400 text-4xl mb-2">💰</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sin gastos registrados
        </h3>
        <p className="text-gray-600">
          Los gastos del viaje aparecerán aquí cuando se registren.
        </p>
      </div>
    </div>
  )

  if (loading) {
    return renderLoadingState()
  }

  if (error) {
    return renderErrorState()
  }

  if (!summary || summary.expense_count === 0) {
    return renderEmptyState()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Resumen de Gastos
        </h3>
        <div className="text-sm text-gray-500">
          {summary.expense_count} gasto{summary.expense_count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formatExpenseAmount(summary.total_expenses, summary.currency)}
          </div>
          <div className="text-sm text-gray-600">Total Gastado</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatExpenseAmount(summary.total_paid, summary.currency)}
          </div>
          <div className="text-sm text-gray-600">Total Pagado</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatExpenseAmount(summary.total_owed, summary.currency)}
          </div>
          <div className="text-sm text-gray-600">Total Debe</div>
        </div>
      </div>

      {/* Balance del usuario */}
      {showUserBalance && userBalance && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Tu Balance
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatExpenseAmount(userBalance.total_owed, summary.currency)}
              </div>
              <div className="text-xs text-gray-600">Debes</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatExpenseAmount(userBalance.total_paid, summary.currency)}
              </div>
              <div className="text-xs text-gray-600">Has Pagado</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                userBalance.balance > 0 
                  ? 'text-red-600' 
                  : userBalance.balance < 0 
                    ? 'text-green-600' 
                    : 'text-gray-900'
              }`}>
                {formatExpenseAmount(Math.abs(userBalance.balance), summary.currency)}
              </div>
              <div className="text-xs text-gray-600">
                {userBalance.balance > 0 
                  ? 'Debes' 
                  : userBalance.balance < 0 
                    ? 'Te Deben' 
                    : 'Saldo Cero'
                }
              </div>
            </div>
          </div>

          {userBalance.balance !== 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {userBalance.balance > 0 
                  ? `Debes ${formatExpenseAmount(userBalance.balance, summary.currency)} en total`
                  : `Te deben ${formatExpenseAmount(Math.abs(userBalance.balance), summary.currency)} en total`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Resumen general */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Promedio por gasto:</span>
          <span className="font-medium text-gray-900">
            {formatExpenseAmount(
              summary.total_expenses / summary.expense_count, 
              summary.currency
            )}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-600">Moneda:</span>
          <span className="font-medium text-gray-900">{summary.currency}</span>
        </div>
      </div>
    </div>
  )
}
