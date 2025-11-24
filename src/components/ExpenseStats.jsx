import { useState, useEffect } from 'react'
import { getTripExpensesByTrip } from '@/services/expenses'

const PALETTE = ['#22c55e', '#60a5fa', '#fbbf24', '#f472b6', '#a855f7', '#38bdf8', '#f97316', '#c084fc']

export default function ExpenseStats({ tripId, userNames = {}, baseCurrency = 'USD', rates = {}, expensesOverride = null, settlements = [], compact = false }) {
  const [stats, setStats] = useState({
    totalExpenses: 0,
    averageExpense: 0,
    categoryBreakdown: {},
    currencyBreakdown: {},
    payerBreakdown: {},
    expenseCount: 0,
    lastExpenseDate: null,
    dailyTotals: {},
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tripId || expensesOverride) {
      loadStats()
    }
  }, [tripId, baseCurrency, expensesOverride])

  const loadStats = async () => {
    try {
      setLoading(true)
      let expenses = []
      if (expensesOverride && Array.isArray(expensesOverride)) {
        expenses = expensesOverride
      } else {
        const { items } = await getTripExpensesByTrip(tripId, 100, 0) // Cargar más gastos para estadísticas
        expenses = Array.isArray(items) ? items : []
      }
      
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

      const filtered = expenses.filter((e) => (e.currency || baseCurrency) === baseCurrency)
      const totalExpenses = filtered.reduce((sum, expense) => sum + convertToBase(parseFloat(expense.amount || 0), expense.currency), 0)
      const averageExpense = filtered.length ? totalExpenses / filtered.length : 0
      const lastExpenseDate = expenses
        .map((e) => new Date(e.expense_date || e.created_at || e.updated_at || Date.now()))
        .sort((a, b) => b.getTime() - a.getTime())[0]
      const dailyTotals = {}
      filtered.forEach((expense) => {
        const raw = expense.expense_date || expense.created_at || expense.updated_at
        const dateObj = raw ? new Date(raw) : new Date()
        const dayKey = dateObj.toISOString().slice(0, 10)
        const amt = parseFloat(expense.amount || 0)
        dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + convertToBase(amt, expense.currency)
      })

      // Desglose por categoría
      const categoryBreakdown = {}
      filtered.forEach(expense => {
        const category = expense.category || 'Otros'
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { count: 0, total: 0 }
        }
        categoryBreakdown[category].count++
        categoryBreakdown[category].total += convertToBase(parseFloat(expense.amount || 0), expense.currency)
      })

      // Desglose por moneda
      const currencyBreakdown = {}
      filtered.forEach(expense => {
        const currency = expense.currency || 'USD'
        if (!currencyBreakdown[currency]) {
          currencyBreakdown[currency] = { count: 0, total: 0 }
        }
        currencyBreakdown[currency].count++
        currencyBreakdown[currency].total += parseFloat(expense.amount || 0)
      })

      // Desglose por pagador
      const payerBreakdown = {}
      filtered.forEach(expense => {
        const payer = expense.payer_id || 'desconocido'
        if (!payerBreakdown[payer]) {
          payerBreakdown[payer] = { count: 0, total: 0 }
        }
        payerBreakdown[payer].count++
        payerBreakdown[payer].total += convertToBase(parseFloat(expense.amount || 0), expense.currency)
      })

      setStats({
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        averageExpense: Math.round(averageExpense * 100) / 100,
        categoryBreakdown,
        currencyBreakdown,
        payerBreakdown,
        expenseCount: expenses.length,
        lastExpenseDate: lastExpenseDate ? lastExpenseDate.toISOString() : null,
        dailyTotals,
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

  const formatPercent = (value, total) => {
    if (!total || total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  const getUserColor = (userId, index) => {
    if (!userId) return PALETTE[index % PALETTE.length]
    const key = Array.from(String(userId)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return PALETTE[key % PALETTE.length]
  }

  const convertToBase = (amount, currency) => {
    const from = currency || 'USD'
    const rateFrom = rates[from] ?? 1
    const rateTo = rates[baseCurrency] ?? 1
    if (!rateFrom || !rateTo) return amount
    return (amount / rateFrom) * rateTo
  }

  const dailyEntries = Object.entries(stats.dailyTotals || {}).sort(([a], [b]) => new Date(a) - new Date(b))
  const maxDaily = dailyEntries.length ? Math.max(...dailyEntries.map(([, v]) => v)) : 0

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

  // Construir donut para pagadores
  const payerEntries = Object.entries(stats.payerBreakdown)
    .sort(([, a], [, b]) => b.total - a.total)
  const total = stats.totalExpenses || 1
  let currentAngle = 0
  const segments = payerEntries.map(([payerId, data], idx) => {
    const degrees = (data.total / total) * 360
    const from = currentAngle
    const to = currentAngle + degrees
    currentAngle = to
    const color = getUserColor(payerId, idx)
    return { payerId, from, to, color, ...data }
  })

  const containerClass = compact
    ? 'glass-card p-4 mt-4 space-y-4 w-full overflow-x-auto'
    : 'glass-card p-4 mt-4 space-y-4 max-h-[420px] overflow-y-auto scrollbar-hide'

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-white flex items-center gap-2">📊 Estadísticas de gastos</h5>
        <div className="text-xs text-slate-400">
          Base: <span className="text-emerald-300 font-semibold">{baseCurrency}</span>
        </div>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-400">Total gastado</p>
          <p className="text-emerald-300 text-xl font-semibold">{formatAmount(stats.totalExpenses, 'USD')}</p>
          <p className="text-[11px] text-slate-500">Gastos: {stats.expenseCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-400">Promedio por gasto</p>
          <p className="text-sky-300 text-xl font-semibold">{formatAmount(stats.averageExpense, 'USD')}</p>
          {stats.lastExpenseDate && (
            <p className="text-[11px] text-slate-500">Último: {new Date(stats.lastExpenseDate).toLocaleString('es-ES')}</p>
          )}
        </div>
      </div>

      {Object.keys(stats.categoryBreakdown).length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h6 className="text-xs text-slate-400 mb-2">Por categoría</h6>
          <div className="space-y-2">
            {Object.entries(stats.categoryBreakdown)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([category, data]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span className="text-white">{category}</span>
                    <span className="text-slate-500 text-xs">
                      ({data.count}) • {formatPercent(data.total, stats.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <div className="h-2 w-20 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (data.total / stats.totalExpenses) * 100)}%`,
                          background: getCategoryColor(category),
                        }}
                      />
                    </div>
                    <span className="text-white font-semibold">
                      {formatAmount(data.total, 'USD')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {Object.keys(stats.payerBreakdown).length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h6 className="text-xs text-slate-400 mb-3">Por persona</h6>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative h-40 w-40 mx-auto lg:mx-0">
              <div
                className="h-40 w-40 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                style={{
                  background: `conic-gradient(${segments
                    .map((s) => `${s.color} ${s.from}deg ${s.to}deg`)
                    .join(',')})`,
                }}
              />
              <div className="absolute inset-6 rounded-full bg-slate-950 flex flex-col items-center justify-center text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">Total</span>
                <span className="text-emerald-300 font-semibold text-sm text-center">
                  {formatAmount(stats.totalExpenses, baseCurrency)}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {payerEntries.map(([payerId, data], idx) => {
                const color = getUserColor(payerId, idx)
                const name = userNames[payerId] || payerId || 'Usuario'
                return (
                  <div key={payerId} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
                        <span className="text-white font-medium">{name}</span>
                        <span className="text-slate-500 text-xs">
                          {data.count} gasto{data.count !== 1 ? 's' : ''} • {formatPercent(data.total, stats.totalExpenses)}
                        </span>
                      </div>
                      <span className="text-emerald-300 font-semibold">{formatAmount(data.total, baseCurrency)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (data.total / stats.totalExpenses) * 100)}%`,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {Object.keys(stats.currencyBreakdown).length > 1 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h6 className="text-xs text-slate-400 mb-2">Por moneda</h6>
          <div className="space-y-1">
            {Object.entries(stats.currencyBreakdown).map(([currency, data]) => (
              <div key={currency} className="flex items-center justify-between text-sm">
                <span className="text-white">{currency} ({data.count})</span>
                <span className="text-sky-300 font-semibold">
                  {formatAmount(data.total, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyEntries.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <h6 className="text-xs text-slate-400 mb-2">Por día</h6>
          <div className="flex items-end gap-3 overflow-x-auto py-2">
            {dailyEntries.map(([day, total]) => {
              const height = maxDaily ? Math.max(12, (total / maxDaily) * 90) : 12
              return (
                <div key={day} className="flex flex-col items-center gap-1 min-w-[42px]">
                  <div className="w-7 rounded-xl bg-slate-800 overflow-hidden shadow-inner">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-emerald-500 to-emerald-300"
                      style={{ height }}
                      title={`${day}: ${formatAmount(total, baseCurrency)}`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 text-center leading-tight">
                    {new Date(day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    {formatAmount(total, baseCurrency)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
