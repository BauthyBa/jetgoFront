const transportTypeUiToBackend = {
  auto: 'car',
  bus: 'bus',
  tren: 'train',
  avion: 'plane',
}

const transportTypeBackendToUi = Object.entries(transportTypeUiToBackend)
  .reduce((acc, [uiValue, backendValue]) => {
    acc[backendValue] = uiValue
    return acc
  }, {})

export function mapTransportTypeForBackend(uiValue) {
  if (!uiValue) return null
  return transportTypeUiToBackend[uiValue] || uiValue
}

export function mapTransportTypeForUi(backendValue) {
  if (!backendValue) return null
  return transportTypeBackendToUi[backendValue] || backendValue
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
