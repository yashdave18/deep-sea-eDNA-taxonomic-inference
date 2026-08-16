import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSample, getTaxaCalls, getAbundance, getNovelClusters } from '../lib/api'
import StatCard from '../components/StatCard'
import NovelPanel from '../components/NovelPanel'
import UmapScatter from '../charts/UmapScatter'
import AbundanceChart from '../charts/AbundanceChart'
import TaxonomyDonut from '../charts/TaxonomyDonut'

// ── Helpers ──────────────────────────────────────────────────────────────────

function taxonomyStr(taxonomy) {
  if (!taxonomy) return '—'
  if (typeof taxonomy === 'string') return taxonomy
  const keys = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']
  return keys.map(k => taxonomy[k]).filter(Boolean).join(' › ') || JSON.stringify(taxonomy)
}

function confidenceColor(c) {
  if (c == null) return 'var(--text-muted)'
  if (c > 0.8) return 'var(--accent-teal)'
  if (c > 0.5) return 'var(--accent-cyan)'
  return '#f59e0b'
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SampleResults() {
  const { sampleId } = useParams()

  const [sample, setSample] = useState(null)
  const [taxaCalls, setTaxaCalls] = useState(null)
  const [abundance, setAbundance] = useState(null)
  const [novelData, setNovelData] = useState(null)
  const [error, setError] = useState(null)

  const [selectedRead, setSelectedRead] = useState(null)
  const [novelOnly, setNovelOnly] = useState(false)
  const [sortField, setSortField] = useState('confidence')
  const [sortDir, setSortDir] = useState('desc')
  const [filterText, setFilterText] = useState('')

  // Fetch all data in parallel
  useEffect(() => {
    const run = async () => {
      try {
        const [s, tc, ab, nv] = await Promise.all([
          getSample(sampleId),
          getTaxaCalls(sampleId),
          getAbundance(sampleId),
          getNovelClusters(sampleId),
        ])
        setSample(s)
        setTaxaCalls(tc)
        setAbundance(ab)
        setNovelData(nv)
      } catch (err) {
        setError(err.message)
      }
    }
    run()
  }, [sampleId])

  // Derived summary stats
  const stats = useMemo(() => {
    if (!taxaCalls || !abundance) return null
    const total = taxaCalls.length
    const novelCount = taxaCalls.filter(r => r.is_novel).length
    const mostAbundant = abundance[0]?.taxon ?? '—'
    const mostAbundantAssigned = abundance
      .filter(a => a.taxon !== "UNASSIGNED / NOVEL")
      .sort((a, b) => b.relative_abundance_pct - a.relative_abundance_pct)[0] ?? null
    return { total, novelCount, mostAbundant, mostAbundantAssigned }
  }, [taxaCalls, abundance])

  // Table processing
  const tableRows = useMemo(() => {
    if (!taxaCalls) return []
    let rows = taxaCalls
    if (novelOnly) rows = rows.filter(r => r.is_novel)
    if (filterText) {
      const q = filterText.toLowerCase()
      rows = rows.filter(r =>
        r.read_id?.toLowerCase().includes(q) ||
        taxonomyStr(r.taxonomy).toLowerCase().includes(q) ||
        r.deepest_rank?.toLowerCase().includes(q)
      )
    }
    rows = [...rows].sort((a, b) => {
      let va = a[sortField] ?? ''
      let vb = b[sortField] ?? ''
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [taxaCalls, novelOnly, filterText, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function sortIcon(field) {
    if (sortField !== field) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const isLoading = !taxaCalls && !error

  return (
    <>
      <main className="container" style={{ padding: '32px 24px', minHeight: 'calc(100vh - 60px)' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent-cyan)' }}>← Dashboard</Link>
          {sample && <span> / {sample.name}</span>}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            marginBottom: '24px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="spinner-wrap" style={{ minHeight: '400px' }}>
            <div className="spinner" />
            <span>Loading sample data…</span>
          </div>
        )}

        {/* Content */}
        {taxaCalls && (
          <>
            {/* Page title */}
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', marginBottom: '4px' }}>
                {sample?.name ?? 'Sample Results'}
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sample ID: <span className="mono">{sampleId}</span>
              </p>
            </div>

            {/* ── SUMMARY STRIP ── */}
            {stats && (
              <Section title="Summary">
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <StatCard
                    label="Total Reads"
                    value={stats.total.toLocaleString()}
                    icon="🔬"
                    accent="var(--accent-cyan)"
                  />
                  <StatCard
                    label="Novel Candidates"
                    value={stats.novelCount.toLocaleString()}
                    icon="✨"
                    accent="#a78bfa"
                  />
                  <StatCard
                    label="Most Abundant Assigned Taxon"
                    value={stats.mostAbundantAssigned
                      ? stats.mostAbundantAssigned.taxon.split(">").pop().trim()
                      : "No known taxa dominant"}
                    icon="🧬"
                    accent="var(--accent-cyan)"
                    sublabel={stats.mostAbundantAssigned
                      ? `${stats.mostAbundantAssigned.relative_abundance_pct}% of reads`
                      : undefined}
                  />
                </div>
              </Section>
            )}

            {/* ── UMAP SCATTER ── */}
            <Section
              title="Novel Candidate Clusters (UMAP)"
              subtitle="Each point is a read classified as a novel species candidate. Color = HDBSCAN cluster. Click any point to inspect."
            >
              <div className="card" style={{
                padding: '16px',
                height: '480px',
                position: 'relative',
              }}>
                {novelData !== null ? (
                  <UmapScatter data={novelData} onSelect={setSelectedRead} />
                ) : (
                  <div className="spinner-wrap"><div className="spinner" /></div>
                )}
              </div>
            </Section>

            {/* ── ABUNDANCE CHART ── */}
            <Section
              title="Taxonomic Abundance"
              subtitle="Top 20 taxa by relative abundance. Bar opacity reflects model confidence."
            >
              <div className="card" style={{
                padding: '16px',
                height: Math.max(300, Math.min(600, (abundance?.length ?? 10) * 26 + 80)) + 'px',
              }}>
                {abundance !== null ? (
                  <AbundanceChart data={abundance} />
                ) : (
                  <div className="spinner-wrap"><div className="spinner" /></div>
                )}
              </div>
            </Section>

            {/* ── TAXONOMY DONUT CHART ── */}
            <Section
              title="Taxonomy Summary"
              subtitle="Read count breakdown by top-level taxonomic group. Select a group to highlight."
            >
              <div className="card" style={{ padding: '16px' }}>
                <TaxonomyDonut taxaCalls={taxaCalls} />
              </div>
            </Section>

            {/* ── TAXA TABLE ── */}
            <Section
              title="All Reads"
              subtitle={`${tableRows.length} of ${taxaCalls.length} reads shown`}
            >
              {/* Controls */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <input
                  id="taxa-search"
                  type="text"
                  placeholder="Search read ID, taxon, rank…"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '200px',
                    padding: '8px 14px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  userSelect: 'none',
                }}>
                  <input
                    id="novel-only-toggle"
                    type="checkbox"
                    checked={novelOnly}
                    onChange={e => setNovelOnly(e.target.checked)}
                    style={{ accentColor: 'var(--accent-violet)' }}
                  />
                  Novel only
                </label>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('read_id')}>Read ID{sortIcon('read_id')}</th>
                      <th onClick={() => toggleSort('deepest_rank')}>Deepest Rank{sortIcon('deepest_rank')}</th>
                      <th>Taxonomy</th>
                      <th onClick={() => toggleSort('confidence')}>Confidence{sortIcon('confidence')}</th>
                      <th onClick={() => toggleSort('is_novel')}>Novel{sortIcon('is_novel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No reads match the current filters.
                        </td>
                      </tr>
                    )}
                    {tableRows.map(row => (
                      <tr
                        key={row.id}
                        onClick={() => row.is_novel && setSelectedRead(row)}
                        style={{ cursor: row.is_novel ? 'pointer' : 'default' }}
                        title={row.is_novel ? 'Click to inspect novel read' : ''}
                      >
                        <td className="mono" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.read_id}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {row.deepest_rank ?? '—'}
                        </td>
                        <td style={{
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          fontStyle: row.taxonomy ? 'italic' : 'normal',
                        }}>
                          {taxonomyStr(row.taxonomy)}
                        </td>
                        <td>
                          <span style={{
                            color: confidenceColor(row.confidence),
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}>
                            {row.confidence != null ? `${(row.confidence * 100).toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td>
                          {row.is_novel
                            ? <span className="badge badge-novel">Novel</span>
                            : <span className="badge badge-known">Known</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}
      </main>

      {/* Novel panel — slides in on selection */}
      <NovelPanel read={selectedRead} onClose={() => setSelectedRead(null)} />
    </>
  )
}
