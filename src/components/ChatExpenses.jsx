import { useState, useEffect } from 'react'
import { getTripExpensesByTrip, createTripExpense, getExpenseCategories } from '@/services/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ExpenseStats from './ExpenseStats'

export default function ChatExpenses({ tripId, roomId, userId, userNames = {} }) {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    currency: 'USD'
  })

  // Cargar gastos del viaje
  useEffect(() => {
    if (tripId) {
      loadExpenses()
      loadCategories()
    }
  }, [tripId])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await getTripExpensesByTrip(tripId, 20, 0)
      setExpenses(data?.expenses || [])
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await getExpenseCategories()
      const apiCategories = data?.categories || []
      
      // Categorías por defecto si no hay categorías en la API
      const defaultCategories = [
        { id: 'comida', name: 'Comida', icon: '🍽️', color: '#F59E0B' },
        { id: 'transporte', name: 'Transporte', icon: '🚗', color: '#3B82F6' },
        { id: 'estadia', name: 'Estadía', icon: '🏨', color: '#10B981' },
        { id: 'actividades', name: 'Actividades', icon: '🎯', color: '#8B5CF6' },
        { id: 'compras', name: 'Compras', icon: '🛍️', color: '#EF4444' },
        { id: 'otros', name: 'Otros', icon: '📝', color: '#6B7280' }
      ]
      
      setCategories(apiCategories.length > 0 ? apiCategories : defaultCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
      // Usar categorías por defecto en caso de error
      setCategories([
        { id: 'comida', name: 'Comida', icon: '🍽️', color: '#F59E0B' },
        { id: 'transporte', name: 'Transporte', icon: '🚗', color: '#3B82F6' },
        { id: 'estadia', name: 'Estadía', icon: '🏨', color: '#10B981' },
        { id: 'actividades', name: 'Actividades', icon: '🎯', color: '#8B5CF6' },
        { id: 'compras', name: 'Compras', icon: '🛍️', color: '#EF4444' },
        { id: 'otros', name: 'Otros', icon: '📝', color: '#6B7280' }
      ])
    }
  }

  const handleAddExpense = async () => {
    try {
      if (!newExpense.description || !newExpense.amount || !newExpense.category) {
        alert('Completá todos los campos')
        return
      }

      const expenseData = {
        trip_id: tripId,
        payer_id: userId,
        amount: parseFloat(newExpense.amount),
        description: newExpense.description,
        category: newExpense.category,
        currency: newExpense.currency
      }

      await createTripExpense(expenseData)
      setNewExpense({ description: '', amount: '', category: '', currency: 'USD' })
      setShowAddForm(false)
      loadExpenses() // Recargar gastos
    } catch (error) {
      console.error('Error creating expense:', error)
      alert('Error al crear el gasto')
    }
  }

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'Comida': '🍽️',
      'Transporte': '🚗',
      'Estadía': '🏨',
      'Actividades': '🎯',
      'Compras': '🛍️',
      'Emergencias': '🚨',
      'Comunicación': '📱',
      'Otros': '📝'
    }
    return icons[category] || '📝'
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Comida': '#F59E0B',
      'Transporte': '#3B82F6',
      'Estadía': '#10B981',
      'Actividades': '#8B5CF6',
      'Compras': '#EF4444',
      'Emergencias': '#DC2626',
      'Comunicación': '#06B6D4',
      'Otros': '#6B7280'
    }
    return colors[category] || '#6B7280'
  }

  if (!tripId) {
    return (
      <div className="glass-card" style={{ padding: 12 }}>
        <p className="muted">Los gastos están disponibles solo en chats de viajes</p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontWeight: 700, color: '#60a5fa' }}>💰 Gastos del Viaje</h4>
        <Button
          variant="secondary"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ height: 32, padding: '0 12px' }}
        >
          {showAddForm ? 'Cancelar' : 'Agregar Gasto'}
        </Button>
      </div>

      {showAddForm && (
        <div className="glass-card" style={{ padding: 12, marginBottom: 12, background: 'rgba(255,255,255,0.05)' }}>
          <h5 style={{ fontWeight: 600, marginBottom: 8 }}>Nuevo Gasto</h5>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Descripción</label>
              <Input
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Ej: Cena en restaurante"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Monto</label>
                <Input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Categoría</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddExpense}>
                Agregar Gasto
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Cargando gastos...</p>
      ) : expenses.length === 0 ? (
        <p className="muted">No hay gastos registrados aún</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflow: 'auto' }}>
          {expenses.map((expense) => (
            <div key={expense.id} className="glass-card" style={{ padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{getCategoryIcon(expense.category)}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{expense.description}</span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: getCategoryColor(expense.category),
                        color: 'white'
                      }}
                    >
                      {expense.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Pagado por: {userNames[expense.payer_id] || 'Usuario'} • {new Date(expense.expense_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#22c55e' }}>
                  {formatAmount(expense.amount, expense.currency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ExpenseStats tripId={tripId} userNames={userNames} />
    </div>
  )
}
