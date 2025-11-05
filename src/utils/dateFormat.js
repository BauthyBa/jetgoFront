/**
 * Formatea una fecha sin problemas de timezone
 * @param {string} dateString - Fecha en formato YYYY-MM-DD o ISO
 * @param {object} options - Opciones de formato (opcional)
 * @returns {string} Fecha formateada
 */
export const formatDateDisplay = (dateString, options = {}) => {
  if (!dateString) return 'N/A'
  
  try {
    // Si está en formato YYYY-MM-DD, parsearlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      
      if (options.format === 'long') {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
      }
      
      return `${day}/${month}/${year}`
    }
    
    // Si tiene hora (formato ISO), extraer solo la fecha
    if (dateString.includes('T')) {
      const [year, month, day] = dateString.split('T')[0].split('-')
      
      if (options.format === 'long') {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
      }
      
      return `${day}/${month}/${year}`
    }
    
    // Fallback: intentar parsear con Date pero agregando hora para evitar timezone issues
    const date = new Date(dateString + 'T12:00:00')
    if (isNaN(date.getTime())) return dateString
    
    return date.toLocaleDateString('es-AR', options)
  } catch {
    return dateString
  }
}

/**
 * Formatea un rango de fechas
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin (opcional)
 * @returns {string} Rango formateado
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate) return ''
  
  const start = formatDateDisplay(startDate)
  if (!endDate) return start
  
  const end = formatDateDisplay(endDate)
  return `${start} - ${end}`
}
