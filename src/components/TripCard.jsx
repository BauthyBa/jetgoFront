import { Link } from 'react-router-dom'

export default function TripCard({ trip, onJoin, onLeave, joining, leaving, onEdit, canEdit, isMember, isOwner, onApply, hasApplied }) {
  if (!trip) return null
  const dateRange = trip.startDate
    ? (trip.endDate ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}` : new Date(trip.startDate).toLocaleDateString())
    : null
  const budget = trip.budgetMin || trip.budgetMax
    ? `$${trip.budgetMin ?? '?'} - $${trip.budgetMax ?? '?'}`
    : null
  const occupancy = (trip.currentParticipants != null || trip.maxParticipants != null)
    ? `${trip.currentParticipants ?? '?'} / ${trip.maxParticipants ?? '?'}`
    : null

  const short = (str, max = 36) => {
    try { const s = String(str || '').trim(); return s.length > max ? s.slice(0, max - 1) + '…' : s } catch { return str }
  }

  return (
    <div className="card glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: 260, height: 260 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {trip.imageUrl && (
          <img src={trip.imageUrl} alt={trip.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
        )}
        <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
          <Link to={`/trip/${trip.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }} className="truncate-1" title={trip.name}>
            {short(trip.name, 28)}
          </Link>
          <div className="muted truncate-1" title={`${trip.origin || ''} → ${trip.destination || ''}`}>
            {short(trip.origin || 'Origen ?', 22)} → {short(trip.destination || 'Destino ?', 22)}
          </div>
          {dateRange && <div className="muted truncate-1">{dateRange}</div>}
          {trip.country && <div className="muted truncate-1">{short(trip.country, 30)}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {budget && <span className="muted">Presupuesto: {budget}</span>}
        {trip.roomType && <span className="muted">Habitación: {trip.roomType}</span>}
        {trip.season && <span className="muted">Temporada: {trip.season}</span>}
        {occupancy && <span className="muted">Cupos: {occupancy}</span>}
      </div>
      {trip.tags && trip.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {trip.tags.map((t) => (
            <span key={t} className="muted" style={{ border: '1px solid rgba(155, 235, 255, 0.25)', padding: '2px 8px', borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      )}
      <div className="actions" style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
        {canEdit && (
          <button className="btn secondary" type="button" onClick={onEdit}>Editar</button>
        )}
        <div style={{ flex: 1 }} />
        {isMember ? (
          <button className="btn secondary" type="button" disabled={leaving} onClick={onLeave}>
            {isOwner ? (leaving ? 'Eliminando…' : 'Eliminar viaje') : (leaving ? 'Saliendo…' : 'Abandonar')}
          </button>
        ) : hasApplied ? (
          <button
            className="btn secondary"
            type="button"
            disabled={true}
            title="Ya enviaste una solicitud para este viaje"
          >
            Solicitud enviada
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={joining || (trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants)}
            onClick={onApply || onJoin}
            title={(trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants) ? 'Cupos completos' : ''}
          >
            {joining ? 'Aplicando…' : (trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants ? 'Sin cupo' : 'Aplicar')}
          </button>
        )}
      </div>
    </div>
  )
}


