import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSamples, deleteSample } from '../lib/api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }) {
  if (!status || status === 'complete') {
    return <span className="badge badge-status-complete">● Complete</span>
  }
  if (status === 'processing') {
    return (
      <span className="badge badge-status-processing">
        <span className="badge-spinner" /> Processing
      </span>
    )
  }
  if (status === 'failed') {
    return <span className="badge badge-status-failed">✕ Failed</span>
  }
  return null
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={{ fontSize: '2rem', lineHeight: 1 }}>{icon}</div>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        margin: 0
      }}>
        {description}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const [samples, setSamples] = useState(null)
  const [error, setError] = useState(null)

  const refreshSamples = () => {
    getSamples()
      .then(setSamples)
      .catch(err => setError(err.message))
  }

  useEffect(() => {
    refreshSamples()
  }, [])

  // Compute platform stats from user's actual data
  const stats = useMemo(() => {
    if (!samples || samples.length === 0) {
      return { totalSequences: 0, totalSamples: 0, lastUpload: null }
    }
    const totalSequences = samples.reduce((sum, s) => sum + (s.read_count || 0), 0)
    const totalSamples = samples.length
    const lastUpload = samples[0]?.created_at || null
    return { totalSequences, totalSamples, lastUpload }
  }, [samples])

  return (
    <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>
      {/* Hero / Value Proposition Strip */}
      <div className="card" style={{
        padding: '32px 24px',
        marginBottom: '32px',
        background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 191, 165, 0.05) 100%)',
        border: '1px solid rgba(0, 229, 255, 0.2)'
      }}>
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-teal) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Explore deep-sea biodiversity with AI-powered eDNA classification
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '800px' }}>
          Upload FASTA sequences to classify reads, detect novel taxa, and compare biodiversity across samples — all in minutes.
        </p>
      </div>

      {/* Feature Highlight Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '40px'
      }}>
        <FeatureCard
          icon="🧬"
          title="Reference-Free Classification"
          description="Combines fine-tuned DNABERT-S embeddings with FAISS reference matching to classify reads without requiring exact database matches."
        />
        <FeatureCard
          icon="🔍"
          title="Novelty Detection"
          description="UMAP and HDBSCAN clustering flag reads that don't match any known reference, surfacing candidate novel taxa automatically."
        />
        <FeatureCard
          icon="📊"
          title="Confidence-Weighted Abundance"
          description="Relative abundance estimates are weighted by classification confidence, not just raw read counts, for more honest results."
        />
        <FeatureCard
          icon="🔗"
          title="Cross-Sample Comparison"
          description="Compare taxa distribution across multiple uploaded samples side by side in the heatmap view."
        />
      </div>

      {/* Platform Stats Strip */}
      {samples && samples.length > 0 && (
        <div className="card" style={{
          padding: '20px 24px',
          marginBottom: '32px',
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🧬</span>
            <div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-display)'
              }}>
                {stats.totalSequences.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sequences Classified
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🧫</span>
            <div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--accent-teal)',
                fontFamily: 'var(--font-display)'
              }}>
                {stats.totalSamples}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Samples Uploaded
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🕒</span>
            <div>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-display)'
              }}>
                {stats.lastUpload ? formatDate(stats.lastUpload).split(',')[0] : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Last Upload
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '8px' }}>
            Your Samples
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Select a sample to explore taxonomic classification results and novel species clusters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
          <Link
            to="/compare"
            id="compare-samples-btn"
            className="btn btn-primary"
            style={{ padding: '12px 22px', fontSize: '0.9rem' }}
          >
            <span>📊</span>
            <span>Compare Samples</span>
          </Link>
          <Link
            to="/upload"
            id="upload-sample-btn"
            className="btn btn-primary"
            style={{ padding: '12px 22px', fontSize: '0.9rem' }}
          >
            <span>+</span>
            <span>Upload Sample</span>
          </Link>
        </div>
      </div>

      {/* States */}
      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '24px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {samples === null && !error && (
        <div className="spinner-wrap" style={{ minHeight: '300px' }}>
          <div className="spinner" />
          <span>Loading samples…</span>
        </div>
      )}

      {samples !== null && samples.length === 0 && (
        <div className="empty-state">
          <div className="icon">🌊</div>
          <h3 style={{ color: 'var(--text-secondary)' }}>No samples yet</h3>
          <p style={{ maxWidth: '380px', fontSize: '0.85rem' }}>
            Upload your first FASTA file to run the eDNA classification pipeline and explore the results.
          </p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: '8px' }}>
            Upload Sample →
          </Link>
        </div>
      )}

      {samples !== null && samples.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {samples.map(sample => (
            <SampleCard key={sample.id} sample={sample} onDelete={refreshSamples} />
          ))}
        </div>
      )}
    </main>
  )
}

function SampleCard({ sample, onDelete }) {
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  const status = sample.status || 'complete'
  const isReady = status === 'complete'
  const isFailed = status === 'failed'

  const handleCardClick = () => {
    if (isReady) navigate(`/samples/${sample.id}`)
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete "${sample.name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteSample(sample.id)
      onDelete()
    } catch (err) {
      alert('Failed to delete sample: ' + err.message)
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`card sample-card${isReady ? ' sample-card-ready' : ''}${isFailed ? ' sample-card-failed' : ''}`}
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        opacity: isFailed ? 0.6 : 1,
        cursor: isReady ? 'pointer' : 'default',
      }}
      onClick={handleCardClick}
      role={isReady ? 'link' : undefined}
      tabIndex={isReady ? 0 : undefined}
      onKeyDown={e => e.key === 'Enter' && isReady && handleCardClick()}
      aria-label={isReady ? `View results for ${sample.name}` : undefined}
    >
      {/* Top row */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '1.4rem' }}>🧫</span>
          <h3 style={{
            color: isReady ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '1rem',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {sample.name}
          </h3>
          <StatusBadge status={status} />
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '4px',
              fontSize: '1.1rem',
              opacity: isDeleting ? 0.5 : 1,
              transition: 'all 200ms'
            }}
            title="Delete sample"
            onMouseEnter={e => e.target.style.color = '#f87171'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >
            {isDeleting ? '⏳' : '🗑️'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🕒</span>
            {formatDate(sample.created_at)}
          </div>
          {sample.read_count != null && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🔬</span>
              {sample.read_count.toLocaleString()} reads
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
          {sample.id}
        </div>
      </div>

      {/* Action */}
      {isReady ? (
        <div
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', pointerEvents: 'none' }}
          id={`view-sample-${sample.id}`}
        >
          View Results →
        </div>
      ) : status === 'processing' ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '12px',
          background: 'rgba(251, 191, 36, 0.06)',
          border: '1px solid rgba(251, 191, 36, 0.15)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          color: '#fbbf24',
          marginTop: 'auto',
        }}>
          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#fbbf24' }} />
          Running pipeline…
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          color: '#f87171',
          marginTop: 'auto',
        }}>
          Pipeline failed — check server logs
        </div>
      )}
    </div>
  )
}
