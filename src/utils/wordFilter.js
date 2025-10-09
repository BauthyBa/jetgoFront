// Sistema de filtro de palabras para chats

// Lista de palabras a filtrar
const BANNED_WORDS = [
  // Generales (comunes en español)
  'puta', 'puto', 'pendejo', 'idiota', 'imbécil', 'tarado', 'pelotudo', 'forro', 'boludo',
  'mierda', 'carajo', 'cagón', 'cagar', 'cagada', 'culiao', 'choto', 'chupame', 'chupala',
  'gil', 'sorete', 'conchudo', 'pajero', 'pajera', 'mogólico', 'retrasado', 'negro de mierda',
  'villero', 'trolo', 'maricón', 'marica', 'travuco', 'trola', 'prostituta', 'hijo de puta',
  'hdp', 'lpm', 'lpmqtp', 'qlq', 'qliao', 'ql', 'qlero', 'cornudo', 'cornuda', 'estúpido', 'estupida',
  
  // Específicas de Argentina
  'boluda', 'forra', 'pelotuda', 'nabo', 'nabo/a', 'putazo', 'putita', 'conchuda', 
  'la concha de tu madre', 'la reputa madre', 'la re puta madre', 'andá a cagar', 
  'chupame la pija', 'chupame el pito', 'chupame un huevo', 'chupame la concha', 
  'rompé las pelotas', 'rompepelotas', 'rompe bolas', 'pelotas', 'orto', 'en el orto', 
  'culo roto', 'negro villero', 'gato', 'falopero', 'drogadicto', 'borracho de mierda', 
  'hijo de mil putas', 'hijo de re mil putas',
  
  // Variantes con disimulos
  'p.u.t.a', 'p-u-t-a', 'p u t a', 'pta', 'h.d.p', 'l.p.m', 'mrd', 'ctm', 'concha', 
  'conch*', 'ch0to', 'gilip0llas', 'pel0tudo'
]

// Función para crear regex de una palabra
function createWordRegex(word) {
  // Escapar caracteres especiales
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Permitir espacios opcionales entre caracteres
  const spaced = escaped.replace(/\s+/g, '\\s*')
  return new RegExp(`\\b${spaced}\\b`, 'gi')
}

// Función para censurar una palabra
function censorWord(word) {
  if (word.length <= 2) return word
  return word.charAt(0) + word.charAt(1) + '*'.repeat(word.length - 2)
}

// Función para censurar texto
function censorText(text) {
  if (!text || typeof text !== 'string') return text
  
  let censoredText = text
  
  BANNED_WORDS.forEach(word => {
    const regex = createWordRegex(word)
    censoredText = censoredText.replace(regex, (match) => {
      return censorWord(match)
    })
  })
  
  return censoredText
}

// Función para detectar si un texto contiene palabras prohibidas
function containsBannedWords(text) {
  if (!text || typeof text !== 'string') return false
  
  return BANNED_WORDS.some(word => {
    const regex = createWordRegex(word)
    return regex.test(text)
  })
}

// Función para obtener estadísticas de filtrado
function getFilterStats(text) {
  if (!text || typeof text !== 'string') return { original: text, censored: text, wordsFound: [] }
  
  const wordsFound = []
  let censoredText = text
  
  BANNED_WORDS.forEach(word => {
    const regex = createWordRegex(word)
    const matches = text.match(regex)
    if (matches) {
      wordsFound.push(...matches)
      censoredText = censoredText.replace(regex, (match) => censorWord(match))
    }
  })
  
  return {
    original: text,
    censored: censoredText,
    wordsFound: [...new Set(wordsFound)], // Eliminar duplicados
    wasFiltered: wordsFound.length > 0
  }
}

export {
  censorText,
  containsBannedWords,
  getFilterStats,
  BANNED_WORDS
}
