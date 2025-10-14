import { useState, useEffect } from 'react'
import TripExpenseSummary from './TripExpenseSummary'
import TripExpensesList from './TripExpensesList'
import TripExpenseForm from './TripExpenseForm'
import { Button } from '@/components/ui/button'

export default function TripExpensesSection({ 
  tripId, 
  tripName,
  currentUserId,
  isParticipant = false,
  canCreate = false,
  canEdit = false,
  canDelete = false
}) {
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expensesCount, setExpensesCount] = useState(0)

  const handleCreateExpense = () => {
    setEditingExpense(null)
    setShowExpenseForm(true)
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleExpenseSuccess = (expenseData) => {
    setShowExpenseForm(false)
    setEditingExpense(null)
    // Recargar la página para mostrar el nuevo gasto
    window.location.reload()
  }

  const handleExpenseDelete = (deletedExpense) => {
    // Actualizar contador si es necesario
    setExpensesCount(prev => Math.max(0, prev - 1))
  }

  const handleCancelForm = () => {
    setShowExpenseForm(false)
    setEditingExpense(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Gastos del Viaje
          </h2>
          <p className="text-sm text-gray-600">
            {tripName} - {expensesCount} gasto{expensesCount !== 1 ? 's' : ''} registrado{expensesCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        {canCreate && (
          <Button
            onClick={handleCreateExpense}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Nuevo Gasto
          </Button>
        )}
      </div>

      {/* Resumen */}
      <TripExpenseSummary 
        tripId={tripId}
        userId={currentUserId}
        showUserBalance={isParticipant}
      />

      {/* Lista de Gastos */}
      <TripExpensesList
        tripId={tripId}
        userId={currentUserId}
        showStats={false} // Ya mostramos el resumen arriba
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        onCreate={handleCreateExpense}
        onEdit={handleEditExpense}
        onDelete={handleExpenseDelete}
      />

      {/* Formulario Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <TripExpenseForm
              tripId={tripId}
              payerId={currentUserId}
              expense={editingExpense}
              onSuccess={handleExpenseSuccess}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}

      {/* Estado para no participantes */}
      {!isParticipant && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-gray-600">ℹ️</div>
            <div>
              <h3 className="font-medium text-gray-900">
                Solo los participantes pueden ver gastos
              </h3>
              <p className="text-sm text-gray-600">
                Para poder ver los gastos de este viaje, debes ser un participante del mismo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
