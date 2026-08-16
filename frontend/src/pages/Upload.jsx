import { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { uploadSample } from '../lib/api'

const ALLOWED_EXTENSIONS = new Set(['.fasta', '.fa', '.fna'])
const ALLOWED_MIME = new Set([
  'application/octet-stream',
  'text/plain',
  'text/x-fasta',
  '',  // some systems report no MIME for FASTA
])

function getExt(filename) {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function validateFile(file) {
  const ext = getExt(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `"${file.name}" is not a FASTA file. Only .fasta, .fa, and .fna files are accepted.`
  }
  return null
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export default function Upload() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [sampleName, setSampleName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [clientError, setClientError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  function selectFile(selected) {
    setClientError(null)
    setServerError(null)
    const err = validateFile(selected)
    if (err) {
      setClientError(err)
      setFile(null)
      setSampleName('')
      return
    }
    setFile(selected)
    // Pre-fill sample name from filename, stripping extension
    const base = selected.name.replace(/\.(fasta|fa|fna)$/i, '')
    setSampleName(base)
  }

  // ── Drag & drop handlers ──────────────────────────────────────────────────

  const onDragOver = useCallback(e => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(e => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }, [])

  const onFileChange = e => {
    const selected = e.target.files[0]
    if (selected) selectFile(selected)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file || isUploading) return
    setServerError(null)
    setIsUploading(true)
    setElapsed(0)

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(s => s + 1)
    }, 1000)

    try {
      const result = await uploadSample(file, sampleName.trim() || file.name)
      clearInterval(timerRef.current)
      navigate(`/samples/${result.sample_id}`)
    } catch (err) {
      clearInterval(timerRef.current)
      setServerError(err.message)
      setIsUploading(false)
    }
  }

  const canSubmit = file && sampleName.trim() && !isUploading

  return (
    <main className="container" style={{ padding: '40px 24px', minHeight: 'calc(100vh - 60px)' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '28px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <Link to="/dashboard" style={{ color: 'var(--accent-cyan)' }}>← Dashboard</Link>
        <span> / Upload Sample</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '36px', maxWidth: '560px' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '10px' }}>
          Upload FASTA Sample
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>
          Drop a <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>.fasta</span>,{' '}
          <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>.fa</span>, or{' '}
          <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>.fna</span> file
          to run taxonomic classification and novelty detection on your eDNA reads.
          Results are stored and accessible from your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>

        {/* Drop zone */}
        <div
          id="fasta-dropzone"
          className={`dropzone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && !isUploading && fileInputRef.current?.click()}
          aria-label="File drop zone — click or drag a FASTA file here"
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.fna"
            onChange={onFileChange}
            style={{ display: 'none' }}
            disabled={isUploading}
            id="fasta-file-input"
          />

          {file ? (
            <div className="dropzone-file-info">
              <span className="dropzone-icon" aria-hidden>🧬</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </div>
              </div>
            </div>
          ) : (
            <div className="dropzone-empty">
              <span className="dropzone-icon" aria-hidden>📂</span>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Drag & drop your FASTA file here
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                or click to browse — accepts .fasta, .fa, .fna (max 10 MB)
              </div>
            </div>
          )}
        </div>

        {/* Client-side file validation error */}
        {clientError && (
          <div className="upload-error" style={{ marginTop: '12px' }}>
            ⚠️ {clientError}
          </div>
        )}

        {/* Sample name input */}
        {file && (
          <div style={{ marginTop: '24px' }}>
            <label
              htmlFor="sample-name-input"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              Sample Name
            </label>
            <input
              id="sample-name-input"
              type="text"
              value={sampleName}
              onChange={e => setSampleName(e.target.value)}
              placeholder="e.g. Ocean Station Alpha — Run 3"
              disabled={isUploading}
              maxLength={120}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color var(--transition)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--border-active)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }}
            />
          </div>
        )}

        {/* Server error */}
        {serverError && (
          <div className="upload-error" style={{ marginTop: '20px' }}>
            ⚠️ {serverError}
          </div>
        )}

        {/* Submit button */}
        <div style={{ marginTop: '28px' }}>
          <button
            id="upload-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: '0.95rem',
              padding: '14px 24px',
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isUploading ? (
              <>
                <span className="btn-spinner" />
                <span>Classifying reads… {formatElapsed(elapsed)}</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Run Classification Pipeline</span>
              </>
            )}
          </button>

          {isUploading && (
            <p style={{
              marginTop: '12px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              Embedding sequences · Querying taxonomy database · Clustering novel candidates…
            </p>
          )}
        </div>

        {/* Pipeline info */}
        <div style={{ marginTop: '32px' }}>
          <div style={{
            padding: '16px 20px',
            background: 'rgba(0, 229, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}>
            <strong style={{ color: 'var(--text-secondary)' }}>How it works</strong>
            <ol style={{ marginTop: '8px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Sequences are embedded with a fine-tuned DNABERT-S model</li>
              <li>Each read is matched against a PR2 reference database via FAISS k-NN</li>
              <li>Novel candidates are clustered with HDBSCAN and visualised with UMAP</li>
              <li>Abundance and taxonomy tables are computed and stored</li>
            </ol>
          </div>
        </div>

      </form>
    </main>
  )
}
