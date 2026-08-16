import { useMemo, useState } from 'react'
import Plot from 'react-plotly.js'

export default function TaxonomyDonut({ taxaCalls }) {
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Group taxa by top-level taxonomic rank (domain/supergroup)
  const { groups, totalReads } = useMemo(() => {
    if (!taxaCalls || taxaCalls.length === 0) {
      return { groups: [], totalReads: 0 }
    }

    const groupCounts = {}
    let total = 0

    for (const call of taxaCalls) {
      total++
      if (!call.taxonomy || Object.keys(call.taxonomy).length === 0) {
        groupCounts['Unknown'] = (groupCounts['Unknown'] || 0) + 1
      } else {
        // Get the first taxonomic level (domain or similar)
        const firstKey = Object.keys(call.taxonomy)[0]
        const groupName = call.taxonomy[firstKey] || 'Unknown'
        groupCounts[groupName] = (groupCounts[groupName] || 0) + 1
      }
    }

    const groups = Object.entries(groupCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)

    return { groups, totalReads: total }
  }, [taxaCalls])

  if (!taxaCalls || taxaCalls.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        color: 'var(--text-muted)',
        fontSize: '0.9rem'
      }}>
        No taxonomy data available
      </div>
    )
  }

  // Colors for the donut chart - using cyan/teal theme
  const colors = [
    '#00e5ff', // accent-cyan
    '#14b8a6', // accent-teal
    '#0ea5e9', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#6366f1', // indigo
  ]

  // Prepare data for Plotly
  const labels = groups.map(g => g.name)
  const values = groups.map(g => g.count)
  const displayColors = groups.map((_, i) => colors[i % colors.length])

  // Calculate pull (explode) effect for selected group
  const pull = groups.map(g => 
    selectedGroup && g.name === selectedGroup ? 0.1 : 0
  )

  // Calculate opacity for non-selected groups
  const markerColors = groups.map((g, i) => {
    if (!selectedGroup) return displayColors[i]
    return g.name === selectedGroup ? displayColors[i] : `${displayColors[i]}40`
  })

  const data = [{
    type: 'pie',
    labels,
    values,
    marker: {
      colors: markerColors,
      line: {
        color: 'var(--bg-elevated)',
        width: 2
      }
    },
    textinfo: 'label+percent',
    textposition: 'outside',
    pull,
    hole: 0.6,
    showlegend: false,
    hoverinfo: 'label+percent+value'
  }]

  const layout = {
    margin: { t: 0, b: 0, l: 0, r: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: '#ffffff',
      size: 12,
      family: 'system-ui, sans-serif'
    },
    autosize: true
  }

  const config = {
    responsive: true,
    displayModeBar: false
  }

  return (
    <div>
      {/* Header with dropdown */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Taxonomy Distribution
        </div>
        <select
          value={selectedGroup || ''}
          onChange={(e) => setSelectedGroup(e.target.value || null)}
          style={{
            padding: '6px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Groups</option>
          {groups.map(group => (
            <option key={group.name} value={group.name}>
              {group.name} ({group.percentage.toFixed(1)}%)
            </option>
          ))}
        </select>
      </div>

      {/* Donut chart with center label */}
      <div style={{ position: 'relative', height: '300px' }}>
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler
        />
        
        {/* Center label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)'
          }}>
            {totalReads}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '4px'
          }}>
            Sequences
          </div>
        </div>
      </div>
    </div>
  )
}
