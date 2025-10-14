import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createTripExpense, updateTripExpense, getExpenseCategories, validateExpenseData } from '@/services/expenses'

export default function TripExpenseForm({ 
  tripId, 
  payerId, 
  expense = null, // Si se proporciona, es modo edición
  onSuccess, 
  onCancel 
}) {
  const [formData, setFormData] = useState({
    trip_id: tripId,
    payer_id: payerId,
    amount: '',
    currency: 'USD',
    description: '',
    category: '',
    expense_date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    location: '',
    notes: '',
    receipt_url: '',
    receipt_filename: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [categories, setCategories] = useState([])

  const isEditMode = !!expense

  useEffect(() => {
    loadCategories()
    
    if (expense) {
      // Cargar datos del gasto para edición
      setFormData({
        trip_id: expense.trip_id,
        payer_id: expense.payer_id,
        amount: expense.amount.toString(),
        currency: expense.currency,
        description: expense.description,
        category: expense.category,
        expense_date: new Date(expense.expense_date).toISOString().slice(0, 16),
        location: expense.location || '',
        notes: expense.notes || '',
        receipt_url: expense.receipt_url || '',
        receipt_filename: expense.receipt_filename || ''
      })
    }
  }, [expense])

  const loadCategories = async () => {
    try {
      const response = await getExpenseCategories()
      if (response.ok) {
        setCategories(response.data || [])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Validar datos
    const validation = validateExpenseData(formData)
    if (!validation.isValid) {
      setErrors({ general: validation.errors })
      setLoading(false)
      return
    }

    try {
      let response
      if (isEditMode) {
        response = await updateTripExpense(expense.id, {
          user_id: payerId,
          ...formData,
          amount: parseFloat(formData.amount)
        })
      } else {
        response = await createTripExpense({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      }
      
      if (response.ok) {
        onSuccess?.(response.data)
      } else {
        setErrors({ general: [response.error] })
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      setErrors({ general: ['Error al guardar el gasto. Inténtalo de nuevo.'] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Errors */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-600">
              {Array.isArray(errors.general) ? errors.general.join(', ') : errors.general}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Monto y Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
                <option value="BRL">BRL</option>
                <option value="CLP">CLP</option>
                <option value="COP">COP</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <Input
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="¿En qué se gastó el dinero?"
              required
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del Gasto
              </label>
              <Input
                type="datetime-local"
                value={formData.expense_date}
                onChange={(e) => handleInputChange('expense_date', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="¿Dónde se realizó el gasto?"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Adicionales
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Información adicional sobre el gasto..."
              rows={3}
            />
          </div>

          {/* Comprobante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL del Comprobante
              </label>
              <Input
                type="url"
                value={formData.receipt_url}
                onChange={(e) => handleInputChange('receipt_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Archivo
              </label>
              <Input
                value={formData.receipt_filename}
                onChange={(e) => handleInputChange('receipt_filename', e.target.value)}
                placeholder="factura.pdf"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear Gasto')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
