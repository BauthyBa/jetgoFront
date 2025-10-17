const BACKEND_FALLBACKS = {
  PRODUCTION: 'https://jetgoback.onrender.com',
  STAGING: 'https://jetgoback.onrender.com',
  LOCAL: 'http://localhost:8000',
}

function sanitizeBackendUrl(url) {
  if (!url) return ''
  return url.replace('jetgo-back', 'jetgoback').replace(/\/+$/, '')
}

function extractBaseFromEnv() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (!raw) return ''

  const cleaned = sanitizeBackendUrl(raw)
  // VITE_API_BASE_URL usually points to the /api root. Strip it to keep config consistent.
  if (cleaned.endsWith('/api')) {
    return cleaned.slice(0, -4)
  }
  return cleaned
}

function detectEnvironment() {
  if (typeof window === 'undefined') return 'PRODUCTION'
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'LOCAL'
  }
  if (hostname.includes('vercel.app')) {
    return 'PRODUCTION'
  }
  return 'STAGING'
}

const API_CONFIG = {
  SOCIAL_ENDPOINTS: {
    POSTS: '/api/social/posts/',
    STORIES: '/api/social/stories/',
    TEST: '/api/social/test/',
  },

  getApiBaseUrl() {
    const envBase = extractBaseFromEnv()
    if (envBase) return envBase

    const env = detectEnvironment()
    return sanitizeBackendUrl(BACKEND_FALLBACKS[env])
  },

  getEndpointUrl(endpoint) {
    const base = this.getApiBaseUrl()
    return `${base}${endpoint}`
  },
}

export default API_CONFIG
