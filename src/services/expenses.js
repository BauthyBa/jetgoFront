import { api } from './api'

/**
 * Servicios para manejo de gastos de viajes
 */

// Crear un nuevo gasto
export async function createTripExpense(expenseData) {
  try {
    const response = await api.post('/trip-expenses/', expenseData)
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data: data?.expense ? [data.expense] : data?.expenses || [], expense: data?.expense }
  } catch (error) {
    console.error('Error creating trip expense:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Obtener lista de gastos con filtros
export async function getTripExpenses(filters = {}) {
  try {
    const params = new URLSearchParams()
    
    if (filters.trip_id) params.append('trip_id', filters.trip_id)
    if (filters.user_id) params.append('user_id', filters.user_id)
    if (filters.category) params.append('category', filters.category)
    if (filters.status) params.append('status', filters.status)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)

    const response = await api.get(`/trip-expenses/list/?${params.toString()}`)
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data: data?.expenses || [] }
  } catch (error) {
    console.error('Error fetching trip expenses:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Obtener detalles de un gasto específico
export async function getTripExpenseDetail(expenseId) {
  try {
    const response = await api.get(`/trip-expenses/${expenseId}/`)
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data }
  } catch (error) {
    console.error('Error fetching trip expense detail:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Actualizar un gasto existente
export async function updateTripExpense(expenseId, updateData) {
  try {
    const response = await api.put(`/trip-expenses/${expenseId}/update/`, updateData)
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data: data?.expense || data }
  } catch (error) {
    console.error('Error updating trip expense:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Eliminar un gasto
export async function deleteTripExpense(expenseId, userId) {
  try {
    const response = await api.delete(`/trip-expenses/${expenseId}/delete/`, {
      data: { user_id: userId }
    })
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true }
  } catch (error) {
    console.error('Error deleting trip expense:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Obtener resumen de gastos de un viaje
export async function getTripExpenseSummary(tripId, userId = null) {
  try {
    const params = new URLSearchParams()
    params.append('trip_id', tripId)
    if (userId) params.append('user_id', userId)

    const response = await api.get(`/trip-expenses/summary/?${params.toString()}`)
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data }
  } catch (error) {
    console.error('Error fetching trip expense summary:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Obtener categorías de gastos disponibles
export async function getExpenseCategories() {
  try {
    const response = await api.get('/trip-expenses/categories/')
    const data = response?.data
    if (data && typeof data.ok === 'boolean') return data
    return { ok: true, data: data?.categories || [] }
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return { ok: false, error: error?.response?.data?.error || error.message }
  }
}

// Obtener gastos de un viaje específico
export async function getTripExpensesByTrip(tripId, limit = 20, offset = 0) {
  return getTripExpenses({ trip_id: tripId, limit, offset })
}

// Obtener gastos de un usuario específico
export async function getTripExpensesByUser(userId, tripId = null, limit = 20, offset = 0) {
  const filters = { user_id: userId, limit, offset }
  if (tripId) filters.trip_id = tripId
  return getTripExpenses(filters)
}

// Calcular estadísticas de gastos
export function calculateExpenseStats(expenses) {
  if (!expenses || expenses.length === 0) {
    return {
      totalExpenses: 0,
      averageExpense: 0,
      categoryBreakdown: {},
      currencyBreakdown: {},
      expenseCount: 0
    }
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

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    averageExpense: Math.round(averageExpense * 100) / 100,
    categoryBreakdown,
    currencyBreakdown,
    expenseCount: expenses.length
  }
}

// Formatear fecha para mostrar
export function formatExpenseDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formatear monto para mostrar
export function formatExpenseAmount(amount, currency = 'USD') {
  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  })
  return formatter.format(amount)
}

// Obtener color de categoría
export function getCategoryColor(category) {
  const colors = {
    'Transporte': '#3B82F6',
    'Alojamiento': '#10B981',
    'Comida': '#F59E0B',
    'Actividades': '#8B5CF6',
    'Compras': '#EF4444',
    'Emergencias': '#DC2626',
    'Comunicación': '#06B6D4',
    'Otros': '#6B7280'
  }
  return colors[category] || '#6B7280'
}

// Obtener icono de categoría
export function getCategoryIcon(category) {
  const icons = {
    'Transporte': '🚗',
    'Alojamiento': '🏨',
    'Comida': '🍽️',
    'Actividades': '🎯',
    'Compras': '🛍️',
    'Emergencias': '🚨',
    'Comunicación': '📱',
    'Otros': '📝'
  }
  return icons[category] || '📝'
}

// Validar datos de gasto antes de enviar
export function validateExpenseData(data) {
  const errors = []
  
  if (!data.trip_id) errors.push('ID del viaje es requerido')
  if (!data.payer_id) errors.push('ID del pagador es requerido')
  if (!data.amount || data.amount <= 0) errors.push('El monto debe ser mayor a 0')
  if (!data.description || !data.description.trim()) errors.push('La descripción es requerida')
  if (!data.category) errors.push('La categoría es requerida')
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Calcular balance de usuario
export function calculateUserBalance(splits, userId) {
  const userSplit = splits.find(split => split.user_id === userId)
  if (!userSplit) {
    return { totalOwed: 0, totalPaid: 0, balance: 0 }
  }
  
  const totalOwed = parseFloat(userSplit.amount_owed || 0)
  const totalPaid = parseFloat(userSplit.amount_paid || 0)
  const balance = totalOwed - totalPaid
  
  return {
    totalOwed,
    totalPaid,
    balance: Math.round(balance * 100) / 100
  }
}

// Obtener resumen de deudas entre usuarios
export function getDebtsSummary(splits) {
  const debts = []
  
  splits.forEach(split => {
    if (split.amount_owed > split.amount_paid) {
      debts.push({
        userId: split.user_id,
        userName: split.user?.nombre || 'Usuario',
        amount: split.amount_owed - split.amount_paid,
        currency: 'USD' // Asumir USD por ahora
      })
    }
  })
  
  return debts.sort((a, b) => b.amount - a.amount)
}
