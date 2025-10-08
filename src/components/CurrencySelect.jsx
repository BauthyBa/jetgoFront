import React from 'react'

const CurrencySelect = ({ value, onChange, className = '', style = {} }) => {
  const currencies = [
    { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'ARS', name: 'Peso argentino', symbol: '$' },
    { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
    { code: 'CLP', name: 'Peso chileno', symbol: '$' },
    { code: 'COP', name: 'Peso colombiano', symbol: '$' },
    { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
    { code: 'PEN', name: 'Sol peruano', symbol: 'S/' },
    { code: 'UYU', name: 'Peso uruguayo', symbol: '$' },
    { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
    { code: 'JPY', name: 'Yen japonés', symbol: '¥' },
    { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
    { code: 'AUD', name: 'Dólar australiano', symbol: 'A$' },
    { code: 'CHF', name: 'Franco suizo', symbol: 'CHF' },
    { code: 'CNY', name: 'Yuan chino', symbol: '¥' },
    { code: 'INR', name: 'Rupia india', symbol: '₹' },
    { code: 'KRW', name: 'Won surcoreano', symbol: '₩' },
    { code: 'SGD', name: 'Dólar singapurense', symbol: 'S$' },
    { code: 'HKD', name: 'Dólar hongkonés', symbol: 'HK$' },
    { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$' }
  ]

  return (
    <select 
      value={value || 'USD'} 
      onChange={onChange}
      className={className}
      style={{
        color: '#e5e7eb',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '14px',
        minWidth: '120px',
        ...style
      }}
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code} style={{ background: '#1f2937', color: '#e5e7eb' }}>
          {currency.symbol} {currency.code} - {currency.name}
        </option>
      ))}
    </select>
  )
}

export default CurrencySelect
