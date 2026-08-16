/**
 * Compact stat card for the summary strip.
 * Props: label (string), value (string|number), accent (optional css color), sublabel (optional string)
 */
export default function StatCard({ label, value, accent, icon, sublabel }) {
  return (
    <div className="card" style={{
      padding: '20px 24px',
      flex: 1,
      minWidth: '140px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow blob */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: accent ? `${accent}22` : 'rgba(0,229,255,0.08)',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{icon}</div>

      <div style={{
        fontSize: 'clamp(1.5rem, 3vw, 2rem)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        color: accent || 'var(--accent-cyan)',
        lineHeight: 1.1,
      }}>
        {value ?? '—'}
      </div>

      <div style={{
        marginTop: '6px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      {sublabel && (
        <div style={{
          marginTop: '4px',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontWeight: 400,
        }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}
