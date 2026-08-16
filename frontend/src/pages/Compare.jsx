import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { compareSamples } from '../lib/api'

export default function Compare() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    compareSamples()
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  if (error) {
    return (
      <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
        }}>
          ⚠️ {error}
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>
        <div className="spinner-wrap" style={{ minHeight: '400px' }}>
          <div className="spinner" />
          <span>Loading comparison data…</span>
        </div>
      </main>
    )
  }

  if (data.samples.length < 2) {
    return (
      <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent-cyan)' }}>← Dashboard</Link>
          <span> / Compare Samples</span>
        </div>

        <div className="empty-state">
          <div className="icon">📊</div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Not enough samples to compare</h3>
          <p style={{ maxWidth: '380px', fontSize: '0.85rem' }}>
            Upload at least 2 samples to compare taxa across sites.
          </p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: '8px' }}>
            Upload Sample →
          </Link>
        </div>
      </main>
    )
  }

  // Find max abundance for color scaling
  const maxAbundance = Math.max(
    ...data.taxa.flatMap(t => Object.values(t.values || {}))
  )

  return (
    <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <Link to="/dashboard" style={{ color: 'var(--accent-cyan)' }}>← Dashboard</Link>
        <span> / Compare Samples</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '8px' }}>
          Cross-Sample Taxa Comparison
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Relative abundance of top taxa across your most recent samples. Darker cells = higher abundance.
        </p>
      </div>

      {/* Heatmap */}
      <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ 
                padding: '12px 16px', 
                textAlign: 'left', 
                color: 'var(--text-muted)', 
                fontSize: '0.8rem',
                fontWeight: 500,
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                Taxon
              </th>
              {data.samples.map(sample => (
                <th key={sample.code} style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderBottom: '1px solid var(--border-subtle)',
                  minWidth: '80px'
                }}>
                  <div title={sample.name}>{sample.code}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.taxa.map((taxonRow, idx) => (
              <tr key={idx}>
                <td style={{ 
                  padding: '12px 16px', 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {taxonRow.taxon}
                </td>
                {data.samples.map(sample => {
                  const abundance = taxonRow.values?.[sample.code] || 0
                  const opacity = abundance > 0 ? 0.1 + (abundance / maxAbundance) * 0.9 : 0
                  return (
                    <td key={sample.code} style={{ 
                      padding: '12px 16px', 
                      textAlign: 'center',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      {abundance > 0 ? (
                        <div style={{
                          background: `rgba(0, 229, 255, ${opacity})`,
                          color: 'var(--text-primary)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          minWidth: '60px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>
                          {abundance.toFixed(1)}%
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sample legend */}
      <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <strong>Sample codes:</strong>
        {data.samples.map((sample, idx) => (
          <span key={sample.id} style={{ marginLeft: idx === 0 ? '8px' : '16px' }}>
            <span style={{ 
              background: 'var(--bg-elevated)', 
              padding: '4px 8px', 
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace'
            }}>{sample.code}</span>
            = {sample.name}
          </span>
        ))}
      </div>
    </main>
  )
}
