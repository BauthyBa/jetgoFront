// Configuración para APIs de transcripción
export const TRANSCRIPTION_CONFIG = {
  // AssemblyAI - Recomendado para producción
  ASSEMBLYAI: {
    API_KEY: '4da73aaa71c8478c9de758385ec26e50',
    BASE_URL: 'https://api.assemblyai.com/v2',
    LANGUAGES: {
      SPANISH: 'es',
      ENGLISH: 'en',
      FRENCH: 'fr',
      GERMAN: 'de'
    }
  },
  
  // OpenAI Whisper - Alternativa gratuita
  OPENAI: {
    API_KEY: 'YOUR_OPENAI_API_KEY',
    BASE_URL: 'https://api.openai.com/v1',
    MODEL: 'whisper-1'
  },
  
  // Google Cloud Speech-to-Text
  GOOGLE: {
    API_KEY: 'YOUR_GOOGLE_API_KEY',
    BASE_URL: 'https://speech.googleapis.com/v1'
  }
}

// Función para obtener la API key activa
export const getActiveAPIKey = () => {
  if (TRANSCRIPTION_CONFIG.ASSEMBLYAI.API_KEY && TRANSCRIPTION_CONFIG.ASSEMBLYAI.API_KEY !== 'YOUR_ASSEMBLYAI_API_KEY') {
    return { provider: 'assemblyai', key: TRANSCRIPTION_CONFIG.ASSEMBLYAI.API_KEY }
  }
  if (TRANSCRIPTION_CONFIG.OPENAI.API_KEY && TRANSCRIPTION_CONFIG.OPENAI.API_KEY !== 'YOUR_OPENAI_API_KEY') {
    return { provider: 'openai', key: TRANSCRIPTION_CONFIG.OPENAI.API_KEY }
  }
  if (TRANSCRIPTION_CONFIG.GOOGLE.API_KEY && TRANSCRIPTION_CONFIG.GOOGLE.API_KEY !== 'YOUR_GOOGLE_API_KEY') {
    return { provider: 'google', key: TRANSCRIPTION_CONFIG.GOOGLE.API_KEY }
  }
  return { provider: 'demo', key: null }
}
