import { useState, useRef } from 'react'
import { supabase } from '@/services/supabase'

export default function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange, 
  userId, 
  disabled = false 
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    setError('')
    
    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    // Subir archivo
    uploadFile(file)
  }

  const uploadFile = async (file) => {
    try {
      setUploading(true)
      setError('')
      
      console.log('🚀 Iniciando upload de avatar...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId: userId
      })

      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${userId}-${Date.now()}.${fileExt}`
      
      console.log('📝 Nombre de archivo generado:', fileName)

      // Subir a Supabase Storage
      console.log('📤 Subiendo a Supabase Storage...')
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('❌ Error en upload:', error)
        throw error
      }

      console.log('✅ Upload exitoso:', data)

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)
      
      console.log('🔗 URL pública generada:', urlData.publicUrl)

      // Notificar al componente padre
      onAvatarChange(urlData.publicUrl)
      setPreview(null)
      
      console.log('✅ Avatar actualizado exitosamente')

    } catch (err) {
      console.error('❌ Error uploading file:', err)
      setError(err.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = async () => {
    if (!currentAvatarUrl) return

    try {
      setUploading(true)
      setError('')

      // Extraer el path del archivo de la URL
      const url = new URL(currentAvatarUrl)
      const pathParts = url.pathname.split('/')
      // El path completo incluye la carpeta del usuario
      const fileName = pathParts.slice(-2).join('/') // userId/filename

      // Eliminar del storage
      const { error } = await supabase.storage
        .from('avatars')
        .remove([fileName])

      if (error) {
        console.error('Error removing file:', error)
      }

      // Notificar al componente padre
      onAvatarChange(null)

    } catch (err) {
      console.error('Error removing avatar:', err)
      setError('Error al eliminar la imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />
      
      <div 
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          borderRadius: 999,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          opacity: disabled || uploading ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (!disabled && !uploading) {
            const overlay = e.currentTarget.querySelector('[data-overlay="edit"]')
            if (overlay) overlay.style.opacity = '1'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !uploading) {
            const overlay = e.currentTarget.querySelector('[data-overlay="edit"]')
            if (overlay) overlay.style.opacity = '0'
          }
        }}
      >
        {/* Avatar actual o preview */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          background: 'rgba(59,130,246,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(59,130,246,0.3)',
          overflow: 'hidden'
        }}>
          {preview ? (
            <img 
              src={preview} 
              alt="Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : currentAvatarUrl ? (
            <img 
              src={currentAvatarUrl} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 28, color: '#3b82f6', fontWeight: 700 }}>
              ?
            </span>
          )}
        </div>

        {/* Overlay con ícono de lápiz - SOLO EN HOVER */}
        <div 
          data-overlay="edit"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'all 0.2s'
          }}
        >
          <svg 
            style={{ width: 24, height: 24, color: 'white' }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
            />
          </svg>
        </div>

        {/* Indicador de carga */}
        {uploading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: 24,
              height: 24,
              border: '2px solid white',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        )}
      </div>

      {/* Botón para eliminar avatar */}
      {currentAvatarUrl && !uploading && !disabled && (
        <button
          onClick={handleRemove}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 24,
            height: 24,
            background: '#ef4444',
            color: 'white',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#dc2626'}
          onMouseLeave={(e) => e.target.style.background = '#ef4444'}
          title="Eliminar foto"
        >
          ×
        </button>
      )}

      {/* Mensaje de error */}
      {error && (
        <div style={{
          marginTop: 8,
          color: '#ef4444',
          fontSize: 12,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 6,
          padding: 8
        }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
