/**
 * Side panel that slides in when a novel taxon is selected (from UMAP or table).
 * Props:
 *   read  — the selected taxa_call / novel cluster object (or null to close)
 *   onClose — callback to clear selection
 */
export default function NovelPanel({ read, onClose }) {
  if (!read) return null

  const lineage = read.nearest_known_relative
  // lineage may be an object like { phylum, class, order, family, genus } or null
  const lineageEntries = lineage && typeof lineage === 'object'
    ? Object.entries(lineage).filter(([, v]) => v)
    : []

  const confidence = read.confidence != null ? (read.confidence * 100).toFixed(1) : null
  const confColor = confidence > 80 ? 'var(--accent-teal)' : confidence > 50 ? 'var(--accent-cyan)' : '#f59e0b'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 13, 24, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          animation: 'fadeIn 150ms ease',
        }}
      />

      {/* Panel */}
      <aside style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(420px, 100vw)',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-active)',
        boxShadow: '-8px 0 40px rgba(0,229,255,0.1)',
        zIndex: 201,
        overflowY: 'auto',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'slideInRight 200ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <span className="badge badge-novel" style={{ marginBottom: '8px' }}>Novel Candidate</span>
            <h3 style={{ color: 'var(--text-primary)', marginTop: '6px', fontSize: '0.9rem', fontFamily: 'var(--font-sans)' }}>
              Read ID
            </h3>
            <p className="mono" style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
              {read.read_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px 10px', flexShrink: 0 }}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Confidence meter */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Model Confidence
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: confColor }}>
              {confidence != null ? `${confidence}%` : '—'}
            </span>
            {read.deepest_rank && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                at {read.deepest_rank} level
              </span>
            )}
          </div>
          {confidence != null && (
            <div style={{ marginTop: '10px', height: '4px', borderRadius: '99px', background: 'var(--bg-elevated)' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(confidence, 100)}%`,
                borderRadius: '99px',
                background: `linear-gradient(90deg, ${confColor}, var(--accent-cyan))`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          )}
        </div>

        {/* HDBSCAN cluster */}
        {read.embedding_cluster_id != null && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              HDBSCAN Cluster
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: '#a78bfa' }}>
              #{read.embedding_cluster_id}
            </span>
          </div>
        )}

        {/* Nearest known relative breadcrumb */}
        {lineageEntries.length > 0 && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Nearest Known Relative Lineage
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {lineageEntries.map(([rank, name], i) => (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0,
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: `hsl(${190 + i * 20}, 80%, 60%)`,
                      flexShrink: 0,
                    }} />
                    {i < lineageEntries.length - 1 && (
                      <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{rank}</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>{name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lineageEntries.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No nearest-known-relative lineage available for this read.
          </p>
        )}
      </aside>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  )
}
