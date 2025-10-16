import GlassCard from './GlassCard'

export default function ChatsCard({ title = 'Chats', rooms = [], onOpen }) {
  const count = rooms.length
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
        <span className="muted" style={{ fontSize: 12 }}>{count} activos</span>
      </div>
      <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
        {rooms.map((r) => (
          <div key={r.id} className="glass-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600 }}>
                  {r.display_name || r.name}
                  {r.is_private === true || r.application_id ? (
                    <span className="muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 12 }}>(Privado)</span>
                  ) : r.trip_id ? (
                    <span className="muted" style={{ marginLeft: 8, fontWeight: 400, fontSize: 12 }}>💰 Gastos</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                style={{ height: 32 }}
                onClick={() => onOpen && onOpen(r)}
                aria-label={`Abrir chat ${r.name}`}
              >
                Abrir
              </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && <p className="muted">No hay chats activos.</p>}
      </div>
    </GlassCard>
  )
}


