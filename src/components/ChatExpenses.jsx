import { useState, useEffect } from 'react'
import { getTripExpensesByTrip, createTripExpense, getExpenseCategories, updateTripExpense } from '@/services/expenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ExpenseStats from './ExpenseStats'
import { fetchRates } from '@/services/forex'
import { settleDebts } from '@/services/expenses'
import { supabase } from '@/services/supabase'
import { api } from '@/services/api'
import { useMemo } from 'react'

export default function ChatExpenses({ tripId, roomId, userId, userNames = {} }) {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [rates, setRates] = useState({ USD: 1 }) // Se actualiza con CurrencyAPI
  const [updatingRates, setUpdatingRates] = useState(false)
  const [ratesTimestamp, setRatesTimestamp] = useState(null)
  const [participantMap, setParticipantMap] = useState({})
  const [tripCreatorId, setTripCreatorId] = useState(null)
  const isCreator = tripCreatorId && userId && String(tripCreatorId) === String(userId)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    setNewExpense((prev) => ({ ...prev, currency: baseCurrency || 'USD' }))
  }, [baseCurrency])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    currency: baseCurrency || 'USD',
    expense_date: '',
  })

  // Cargar gastos del viaje
  useEffect(() => {
    setExpenses([])
    if (tripId) {
      loadExpenses()
      loadCategories()
      detectTripCurrency()
      loadParticipants()
    } else {
      setCategories([])
    }
  }, [tripId, roomId])

  const loadParticipants = async () => {
    if (!tripId && !roomId) return
    // 1) Intentar backend (chat-members) si tenemos roomId
    if (roomId) {
      try {
        const { data } = await api.get('/chat-members/', { params: { room_id: roomId } })
        const members = data?.members || []
        if (Array.isArray(members) && members.length > 0) {
          const map = {}
          members.forEach((m) => {
            const uid = m.user_id || m.userid
            if (!uid) return
            const full = m.name || [m.nombre, m.apellido].filter(Boolean).join(' ').trim()
            if (full) map[uid] = full
          })
          if (Object.keys(map).length > 0) {
            setParticipantMap(map)
            return
          }
        }
      } catch (e) {
        console.warn('Fallback a supabase para participantes, API chat-members falló:', e)
      }
    }
    // 2) Supabase trip_members
    try {
      let rows = []
      const { data } = await supabase
        .from('trip_members')
        .select('user_id, User:User!trip_members_user_id_fkey(userid,nombre,apellido)')
        .eq('trip_id', tripId)
      rows = data || []
      // Fallback a chat_members si sigue vacío
      if ((!rows || rows.length === 0) && roomId) {
        try {
          const { data: cm } = await supabase
            .from('chat_members')
            .select('user_id, User:User!chat_members_user_id_fkey(userid,nombre,apellido)')
            .eq('room_id', roomId)
          rows = cm || []
        } catch {}
      }
      const map = {}
      ;(rows || []).forEach((row) => {
        const u = row.User || {}
        const uid = row.user_id || u.userid
        if (!uid) return
        const full = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
        if (full) map[uid] = full
      })
      setParticipantMap(map)
    } catch (e) {
      console.warn('No se pudieron cargar participantes del viaje:', e)
    }
  }

  const COUNTRY_CURRENCY = {
    AR: 'ARS',
    ARGENTINA: 'ARS',
    BR: 'BRL',
    BRAZIL: 'BRL',
    MX: 'MXN',
    MEXICO: 'MXN',
    ES: 'EUR',
    SPAIN: 'EUR',
    EU: 'EUR',
    US: 'USD',
    USA: 'USD',
    CL: 'CLP',
    CHILE: 'CLP',
    UY: 'UYU',
    URUGUAY: 'UYU',
    PY: 'PYG',
    PARAGUAY: 'PYG',
    PE: 'PEN',
    PERU: 'PEN',
    BO: 'BOB',
    BOLIVIA: 'BOB',
    CO: 'COP',
    COLOMBIA: 'COP',
  }

  const detectTripCurrency = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('country,currency,destination,creator_id')
        .eq('id', tripId)
        .limit(1)
      if (error) throw error
      const trip = (data || [])[0]
      if (trip) {
        const explicit = trip.currency
        const country = (trip.country || trip.destination || '').toString().toUpperCase()
        const countryCode = country.slice(0, 2)
        const mapped = COUNTRY_CURRENCY[country] || COUNTRY_CURRENCY[countryCode]
        const chosen = explicit || mapped || 'USD'
        setBaseCurrency(chosen)
        setTripCreatorId(trip.creator_id || null)
      }
    } catch (e) {
      console.warn('No se pudo detectar moneda del viaje, usando USD:', e)
      setBaseCurrency('USD')
    }
  }

  useEffect(() => {
    if (!baseCurrency) return
    const update = async () => {
      try {
        setUpdatingRates(true)
        const latest = await fetchRates(baseCurrency)
        if (!latest || typeof latest !== 'object') throw new Error('Sin tasas')
        const merged = { ...latest, [baseCurrency]: 1 }
        setRates(merged)
        setRatesTimestamp(new Date().toISOString())
      } catch (e) {
        console.error('No se pudieron actualizar tasas desde CurrencyAPI:', e)
        alert('No se pudieron obtener las tasas de cambio actualizadas. Intenta de nuevo.')
      } finally {
        setUpdatingRates(false)
      }
    }
    update()
  }, [baseCurrency])

  const handleCurrencyChange = async (newCurrency) => {
    if (!newCurrency || newCurrency === baseCurrency) return
    try {
      setUpdatingRates(true)
      const latest = await fetchRates(newCurrency)
      if (!latest || typeof latest !== 'object') throw new Error('Sin tasas')
      const merged = { ...latest, [newCurrency]: 1 }
      setRates(merged)
      setRatesTimestamp(new Date().toISOString())

      const convertedExpenses = []
      for (const exp of expenses) {
        const from = exp.currency || newCurrency
        if (from === newCurrency) {
          convertedExpenses.push({ ...exp, currency: newCurrency })
          continue
        }
        const rate = merged[from]
        if (!rate) throw new Error(`Sin tasa para ${from}`)
        const rawAmount = Number(exp.amount || 0)
        const newAmount = Number((rawAmount / rate).toFixed(2))
        convertedExpenses.push({ ...exp, amount: newAmount, currency: newCurrency })
        try {
          await updateTripExpense(exp.id, { amount: newAmount, currency: newCurrency })
        } catch (e) {
          console.warn('No se pudo actualizar gasto al convertir moneda', exp.id, e)
        }
      }
      setExpenses(convertedExpenses)
      setBaseCurrency(newCurrency)
      setNewExpense((prev) => ({ ...prev, currency: newCurrency }))
    } catch (e) {
      console.error('Error cambiando moneda del viaje:', e)
      alert('No se pudo cambiar la moneda. Verifica la API de divisas o intenta más tarde.')
    } finally {
      setUpdatingRates(false)
    }
  }

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const { items, raw } = await getTripExpensesByTrip(tripId, 50, 0)
      const filteredByTrip = (items || []).filter((e) => String(e.trip_id) === String(tripId))
      setExpenses(filteredByTrip)
      console.info('[gastos] cargados', { items, raw })
      // Ajustar moneda base según el primer gasto
      if (items && items.length > 0) {
        const firstCurrency = items[0].currency || 'USD'
        setBaseCurrency(firstCurrency)
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
      setExpenses([])
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
        currency: baseCurrency || newExpense.currency,
        expense_date: newExpense.expense_date || undefined,
      }

      const resp = await createTripExpense(expenseData)
      if (resp?.ok === false && resp?.error) {
        alert(resp.error)
        return
      }
      setNewExpense({ description: '', amount: '', category: '', currency: baseCurrency || 'USD' })
      setShowAddForm(false)
      loadExpenses() // Recargar gastos
    } catch (error) {
      console.error('Error creating expense:', error)
      const msg = error?.response?.data?.error || error?.message || 'Error al crear el gasto'
      alert(msg)
    }
  }

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const convertToBase = (amount, currency) => {
    const from = currency || baseCurrency
    if (from === baseCurrency) return amount
    const rate = rates[from]
    if (!rate) return 0
    return amount / rate
  }

  // Construir nombres conocidos a partir de trip_members/chat_members, userNames y gastos
  const mergedNames = { ...participantMap, ...userNames }
  expenses.forEach((e) => {
    const pid = e.payer_id
    if (pid && !mergedNames[pid]) {
      const fromExpense =
        e.payer_full_name ||
        (e.payer ? `${e.payer.nombre || ''} ${e.payer.apellido || ''}`.trim() : '') ||
        e.payer_name
      if (fromExpense) mergedNames[pid] = fromExpense
    }
    if (Array.isArray(e.splits)) {
      e.splits.forEach((s) => {
        const uid = s.user_id
        if (uid && !mergedNames[uid]) {
          const nm = s.user ? `${s.user.nombre || ''} ${s.user.apellido || ''}`.trim() : ''
          if (nm) mergedNames[uid] = nm
        }
      })
    }
  })

  const visibleExpenses = expenses.filter((e) => (e.currency || baseCurrency) === baseCurrency)
  const totalInBase = visibleExpenses.reduce((sum, e) => sum + convertToBase(Number(e.amount || 0), e.currency), 0)
  const mismatchedExpenses = expenses.length - visibleExpenses.length
  const participantIds = new Set(Object.keys(mergedNames || {}))
  visibleExpenses.forEach((e) => {
    if (e.payer_id) participantIds.add(String(e.payer_id))
    if (Array.isArray(e.splits)) {
      e.splits.forEach((s) => {
        if (s.user_id) participantIds.add(String(s.user_id))
      })
    }
  })
  // asegurar incluir al usuario actual
  if (userId) participantIds.add(String(userId))
  const settlements = settleDebts(visibleExpenses, baseCurrency, Array.from(participantIds))
  const currencyOptions = Array.from(
    new Set([
      baseCurrency,
      ...Object.keys(rates || {}),
      ...expenses.map((e) => e.currency).filter(Boolean),
    ]),
  )
    .filter(Boolean)
    .sort()

  if (!tripId) {
    return (
      <div className="glass-card p-4">
        <p className="text-slate-400 text-sm">Los gastos están disponibles solo en chats de viajes</p>
      </div>
    )
  }

  const expensesListClass = isMobile ? 'max-h-none' : 'max-h-80'

  return (
    <div className="glass-card p-3 md:p-6 space-y-4 md:space-y-6 w-full min-h-[60vh] h-full overflow-y-auto pb-28 md:pb-0 w-full max-w-full overflow-x-auto">
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between gap-4'}`}>
        <div>
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-emerald-300">Gastos compartidos</p>
          <h4 className="text-xl md:text-2xl font-semibold text-white">Viaje</h4>
        </div>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-4'}`}>
          <div className={`${isMobile ? 'flex items-center gap-2' : 'text-right'}`}>
            <p className="text-xs text-slate-400 mb-1">Divisa del viaje</p>
            {isCreator ? (
              <select
                value={baseCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className={`rounded-lg bg-slate-800 border border-slate-700 text-white ${
                  isMobile ? 'px-2 py-1.5 text-xs max-w-[110px]' : 'px-3 py-2 text-sm w-full'
                }`}
                disabled={updatingRates}
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm">
                {baseCurrency}
              </div>
            )}
          </div>
          <div className="bg-slate-800/60 px-3 py-2 rounded-xl text-right">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-emerald-300 font-semibold text-lg">
              {formatAmount(totalInBase, baseCurrency || 'USD')}
            </p>
            <p className="text-[12px] text-slate-500">
              Gastos: {expenses.length} • Moneda del viaje: {baseCurrency}
            </p>
            {updatingRates && (
              <p className="text-[11px] text-slate-400">Actualizando tasas…</p>
            )}
            {!updatingRates && ratesTimestamp && (
              <p className="text-[11px] text-slate-400">Tasas: {new Date(ratesTimestamp).toLocaleTimeString()}</p>
            )}
          </div>
          <Button
            variant={showAddForm ? 'secondary' : 'default'}
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-11 px-4 text-base"
          >
            {showAddForm ? 'Cancelar' : 'Agregar gasto'}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="glass-card bg-slate-900/60 border border-slate-800 p-5 space-y-4">
          <h5 className="text-white font-semibold text-lg">Nuevo gasto</h5>
          <div className="grid gap-4">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Descripción</label>
              <Input
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Ej: Cena en restaurante"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-base"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Monto</label>
                <Input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">Categoría</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-base"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.name} value={cat.name || cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name || cat.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Fecha del gasto</label>
                <Input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-base"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">Divisa (fijada por el viaje)</label>
                <Input
                  readOnly
                  value={newExpense.currency}
                  className="bg-slate-800 border border-slate-700 text-white text-base"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-base">Cancelar</Button>
              <Button onClick={handleAddExpense} className="px-4 py-2 text-base">Agregar gasto</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Cargando gastos...</p>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
          No hay gastos registrados aún
        </div>
      ) : (
        <div className={`grid gap-3 ${expensesListClass} overflow-auto pr-1 w-full`}>
          {visibleExpenses.map((expense) => {
            const pid = expense.payer_id ? String(expense.payer_id) : ''
            const payerLabel =
              mergedNames[pid] ||
              expense.payer_full_name ||
              (expense.payer ? `${expense.payer.nombre || ''} ${expense.payer.apellido || ''}`.trim() : '') ||
              expense.payer_name ||
              pid ||
              'Usuario'
            const dateLabel = expense.expense_date
              ? new Date(expense.expense_date).toLocaleDateString('es-ES')
              : ''
            return (
              <div
                key={expense.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{expense.description}</span>
                      {expense.category && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                          {expense.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Pagado por {payerLabel}{dateLabel ? ` • ${dateLabel}` : ''}
                    </p>
                  </div>
                  <div className="text-emerald-300 font-semibold">
                    {formatAmount(expense.amount, expense.currency)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mismatchedExpenses > 0 && (
        <div className="text-[11px] text-amber-300">
          {mismatchedExpenses} gasto(s) ignorado(s) por estar en otra divisa.
        </div>
      )}

      <div className="rounded-xl border border-emerald-900/60 bg-emerald-900/20 p-4 space-y-2">
        <h5 className="text-sm font-semibold text-emerald-200">Liquidación</h5>
        <p className="text-[12px] text-emerald-100/80">
          Pagos sugeridos para equilibrar aportes en {baseCurrency}.
        </p>
        {settlements.length === 0 ? (
          <p className="text-[12px] text-emerald-100/70">Todos están equilibrados.</p>
        ) : (
          <div className="space-y-2">
            {settlements.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-emerald-950/40 border border-emerald-800/50 px-3 py-2"
              >
                <span className="text-sm text-white">
                  {mergedNames[s.from] || 'Usuario'} → {mergedNames[s.to] || 'Usuario'}
                </span>
                <span className="text-emerald-300 font-semibold">
                  {formatAmount(s.amount, s.currency || baseCurrency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseStats
        tripId={tripId}
        userNames={mergedNames}
        baseCurrency={baseCurrency}
        rates={rates}
        expensesOverride={visibleExpenses}
        settlements={settlements}
        compact={isMobile}
      />
    </div>
  )
}
