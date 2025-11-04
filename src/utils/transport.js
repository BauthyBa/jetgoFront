const transportTypeUiToBackend = {
  auto: 'auto',
  bus: 'colectivo',
  tren: 'tren',
  avion: 'avion',
}

const transportTypeBackendToUi = {
  auto: 'auto',
  car: 'auto',
  colectivo: 'bus',
  bus: 'bus',
  tren: 'tren',
  train: 'tren',
  avion: 'avion',
  plane: 'avion',
}

export function mapTransportTypeForBackend(uiValue) {
  if (!uiValue) return null
  return transportTypeUiToBackend[uiValue] || uiValue
}

export function mapTransportTypeForUi(backendValue) {
  if (!backendValue) return null
  const normalized = String(backendValue).toLowerCase()
  return transportTypeBackendToUi[normalized] || backendValue
}

export function getTransportTypeLabel(uiValue) {
  switch (uiValue) {
    case 'auto':
      return 'Auto'
    case 'bus':
      return 'Bus'
    case 'tren':
      return 'Tren'
    case 'avion':
      return 'Avión'
    default:
      return uiValue ? String(uiValue).charAt(0).toUpperCase() + String(uiValue).slice(1) : ''
  }
}
