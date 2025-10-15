# 🎙️ Configuración de APIs de Transcripción

## APIs Recomendadas

### 1. AssemblyAI (Recomendado) ⭐
- **Precisión**: 95%+
- **Idiomas**: 100+ idiomas
- **Precio**: Gratis hasta 3 horas/mes
- **Setup**: 
  1. Ve a [AssemblyAI](https://www.assemblyai.com/)
  2. Crea una cuenta gratuita
  3. Obtén tu API key
  4. Agrega a `.env`: `REACT_APP_ASSEMBLYAI_API_KEY=tu_api_key`

### 2. OpenAI Whisper (Alternativa)
- **Precisión**: 90%+
- **Idiomas**: 99 idiomas
- **Precio**: $0.006 por minuto
- **Setup**:
  1. Ve a [OpenAI](https://platform.openai.com/)
  2. Crea una cuenta
  3. Obtén tu API key
  4. Agrega a `.env`: `REACT_APP_OPENAI_API_KEY=tu_api_key`

### 3. Google Cloud Speech-to-Text
- **Precisión**: 95%+
- **Idiomas**: 125+ idiomas
- **Precio**: $0.006 por 15 segundos
- **Setup**:
  1. Ve a [Google Cloud](https://cloud.google.com/)
  2. Habilita Speech-to-Text API
  3. Obtén tu API key
  4. Agrega a `.env`: `REACT_APP_GOOGLE_API_KEY=tu_api_key`

## Configuración Rápida

### Paso 1: Crear archivo .env
```bash
# En la raíz del proyecto jetgoFront
touch .env
```

### Paso 2: Agregar API keys
```env
# AssemblyAI (Recomendado)
REACT_APP_ASSEMBLYAI_API_KEY=tu_api_key_aqui

# O OpenAI Whisper
REACT_APP_OPENAI_API_KEY=tu_api_key_aqui

# O Google Cloud
REACT_APP_GOOGLE_API_KEY=tu_api_key_aqui
```

### Paso 3: Reiniciar la aplicación
```bash
npm start
```

## Funcionalidades

### ✅ Lo que funciona ahora:
- **Transcripción silenciosa** - Sin reproducir audio
- **Múltiples APIs** - AssemblyAI, OpenAI, Google
- **Fallback automático** - Si falla la API, usa simulación
- **Interfaz moderna** - Botones y estados claros
- **Sin confirmaciones** - Proceso automático

### 🎯 Cómo usar:
1. **Sube un audio** al chat
2. **Haz clic** en "🎙️ Transcribir"
3. **Espera** 2-5 segundos
4. **Ve la transcripción** automáticamente

## Costos Estimados

| API | Gratis | Pago |
|-----|--------|------|
| AssemblyAI | 3 horas/mes | $0.00065/min |
| OpenAI | $5 crédito | $0.006/min |
| Google | $300 crédito | $0.006/15s |

## Troubleshooting

### Si no funciona:
1. **Verifica** que tienes una API key válida
2. **Revisa** la consola del navegador
3. **Prueba** con un audio corto (menos de 1 minuto)
4. **Verifica** tu conexión a internet

### Si quieres usar solo simulación:
- No agregues ninguna API key
- El sistema usará transcripciones de ejemplo
- Perfecto para desarrollo y testing
