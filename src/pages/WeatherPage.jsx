import { useCallback, useEffect, useMemo, useState } from 'react'

const OPEN_WEATHER_KEY = 'fa32fa4be0cf23249680e2becc0a9bc5'
const DEFAULT_CITY = 'Buenos Aires'

export default function WeatherPage() {
  const [query, setQuery] = useState(DEFAULT_CITY)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [hourlySeries, setHourlySeries] = useState([]) // [{ date: 'YYYY-MM-DD', hours: [{ time: Date, temp: number }] }]
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [dailySeries, setDailySeries] = useState([]) // [{ date, min, max, code, precipSum, precipProbMax, uvMax }]

  const hasWeatherData = useMemo(() => !!weather && Array.isArray(weather.weather) && weather.weather.length > 0, [weather])

  const fetchWeather = useCallback(async ({ city, coords } = {}) => {
    if ((!city || !city.trim()) && !coords) {
      setError('Necesitás indicar una ciudad para consultar el clima.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        appid: OPEN_WEATHER_KEY,
        units: 'metric',
        lang: 'es',
      })

      if (coords) {
        params.set('lat', coords.latitude.toString())
        params.set('lon', coords.longitude.toString())
      } else if (city) {
        params.set('q', city.trim())
      }

      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`)
      if (!response.ok) {
        throw new Error('No pudimos recuperar la información del clima. Probá con otra ciudad.')
      }

      const data = await response.json()
      setWeather(data)
      setLastUpdated(new Date())

      // Fetch extended hourly data (past + next days) from Open-Meteo using coords
      const latitude = coords?.latitude ?? data.coord?.lat
      const longitude = coords?.longitude ?? data.coord?.lon
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          const openMeteoUrl = new URL('https://api.open-meteo.com/v1/forecast')
          openMeteoUrl.searchParams.set('latitude', latitude.toString())
          openMeteoUrl.searchParams.set('longitude', longitude.toString())
          openMeteoUrl.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,precipitation,uv_index,precipitation_probability')
          openMeteoUrl.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,precipitation_probability_max')
          openMeteoUrl.searchParams.set('past_days', '3') // previous 3 days
          openMeteoUrl.searchParams.set('forecast_days', '7') // next 7 days
          openMeteoUrl.searchParams.set('timezone', tz || 'auto')

          const hourlyRes = await fetch(openMeteoUrl.toString())
          if (hourlyRes.ok) {
            const hourlyJson = await hourlyRes.json()
            const times = hourlyJson?.hourly?.time || []
            const temps = hourlyJson?.hourly?.temperature_2m || []
            const humidities = hourlyJson?.hourly?.relative_humidity_2m || []
            const precip = hourlyJson?.hourly?.precipitation || []
            const uv = hourlyJson?.hourly?.uv_index || []
            const precipProb = hourlyJson?.hourly?.precipitation_probability || []

            const byDate = new Map()
            for (let i = 0; i < times.length; i += 1) {
              const iso = times[i]
              const temp = temps[i]
              const dayKey = iso.slice(0, 10) // YYYY-MM-DD
              if (!byDate.has(dayKey)) byDate.set(dayKey, [])
              byDate.get(dayKey).push({
                time: new Date(iso),
                temp,
                humidity: humidities[i],
                precipitation: precip[i],
                uvIndex: uv[i],
                precipProb: precipProb[i],
              })
            }

            const series = Array.from(byDate.entries())
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([date, hours]) => ({ date, hours }))

            setHourlySeries(series)

            // Build daily series (ordered by date asc like hourly)
            const d = hourlyJson?.daily || {}
            const dDates = d?.time || []
            const dailyBuilt = dDates.map((date, i) => ({
              date,
              max: d.temperature_2m_max?.[i] ?? null,
              min: d.temperature_2m_min?.[i] ?? null,
              code: d.weathercode?.[i] ?? null,
              precipSum: d.precipitation_sum?.[i] ?? 0,
              precipProbMax: d.precipitation_probability_max?.[i] ?? null,
              uvMax: d.uv_index_max?.[i] ?? null,
            }))
            setDailySeries(dailyBuilt)

            // Set selected day to today if present, otherwise last in series
            const todayKey = new Date().toISOString().slice(0, 10)
            const todayIndex = series.findIndex((d) => d.date === todayKey)
            setSelectedDateIndex(todayIndex >= 0 ? todayIndex : Math.max(series.length - 1, 0))
          } else {
            // If hourly fails, keep current weather but don't block UI
            console.warn('No se pudo obtener el pronóstico por horas')
            setHourlySeries([])
          }
        } catch (omError) {
          console.warn('Error al obtener datos extendidos:', omError)
          setHourlySeries([])
        }
      }
    } catch (fetchError) {
      console.error(fetchError)
      setWeather(null)
      setError(fetchError.message || 'Ocurrió un error al consultar el clima.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    fetchWeather({ city: query })
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización automática.')
      return
    }

    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather({ coords: position.coords })
      },
      (geoError) => {
        console.error(geoError)
        setLoading(false)
        setError('No pudimos acceder a tu ubicación. Revisá los permisos del navegador.')
      },
      { timeout: 10000 },
    )
  }

  useEffect(() => {
    fetchWeather({ city: DEFAULT_CITY })
  }, [fetchWeather])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-12">
      <header>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Clima en tiempo real</h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Consultá el clima actual en cualquier ciudad y obtené información precisa usando datos de OpenWeatherMap.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:items-center">
          <label htmlFor="city" className="sr-only">
            Ciudad
          </label>
          <input
            id="city"
            type="text"
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Córdoba, AR"
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60 md:flex-none"
            >
              {loading ? 'Buscando...' : 'Buscar clima'}
            </button>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={loading}
              className="hidden items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-70 md:flex"
            >
              Usar mi ubicación
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-70 md:hidden"
        >
          Usar mi ubicación
        </button>
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
      </section>

      {hasWeatherData && (
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Clima actual</p>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                {weather.name}, {weather.sys?.country}
              </h2>
              <p className="mt-1 text-lg capitalize text-slate-300">{weather.weather?.[0]?.description}</p>
              {lastUpdated && (
                <p className="mt-2 text-xs text-slate-500">
                  Actualizado {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {weather.weather?.[0]?.icon && (
                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}
                  alt={weather.weather[0].description}
                  className="h-24 w-24 object-contain"
                />
              )}
              <div className="text-5xl font-bold text-emerald-400 sm:text-6xl">{Math.round(weather.main?.temp)}°C</div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white/5 p-4">
              <dt className="text-slate-400">Sensación térmica</dt>
              <dd className="mt-1 text-xl font-semibold text-white">{Math.round(weather.main?.feels_like)}°C</dd>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <dt className="text-slate-400">Humedad</dt>
              <dd className="mt-1 text-xl font-semibold text-white">{weather.main?.humidity}%</dd>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <dt className="text-slate-400">Viento</dt>
              <dd className="mt-1 text-xl font-semibold text-white">{Math.round((weather.wind?.speed || 0) * 3.6)} km/h</dd>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <dt className="text-slate-400">Presión</dt>
              <dd className="mt-1 text-xl font-semibold text-white">{weather.main?.pressure} hPa</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Daily forecast scroller (como en la imagen) */}
      {dailySeries.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg">
          <div className="mb-3 grid grid-cols-8 text-center text-xs text-slate-400 sm:text-[11px]">
            <div>9 a.m.</div>
            <div>12 p.m.</div>
            <div>3 p.m.</div>
            <div>6 p.m.</div>
            <div>9 p.m.</div>
            <div>12 a.m.</div>
            <div>3 a.m.</div>
            <div>6 a.m.</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dailySeries.map((d, idx) => {
              const dateObj = new Date(d.date + 'T00:00:00')
              const label = dateObj.toLocaleDateString(undefined, { weekday: 'short' })
              const active = idx === selectedDateIndex
              const precipDot = (d.precipProbMax ?? 0) >= 50
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDateIndex(idx)}
                  className={
                    'flex min-w-[84px] flex-col items-center rounded-xl border px-3 py-3 transition ' +
                    (active ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 hover:border-emerald-400')
                  }
                >
                  <div className="mb-1 text-slate-300">{label}</div>
                  <div className="text-2xl">{getWeatherEmoji(d.code)}</div>
                  <div className="mt-2 text-xs text-slate-300">
                    <span className="font-semibold text-white">{Math.round(d.max)}°</span>
                    <span className="ml-1 text-slate-400">· {Math.round(d.min)}°</span>
                  </div>
                  {precipDot && <div className="mt-2 h-2 w-2 rounded-full bg-sky-500" />}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {hourlySeries.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Evolución de temperatura</p>
              <h3 className="text-xl font-semibold text-white">Últimos días y próximos días</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-emerald-400 hover:text-white disabled:opacity-50"
                onClick={() => setSelectedDateIndex((i) => Math.max(0, i - 1))}
                disabled={selectedDateIndex <= 0}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-emerald-400 hover:text-white disabled:opacity-50"
                onClick={() => setSelectedDateIndex((i) => Math.min(hourlySeries.length - 1, i + 1))}
                disabled={selectedDateIndex >= hourlySeries.length - 1}
              >
                Siguiente →
              </button>
            </div>
          </header>

          {/* Day pills */}
          <div className="mt-4 flex w-full snap-x gap-2 overflow-x-auto pb-2">
            {hourlySeries.map((d, idx) => {
              const dateObj = new Date(d.date + 'T00:00:00')
              const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' })
              const isActive = idx === selectedDateIndex
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDateIndex(idx)}
                  className={
                    'snap-start rounded-xl border px-3 py-2 text-sm transition ' +
                    (isActive
                      ? 'border-emerald-400 bg-emerald-500/10 text-white'
                      : 'border-white/10 bg-slate-900/50 text-slate-200 hover:border-emerald-400 hover:text-white')
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Temperature chart */}
          <div className="mt-6">
            <TemperatureChart hours={hourlySeries[selectedDateIndex]?.hours || []} />
          </div>

          {/* Extra metrics for selected day */}
          <SelectedDayExtras
            dayDate={hourlySeries[selectedDateIndex]?.date}
            hours={hourlySeries[selectedDateIndex]?.hours || []}
            daily={dailySeries.find((d) => d.date === hourlySeries[selectedDateIndex]?.date)}
          />
        </section>
      )}

      {!loading && !hasWeatherData && !error && (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          Elegí una ciudad para comenzar a ver los datos del clima.
        </p>
      )}
    </div>
  )
}

function TemperatureChart({ hours }) {
  if (!Array.isArray(hours) || hours.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos horarios para este día.</p>
  }

  // Normalize to 24 points (or whatever available for the selected day)
  const points = hours
    .slice()
    .sort((a, b) => a.time - b.time)

  const temps = points.map((p) => p.temp)
  const minT = Math.min(...temps)
  const maxT = Math.max(...temps)
  const range = Math.max(1, maxT - minT)

  const width = 800
  const height = 220
  const paddingX = 28
  const paddingY = 24
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2

  const toX = (idx) => paddingX + (idx / Math.max(1, points.length - 1)) * innerW
  const toY = (t) => paddingY + innerH - ((t - minT) / range) * innerH

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p.temp).toFixed(2)}`)
    .join(' ')

  const xLabels = [0, 6, 12, 18, 23]

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        {/* Axes */}
        <g>
          <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.15)" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.15)" />
        </g>

        {/* Grid + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = paddingY + innerH * (1 - f)
          const t = (minT + (maxT - minT) * f).toFixed(0)
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={paddingX - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="rgba(226,232,240,0.8)">{t}°C</text>
            </g>
          )
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#34d399" strokeWidth="2.5" />

        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.temp)} r="2.5" fill="#34d399" />
        ))}

        {/* X labels */}
        {xLabels.map((h) => {
          const idx = points.findIndex((p) => p.time.getHours() >= h)
          const x = idx >= 0 ? toX(idx) : toX(points.length - 1)
          return (
            <text key={h} x={x} y={height - paddingY + 14} textAnchor="middle" fontSize="10" fill="rgba(226,232,240,0.8)">{`${h.toString().padStart(2, '0')}:00`}</text>
          )
        })}
      </svg>
    </div>
  )
}

