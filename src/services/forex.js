// Servicio de tasas de cambio usando currencyapi.net
const API_KEY = '19bc2335d6d28939c989f78ed905f526da30'
const ENDPOINT = 'https://currencyapi.net/api/v1/rates'
const CACHE_KEY = 'currencyapi_rates_cache'
const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3 horas

function loadCache(base) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.base !== base) return null
    if (Date.now() - (parsed.ts || 0) > CACHE_TTL_MS) return null
    return parsed.rates || null
  } catch {
    return null
  }
}

function saveCache(base, rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ base, rates, ts: Date.now() }))
  } catch {
    // ignore cache errors
  }
}

function normalizeRates(json, base) {
  const data = json?.rates || {}
  const rates = { ...data }
  rates[base] = 1
  return rates
}

export async function fetchRates(base = 'USD') {
  // Intentar cache primero
  const cached = loadCache(base)
  if (cached) return cached

  // currencyapi.net devuelve tasas base USD; derivamos otras bases manualmente
  const url = `${ENDPOINT}?key=${encodeURIComponent(API_KEY)}`
  const resp = await fetch(url)
  if (!resp.ok) {
    const reason = await resp.text().catch(() => '')
    throw new Error(`CurrencyAPI devolvió ${resp.status}${reason ? `: ${reason}` : ''}`)
  }
  const json = await resp.json()
  const usdRates = normalizeRates(json, 'USD')
  let rates = usdRates
  if (base && base !== 'USD') {
    const pivot = usdRates[base]
    if (!pivot || Number(pivot) === 0) {
      throw new Error(`Sin tasa base USD para ${base}`)
    }
    const derived = {}
    Object.keys(usdRates).forEach((code) => {
      if (code === base) return
      derived[code] = usdRates[code] / pivot
    })
    rates = { ...derived, [base]: 1 }
  }
  saveCache(base, rates)
  return rates
}
