import { useRef, useState, useEffect, useCallback } from 'react'
import { registerUser } from '../services/api'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSession, updateUserMetadata } from '../services/supabase'
import { upsertProfileToBackend } from '../services/api'
import { signInWithGoogle, supabase } from '../services/supabase'

export default function Register({ embedded = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  const googleMode = new URLSearchParams(location.search).get('mode') === 'google'
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    document_number: '',
    sex: 'M',
    birth_date: '',
    email: '',
    password: '',
    dni_front_payload: '',
    dni_image_file: null,
    dni_image_url: '',
    dni_back_file: null,
    dni_back_url: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const [scanning, setScanning] = useState(false)
  const imgRef = useRef(null)
  const backImgRef = useRef(null)
  const [scanStatus, setScanStatus] = useState('idle')
  const [overlay, setOverlay] = useState({ visible: false, message: '' })
  const [termsOpen, setTermsOpen] = useState(false)
  const [termsHtml, setTermsHtml] = useState('')
  const [termsReadyToAccept, setTermsReadyToAccept] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const termsScrollRef = useRef(null)
  const termsHtmlRef = useRef('')

  const loadTerms = useCallback(async () => {
    if (termsHtmlRef.current && termsHtmlRef.current.length > 0) return termsHtmlRef.current
    try {
      const cached = sessionStorage.getItem('terms_html')
      if (cached) {
        termsHtmlRef.current = cached
        setTermsHtml(cached)
        return cached
      }
    } catch {}
    const base = (import.meta?.env?.BASE_URL ?? '/')
    const candidates = [
      `${base.replace(/\/$/, '/') }terms.html`,
      'terms.html',
      '/terms.html',
    ]
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const html = await res.text()
        if (html && html.length > 20) {
          termsHtmlRef.current = html
          setTermsHtml(html)
          try { sessionStorage.setItem('terms_html', html) } catch {}
          return html
        }
      } catch (e) {
        // try next candidate
      }
    }
    const fallback = '<h3>Términos</h3><p>No se pudo cargar el archivo. Intenta nuevamente.</p>'
    setTermsHtml(fallback)
    termsHtmlRef.current = fallback
    return fallback
  }, [])

  useEffect(() => {
    // Pre-cargar términos en segundo plano al ingresar a la página
    loadTerms()
  }, [loadTerms])

  const openTerms = async () => {
    setTermsOpen(true)
    setTermsReadyToAccept(false)
    await loadTerms()
  }

  const parseDniPayload = (payload) => {
    let text = payload.replace(/[^\x20-\x7E@/]/g, '')
    text = text.replace(/\r?\n/g, '@').replace(/@{2,}/g, '@').trim()
    const parts = text.split('@')
    if (parts.length < 9) return null
    const lastnames = parts[1].replaceAll("'", '').trim()
    const names = parts[2].replaceAll("'", '').trim()
    const sex = parts[3].replaceAll("'", '').trim()
    const document = parts[4].replaceAll("'", '').trim()
    const birth = parts[6].replaceAll("'", '').trim()
    const [d, m, y] = birth.split('/')
    const birthISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return { lastnames, names, sex, document, birthISO }
  }

  const rotateDataUrl = (url, angle) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no soportado'))
        const radians = (angle * Math.PI) / 180
        const sin = Math.abs(Math.sin(radians))
        const cos = Math.abs(Math.cos(radians))
        const newWidth = img.width * cos + img.height * sin
        const newHeight = img.width * sin + img.height * cos
        canvas.width = Math.ceil(newWidth)
        canvas.height = Math.ceil(newHeight)
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(radians)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const preprocessImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas no soportado'))
        const maxWidth = 2000
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
          const enhanced = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30)
          data[i] = enhanced
          data[i + 1] = enhanced
          data[i + 2] = enhanced
        }
        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  const tryDecodeWithFallbacks = async (url) => {
    const processedUrl = await preprocessImage(url)
    const hintConfigs = [
      { name: 'PDF_417_only', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
      { name: 'Multiple_formats', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.DATA_MATRIX]], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
      { name: 'All_formats', hints: new Map([[DecodeHintType.TRY_HARDER, true], [DecodeHintType.CHARACTER_SET, 'UTF-8']]) },
    ]

    const images = [ { name: 'processed', url: processedUrl }, { name: 'original', url } ]
    const angles = [0, 90, 180, 270]

    for (const config of hintConfigs) {
      for (const image of images) {
        for (const angle of angles) {
          try {
            const reader = new BrowserMultiFormatReader(config.hints)
            let imageUrl = image.url
            if (angle !== 0) {
              imageUrl = await rotateDataUrl(image.url, angle)
            }
            const result = await reader.decodeFromImageUrl(imageUrl)
            return result
          } catch (e) {
            // continue
          }
        }
      }
    }
    throw new Error('No se pudo decodificar el código de barras con ningún método.')
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (imgRef.current) imgRef.current.src = url
    setForm((f) => ({ ...f, dni_image_file: file, dni_image_url: url }))
    setError(null)
    setScanStatus('idle')
  }

  const handleBackImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (backImgRef.current) backImgRef.current.src = url
    setForm((f) => ({ ...f, dni_back_file: file, dni_back_url: url }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!termsAccepted) {
      setError('Debes aceptar los Términos y Condiciones para continuar')
      return
    }
    setLoading(true)
    setError(null)
    setOk(false)
    setScanning(true)
    setOverlay({ visible: true, message: 'Analizando DNI…' })
    try {
      if (!form.dni_image_file) throw new Error('Debes subir una foto del frente del DNI')
      if (!form.dni_back_file) throw new Error('Debes subir una foto del dorso del DNI')
      const result = await tryDecodeWithFallbacks(form.dni_image_url)
      const text = result.getText()
      setForm((f) => ({ ...f, dni_front_payload: text }))
      const parsed = parseDniPayload(text)
      if (!parsed) throw new Error('No se pudo validar el código. Intentá otra foto más nítida del frente del DNI.')

      const stripAccents = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const norm = (s) => stripAccents(s).trim().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean)
      const isSubset = (a, b) => a.every((x) => b.includes(x))
      const mismatches = []
      const inNames = norm(form.first_name)
      const dnNames = norm(parsed.names)
      if (!(isSubset(inNames, dnNames) || isSubset(dnNames, inNames))) mismatches.push('Nombres')
      const inLast = norm(form.last_name)
      const dnLast = norm(parsed.lastnames)
      if (!(isSubset(inLast, dnLast) || isSubset(dnLast, inLast))) mismatches.push('Apellidos')
      const onlyDigits = (x) => x.replace(/\D/g, '')
      if (onlyDigits(form.document_number) !== onlyDigits(parsed.document)) mismatches.push('Número de documento')
      if (form.sex.toUpperCase().slice(0,1) !== parsed.sex.toUpperCase().slice(0,1)) mismatches.push('Sexo')
      if (form.birth_date !== parsed.birthISO) mismatches.push('Fecha de nacimiento')
      if (mismatches.length) throw new Error(`Los siguientes campos no coinciden con el DNI: ${mismatches.join(', ')}`)

      if (googleMode) {
        try {
          const session = await getSession()
          const supaEmail = session?.user?.email || ''
          if (supaEmail) {
            // Generar una contraseña aleatoria solo para cumplir con el backend
            const randArray = new Uint8Array(16)
            crypto.getRandomValues(randArray)
            const randomPassword = Array.from(randArray).map((b) => b.toString(16).padStart(2, '0')).join('')
            await registerUser({
              first_name: form.first_name,
              last_name: form.last_name,
              document_number: form.document_number,
              sex: form.sex,
              birth_date: form.birth_date,
              email: supaEmail,
              password: randomPassword,
              dni_front_payload: text,
            })
            localStorage.setItem('dni_meta', JSON.stringify({
              first_name: form.first_name,
              last_name: form.last_name,
              document_number: form.document_number,
              sex: form.sex,
              birth_date: form.birth_date,
            }))
            // Guardar datos básicos en el user metadata de Supabase
            await updateUserMetadata({
              first_name: form.first_name,
              last_name: form.last_name,
              document_number: form.document_number,
              sex: form.sex,
              birth_date: form.birth_date,
              dni_verified: true
            })
            // Upsert inmediato al backend (tabla public.User)
            try {
              await upsertProfileToBackend({
                user_id: session?.user?.id,
                email: supaEmail,
                first_name: form.first_name,
                last_name: form.last_name,
                document_number: form.document_number,
                sex: form.sex,
                birth_date: form.birth_date,
              })
            } catch (e) {
              console.warn('No se pudo upsert perfil al backend durante verificación:', e?.message || e)
            }
          }
        } catch (e) {
          // Si ya existe el email u otro error del backend, seguimos igualmente
          console.warn('No se pudo guardar datos en backend:', e?.message || e)
        }
        localStorage.setItem('dni_verified', 'true')
        setOk(true)
        navigate('/')
      } else {
        // 1) Guardar en backend
        await registerUser(form)
        // 2) Enviar email de confirmación con Supabase (y guardar metadata)
        try {
          await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { emailRedirectTo: window.location.origin + '/login', data: {
              first_name: form.first_name,
              last_name: form.last_name,
              document_number: form.document_number,
              sex: form.sex,
              birth_date: form.birth_date,
              dni_verified: true,
            } }
          })
          localStorage.setItem('dni_meta', JSON.stringify({
            first_name: form.first_name,
            last_name: form.last_name,
            document_number: form.document_number,
            sex: form.sex,
            birth_date: form.birth_date,
          }))
        } catch (e) {
          console.warn('No se pudo iniciar signUp en Supabase:', e?.message || e)
        }
        localStorage.setItem('dni_verified', 'true')
        setOk(true)
      }
    } catch (err) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : err.message)
      setScanStatus('error')
    } finally {
      setLoading(false)
      setScanning(false)
      setOverlay({ visible: false, message: '' })
    }
  }

  const inner = (
    <>
      <p className="muted" style={{ fontSize: '18px', marginBottom: '36px' }}>Subí la foto del frente del DNI para verificar tus datos. Ingresá tus datos manualmente en los campos de abajo.</p>
      <form className="form form-grid" onSubmit={handleSubmit} style={{ gap: '24px' }}>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Foto del DNI (frente)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            <div className={"preview " + (imgRef.current?.src ? 'visible' : '')} style={{ marginBottom: '24px' }}>
              <img ref={imgRef} alt="preview" style={{ maxHeight: 260 }} />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Foto del DNI (dorso)</label>
              <input type="file" accept="image/*" onChange={handleBackImageChange} style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            <div className={"preview " + (backImgRef.current?.src ? 'visible' : '')} style={{ marginBottom: '24px' }}>
              <img ref={backImgRef} alt="preview dorso" style={{ maxHeight: 260 }} />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Nombres</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Ejemplo: Juan Carlos" required style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Apellidos</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Ejemplo: Pérez Gómez" required style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Número de Documento</label>
              <input name="document_number" value={form.document_number} onChange={handleChange} required style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Sexo</label>
              <select name="sex" value={form.sex} onChange={handleChange} style={{ padding: '16px', fontSize: '18px' }}>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '18px', marginBottom: '12px' }}>Fecha de nacimiento</label>
              <input type="date" name="birth_date" value={form.birth_date} onChange={handleChange} required style={{ padding: '16px', fontSize: '18px' }} />
            </div>
            {!googleMode && (
              <>
                <div className="field" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '18px', marginBottom: '12px' }}>Correo</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="ejemplo@email.com" required style={{ padding: '16px', fontSize: '18px' }} />
                </div>
                <div className="field" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '18px', marginBottom: '12px' }}>Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      value={form.password} 
                      onChange={handleChange} 
                      required 
                      style={{ padding: '16px', paddingRight: '50px', fontSize: '18px', width: '100%' }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            <div className="field" style={{ marginTop: 20, alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', width: '100%' }}>
                <input
                  id="terms_checkbox"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      openTerms()
                    } else {
                      setTermsAccepted(false)
                    }
                  }}
                  style={{ width: 22, height: 22 }}
                />
                <label htmlFor="terms_checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: '18px' }}>
                  <span>He leído y acepto los</span>
                  <span
                    role="link"
                    tabIndex={0}
                    style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', fontSize: '18px' }}
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openTerms()
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        openTerms()
                      }
                    }}
                  >
                    Términos y Condiciones
                  </span>
                </label>
              </div>
            </div>
            <input type="hidden" name="dni_front_payload" value={form.dni_front_payload} />
            <div className="actions" style={{ marginTop: '36px', gap: '20px' }}>
              <button className="btn" type="submit" disabled={loading || scanning || !termsAccepted} style={{ padding: '18px 24px', fontSize: '18px' }}>{googleMode ? (loading || scanning ? 'Verificando…' : 'Verificar DNI') : (loading ? 'Enviando...' : (scanning ? 'Leyendo...' : 'Crear cuenta'))}</button>
              <button className="btn secondary" type="button" onClick={() => { setForm({ ...form, first_name: '', last_name: '', document_number: '', sex: 'M', birth_date: '', dni_front_payload: '', dni_image_file: null, dni_image_url: '', dni_back_file: null, dni_back_url: '' }); if (imgRef.current) imgRef.current.src = ''; if (backImgRef.current) backImgRef.current.src = ''; }} style={{ padding: '18px 24px', fontSize: '18px' }}>Limpiar</button>
              <span className="muted" style={{ fontSize: '18px' }}>{scanning ? 'Procesando imagen...' : ''}</span>
            </div>
            {ok && <p className="success" style={{ fontSize: '18px', padding: '18px', marginTop: '24px' }}>Revisa tu correo para confirmar la cuenta. Luego podés iniciar sesión.</p>}
            {error && <pre className="error" style={{ fontSize: '18px', padding: '18px', marginTop: '24px' }}>{error}</pre>}
      </form>
    </>
  )

  return (
    <>
      {embedded ? (
        <>{inner}</>
      ) : (
        <div className="container" style={{ maxWidth: '1000px', padding: '40px' }}>
          <div className="card glass-card" style={{ padding: '50px', transform: 'scale(1.2)', transformOrigin: 'center' }}>
            <h2 className="page-title" style={{ fontSize: '3rem', marginBottom: '32px' }}>Registro</h2>
            {inner}
          </div>
        </div>
      )}
      {termsOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="termsTitle">
          <div className="overlay-box" style={{ maxWidth: 740, width: '90%' }}>
            <h3 id="termsTitle" style={{ fontWeight: 800, marginBottom: 8 }}>Términos y Condiciones</h3>
            <div
              ref={termsScrollRef}
              onScroll={() => {
                try {
                  const el = termsScrollRef.current
                  if (!el) return
                  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
                  if (nearBottom) setTermsReadyToAccept(true)
                } catch {}
              }}
              style={{ maxHeight: '50vh', overflowY: 'auto', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)', width: '100%' }}
              dangerouslySetInnerHTML={{ __html: termsHtml }}
            />
            <div className="muted" style={{ fontSize: 12 }}>Desplazate hasta el final para habilitar "Aceptar".</div>
            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button className="btn secondary" type="button" onClick={() => { setTermsOpen(false) }}>Cancelar</button>
              <button className="btn" type="button" disabled={!termsReadyToAccept} onClick={() => { setTermsAccepted(true); setTermsOpen(false) }}>Aceptar</button>
            </div>
          </div>
        </div>
      )}
      {overlay.visible && (
        <div className="overlay">
          <div className="overlay-box">
            <div className="loader"></div>
            <div>{overlay.message}</div>
          </div>
        </div>
      )}
    </>
  )
}