function SelectedDayExtras({ dayDate, hours, daily }) {
  if (!dayDate || !Array.isArray(hours)) return null

  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) / arr.length : 0)
  const avgHumidity = Math.round(avg(hours.map((h) => h.humidity ?? 0)))
  const precipSum = daily?.precipSum ?? hours.reduce((s, h) => s + (h.precipitation ?? 0), 0)
  const uvMax = Number.isFinite(daily?.uvMax) ? daily.uvMax : Math.max(...hours.map((h) => h.uvIndex || 0))

  return (
    <dl className="mt-6 grid grid-cols-1 gap-4 text-sm text-slate-200 sm:grid-cols-3">
      <div className="rounded-xl bg-white/5 p-4">
        <dt className="text-slate-400">Precipitación</dt>
        <dd className="mt-1 text-xl font-semibold text-white">{precipSum.toFixed(1)} mm</dd>
      </div>
      <div className="rounded-xl bg-white/5 p-4">
        <dt className="text-slate-400">Humedad promedio</dt>
        <dd className="mt-1 text-xl font-semibold text-white">{avgHumidity}%</dd>
      </div>
      <div className="rounded-xl bg-white/5 p-4">
        <dt className="text-slate-400">Índice UV máx.</dt>
        <dd className="mt-1 text-xl font-semibold text-white">{Math.round(uvMax)}</dd>
      </div>
    </dl>
  )
}

function getWeatherEmoji(code) {
  // Open‑Meteo weathercode simplified mapping
  if (code == null) return '▫️'
  if ([0].includes(code)) return '☀️'
  if ([1, 2].includes(code)) return '🌤️'
  if ([3].includes(code)) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57, 61, 63, 65].includes(code)) return '🌧️'
  if ([66, 67, 71, 73, 75, 77].includes(code)) return '🌨️'
  if ([80, 81, 82].includes(code)) return '🌦️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '▫️'
}
