import { useCallback, useEffect, useMemo, useState } from 'react'

const OPEN_WEATHER_KEY = 'fa32fa4be0cf23249680e2becc0a9bc5'
const DEFAULT_CITY = 'Buenos Aires'

export default function WeatherPage() {
  const [query, setQuery] = useState(DEFAULT_CITY)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

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

      {!loading && !hasWeatherData && !error && (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          Elegí una ciudad para comenzar a ver los datos del clima.
        </p>
      )}
    </div>
  )
}
