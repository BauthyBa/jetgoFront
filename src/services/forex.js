// Servicio de tasas de cambio usando UnitRateAPI
const API_KEY = '822vkTToc7pE4UFRPe3hWNBLMtOh83FgT4EMOuWReSYw1ovNEBN1bTvfJ2zCeBis'
const ENDPOINT = 'https://api.unitrateapi.com/v1/latest'
const CACHE_KEY = 'unitrate_rates_cache'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas

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
  const rates = json?.rates || json?.data?.rates || {}
  if (!rates[base]) rates[base] = 1
  return rates
}

export async function fetchRates(base = 'USD') {
  // Intentar cache primero
  const cached = loadCache(base)
  if (cached) return cached

  const url = `${ENDPOINT}?base=${encodeURIComponent(base)}&apikey=${encodeURIComponent(API_KEY)}`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`UnitRateAPI devolvió ${resp.status}`)
  }
  const json = await resp.json()
  const rates = normalizeRates(json, base)
  saveCache(base, rates)
  return rates
}
