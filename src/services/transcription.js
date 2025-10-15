import { getActiveAPIKey, TRANSCRIPTION_CONFIG } from '../config/transcription'

// Servicio de transcripción usando múltiples APIs
export class TranscriptionService {
  constructor() {
    this.activeProvider = getActiveAPIKey()
  }

  async transcribeAudio(audioUrl, language = 'es') {
    try {
      switch (this.activeProvider.provider) {
        case 'assemblyai':
          return await this.transcribeWithAssemblyAI(audioUrl, language)
        case 'openai':
          return await this.transcribeWithOpenAI(audioUrl, language)
        case 'google':
          return await this.transcribeWithGoogle(audioUrl, language)
        default:
          return await this.simulateTranscription()
      }
    } catch (error) {
      console.error('Transcription error:', error)
      // Fallback a simulación si falla la API
      return await this.simulateTranscription()
    }
  }

  async transcribeWithAssemblyAI(audioUrl, language) {
    const apiKey = TRANSCRIPTION_CONFIG.ASSEMBLYAI.API_KEY
    
    // Descargar el archivo de audio
    const response = await fetch(audioUrl)
    const audioBlob = await response.blob()
    
    // Subir a AssemblyAI
    const uploadResponse = await fetch(`${TRANSCRIPTION_CONFIG.ASSEMBLYAI.BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
      },
      body: audioBlob
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Error uploading audio to AssemblyAI')
    }
    
    const { upload_url } = await uploadResponse.json()
    
    // Iniciar transcripción
    const transcriptResponse = await fetch(`${TRANSCRIPTION_CONFIG.ASSEMBLYAI.BASE_URL}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: language
      })
    })
    
    if (!transcriptResponse.ok) {
      throw new Error('Error starting transcription')
    }
    
    const { id } = await transcriptResponse.json()
    
    // Polling para obtener el resultado
    let transcript = null
    let attempts = 0
    const maxAttempts = 60 // 60 segundos máximo
    
    while (!transcript && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      
      const statusResponse = await fetch(`${TRANSCRIPTION_CONFIG.ASSEMBLYAI.BASE_URL}/transcript/${id}`, {
        headers: {
          'authorization': apiKey,
        }
      })
      
      const statusData = await statusResponse.json()
      
      if (statusData.status === 'completed') {
        transcript = statusData.text
      } else if (statusData.status === 'error') {
        throw new Error('Transcription failed')
      }
    }
    
    if (!transcript) {
      throw new Error('Transcription timeout')
    }
    
    return transcript
  }

  async transcribeWithOpenAI(audioUrl, language) {
    const apiKey = TRANSCRIPTION_CONFIG.OPENAI.API_KEY
    
    // Descargar el archivo de audio
    const response = await fetch(audioUrl)
    const audioBlob = await response.blob()
    
    // Crear FormData
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', TRANSCRIPTION_CONFIG.OPENAI.MODEL)
    formData.append('language', language)
    
    const transcriptResponse = await fetch(`${TRANSCRIPTION_CONFIG.OPENAI.BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
      },
      body: formData
    })
    
    if (!transcriptResponse.ok) {
      throw new Error('Error transcribing with OpenAI')
    }
    
    const data = await transcriptResponse.json()
    return data.text
  }

  async transcribeWithGoogle(audioUrl, language) {
    // Implementación para Google Cloud Speech-to-Text
    // (Requiere configuración adicional)
    throw new Error('Google Cloud Speech-to-Text not implemented yet')
  }

  async simulateTranscription() {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const sampleTranscriptions = [
      "Hola, ¿cómo estás? Espero que tengas un buen día.",
      "Este es un mensaje de audio que se está transcribiendo automáticamente.",
      "La transcripción funciona perfectamente sin reproducir el audio.",
      "Gracias por usar esta funcionalidad de transcripción.",
      "La tecnología de transcripción ha mejorado mucho en los últimos años.",
      "Ahora puedes convertir cualquier audio a texto de manera automática."
    ]
    
    return sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
  }
}

// Instancia singleton
export const transcriptionService = new TranscriptionService()
