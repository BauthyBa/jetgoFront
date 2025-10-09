import GlassCard from './GlassCard'
import AvatarUpload from './AvatarUpload'
import { useState, useMemo } from 'react'
import { updateUserMetadata, supabase } from '@/services/supabase'
import { upsertProfileToBackend } from '@/services/api'

export default function ProfileCard({ profile, readOnly = false }) {
  const name = profile?.meta?.first_name || profile?.email || ''
  const email = profile?.email || ''
  const location = profile?.meta?.country || ''
  const userId = typeof profile?.user_id === 'string' ? profile.user_id : ''
  const dni = profile?.meta?.document_number || profile?.meta?.dni || ''
  const dniVerified = profile?.dni_verified === true
  const lastName = profile?.meta?.last_name || profile?.meta?.surname || ''
  const birthDateRaw = profile?.meta?.birth_date || profile?.meta?.date_of_birth || profile?.meta?.dob || profile?.meta?.birthday || ''
  const birthDate = (() => {
    if (!birthDateRaw) return ''
    const d = new Date(birthDateRaw)
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  })()
  const age = (() => {
    if (!birthDate) return ''
    try {
      const [y, m, d] = birthDate.split('-').map((v) => parseInt(v))
      const today = new Date()
      let a = today.getFullYear() - y
      const mDiff = today.getMonth() + 1 - m
      const dDiff = today.getDate() - d
      if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) a -= 1
      return a >= 0 ? String(a) : ''
    } catch {
      return ''
    }
  })()
  const initialBio = (profile?.meta?.bio || '').toString()
  const initialInterests = Array.isArray(profile?.meta?.interests)
    ? profile.meta.interests.join(', ')
    : (profile?.meta?.interests || '').toString()
  const initialFavTrips = Array.isArray(profile?.meta?.favorite_travel_styles)
    ? profile.meta.favorite_travel_styles.join(', ')
    : (profile?.meta?.favorite_travel_styles || '').toString()

  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(initialBio)
  const [interestsText, setInterestsText] = useState(initialInterests)
  const [favTripsText, setFavTripsText] = useState(initialFavTrips)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedOnce, setSavedOnce] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.meta?.avatar_url || '')

  const interestsArray = useMemo(() => (
    interestsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  ), [interestsText])
  const favTripsArray = useMemo(() => (
    favTripsText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  ), [favTripsText])

  // Parser robusto para listas que pueden venir como array, CSV o string JSON/PG array
  const parseListValue = (value) => {
    try {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
      const raw = (value || '').toString().trim()
      if (!raw) return []
      // Intentar JSON
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {}
      // Intentar formato Postgres {a,b} o [a b]
      const cleaned = raw.replace(/[\[\]{}\"]/g, ' ')
      return cleaned.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
    } catch {
      return []
    }
  }

  const initialInterestsTokens = useMemo(() => parseListValue(profile?.meta?.interests), [profile?.meta?.interests])
  const initialFavTripsTokens = useMemo(() => parseListValue(profile?.meta?.favorite_travel_styles), [profile?.meta?.favorite_travel_styles])

  const handleAvatarChange = async (newAvatarUrl) => {
    try {
      setSaving(true)
      setError('')
      
      // Actualizar metadata en Supabase
      await updateUserMetadata({
        avatar_url: newAvatarUrl
      })
      
      // Actualizar en el backend
      try {
        await upsertProfileToBackend({
          user_id: profile?.user_id,
          email: email,
          first_name: name,
          last_name: lastName,
          document_number: dni,
          sex: profile?.meta?.sex,
          birth_date: profile?.meta?.birth_date,
          bio: (bio || '').slice(0, 500),
          interests: interestsArray,
          favorite_travel_styles: favTripsArray,
          avatar_url: newAvatarUrl,
        })
      } catch (e) {
        console.warn('Error updating backend avatar:', e)
      }
      
      // Actualizar avatar_url en la tabla User de Supabase
      try {
        const { error: updateError } = await supabase
          .from('User')
          .update({ avatar_url: newAvatarUrl })
          .eq('userid', profile?.user_id)
        
        if (updateError) {
          console.warn('Error updating avatar_url in User table:', updateError)
        }
      } catch (e) {
        console.warn('Error updating avatar_url in User table:', e)
      }
      
      setAvatarUrl(newAvatarUrl)
      setSavedOnce(true)
    } catch (e) {
      setError(e?.message || 'Error al actualizar la foto de perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {!readOnly ? (
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            userId={userId}
            disabled={saving}
          />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 999, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)', overflow: 'hidden' }}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 28, color: '#3b82f6', fontWeight: 700 }}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </span>
            )}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <div>
              {name && <h2 style={{ fontSize: 20, fontWeight: 700 }}>{name}</h2>}
              {email && <p className="muted" style={{ fontSize: 14 }}>{email}</p>}
              {location && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{location}</p>}
            </div>
            <div>
              {!readOnly && editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={saving}
                    onClick={() => { setEditing(false); setBio(initialBio); setInterestsText(initialInterests); setFavTripsText(initialFavTrips); setError('') }}
                  >Cancelar</button>
                  <button
                    className="btn"
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        setSaving(true)
                        setError('')
                        // Guardar en metadata de Supabase (fuente de verdad)
                        await updateUserMetadata({
                          bio: (bio || '').slice(0, 500),
                          interests: interestsArray,
                          favorite_travel_styles: favTripsArray,
                        })
                        // Upsert espejo en tabla pública para perfiles visibles
                        try {
                          await upsertProfileToBackend({
                            user_id: profile?.user_id,
                            email: email,
                            first_name: name,
                            last_name: lastName,
                            document_number: dni,
                            sex: profile?.meta?.sex,
                            birth_date: profile?.meta?.birth_date,
                            bio: (bio || '').slice(0, 500),
                            interests: interestsArray,
                            favorite_travel_styles: favTripsArray,
                          })
                        } catch { /* noop */ }
                        setSavedOnce(true)
                        setEditing(false)
                      } catch (e) {
                        setError(e?.message || 'No se pudo guardar el perfil')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              ) : (!readOnly && (
                <button className="btn secondary" type="button" onClick={() => setEditing(true)}>Editar</button>
              ))}
            </div>
          </div>

          {(userId || dni || lastName || birthDate || age) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              {userId && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Supabase User ID</div>
                  <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{userId}</div>
                </div>
              )}
              {dni && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>DNI</div>
                  <div style={{ fontSize: 13 }}>{dni}</div>
                </div>
              )}
              {lastName && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Apellido</div>
                  <div style={{ fontSize: 13 }}>{lastName}</div>
                </div>
              )}
              {birthDate && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Fecha de nacimiento</div>
                  <div style={{ fontSize: 13 }}>{birthDate}</div>
                </div>
              )}
              {age && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Edad</div>
                  <div style={{ fontSize: 13 }}>{age} años</div>
                </div>
              )}
              {typeof dniVerified === 'boolean' && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>DNI Verificado</div>
                  <div style={{ fontSize: 13, color: dniVerified ? '#22c55e' : '#ef4444' }}>{dniVerified ? 'Sí' : 'No'}</div>
                </div>
              )}
            </div>
          )}

          {/* Bio e intereses */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'grid', gap: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Biografía</div>
              {editing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Contanos sobre vos..."
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                  style={{ resize: 'vertical' }}
                  maxLength={500}
                />
              ) : (
                <div style={{ fontSize: 13 }}>{(savedOnce ? bio : initialBio) || <span className="muted">Sin biografía</span>}</div>
              )}
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Intereses</div>
              {editing ? (
                <input
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  placeholder="Ej: senderismo, museos, gastronomía"
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                />
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(savedOnce ? interestsArray : initialInterestsTokens).length === 0 && (
                    <span className="muted">Sin intereses</span>
                  )}
                  {(savedOnce ? interestsArray : initialInterestsTokens).map((t) => (
                    <span key={t} className="muted" style={{ border: '1px solid rgba(155, 235, 255, 0.25)', padding: '2px 8px', borderRadius: 999 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Tipos de viaje favoritos</div>
              {editing ? (
                <input
                  value={favTripsText}
                  onChange={(e) => setFavTripsText(e.target.value)}
                  placeholder="Ej: mochilero, relax, aventura, cultura"
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2"
                />
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(savedOnce ? favTripsArray : initialFavTripsTokens).length === 0 && (
                    <span className="muted">Sin preferencias</span>
                  )}
                  {(savedOnce ? favTripsArray : initialFavTripsTokens).map((t) => (
                    <span key={t} className="muted" style={{ border: '1px solid rgba(155, 235, 255, 0.25)', padding: '2px 8px', borderRadius: 999 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            {error && <div className="error" style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}


