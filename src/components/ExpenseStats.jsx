import { useState, useEffect } from 'react'
import { getTripExpensesByTrip } from '@/services/expenses'

export default function ExpenseStats({ tripId, userNames = {} }) {
  const [stats, setStats] = useState({
    totalExpenses: 0,
    averageExpense: 0,
    categoryBreakdown: {},
    currencyBreakdown: {},
    expenseCount: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tripId) {
      loadStats()
    }
  }, [tripId])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getTripExpensesByTrip(tripId, 100, 0) // Cargar más gastos para estadísticas
      const expenses = data?.expenses || []
      
      if (expenses.length === 0) {
        setStats({
          totalExpenses: 0,
          averageExpense: 0,
          categoryBreakdown: {},
          currencyBreakdown: {},
          expenseCount: 0
        })
        return
      }

      const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
      const averageExpense = totalExpenses / expenses.length

      // Desglose por categoría
      const categoryBreakdown = {}
      expenses.forEach(expense => {
        const category = expense.category || 'Otros'
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { count: 0, total: 0 }
        }
        categoryBreakdown[category].count++
        categoryBreakdown[category].total += parseFloat(expense.amount || 0)
      })

      // Desglose por moneda
      const currencyBreakdown = {}
      expenses.forEach(expense => {
        const currency = expense.currency || 'USD'
        if (!currencyBreakdown[currency]) {
          currencyBreakdown[currency] = { count: 0, total: 0 }
        }
        currencyBreakdown[currency].count++
        currencyBreakdown[currency].total += parseFloat(expense.amount || 0)
      })

      setStats({
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        averageExpense: Math.round(averageExpense * 100) / 100,
        categoryBreakdown,
        currencyBreakdown,
        expenseCount: expenses.length
      })
    } catch (error) {
      console.error('Error loading expense stats:', error)
    } finally {
      setLoading(false)
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
    return null
  }

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 12 }}>
        <p className="muted">Cargando estadísticas...</p>
      </div>
    )
  }

  if (stats.expenseCount === 0) {
    return null
  }

  return (
    <div className="glass-card" style={{ padding: 12, marginTop: 12 }}>
      <h5 style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 12 }}>📊 Estadísticas</h5>
      
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Total gastado:</span>
          <span style={{ fontWeight: 700, color: '#22c55e' }}>
            {formatAmount(stats.totalExpenses, 'USD')}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Promedio por gasto:</span>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>
            {formatAmount(stats.averageExpense, 'USD')}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Cantidad de gastos:</span>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>
            {stats.expenseCount}
          </span>
        </div>
      </div>

      {Object.keys(stats.categoryBreakdown).length > 0 && (
        <div>
          <h6 style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>Por categoría:</h6>
          <div style={{ display: 'grid', gap: 4 }}>
            {Object.entries(stats.categoryBreakdown)
              .sort(([,a], [,b]) => b.total - a.total)
              .map(([category, data]) => (
                <div key={category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{getCategoryIcon(category)}</span>
                    <span>{category}</span>
                    <span style={{ color: '#94a3b8' }}>({data.count})</span>
                  </div>
                  <span style={{ fontWeight: 600, color: getCategoryColor(category) }}>
                    {formatAmount(data.total, 'USD')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
