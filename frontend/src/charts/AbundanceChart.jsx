import Plot from 'react-plotly.js'

/**
 * Horizontal bar chart of taxa abundance.
 * Props:
 *   data — array from /pipeline/abundance/:id, sorted by relative_abundance_pct desc
 */
export default function AbundanceChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '300px' }}>
        <div className="icon">📊</div>
        <p>No abundance data available.</p>
      </div>
    )
  }

  // Show top 20 max to keep chart readable
  const items = data.slice(0, 20)

  // Confidence mapped to opacity (0.4 – 1.0)
  const opacities = items.map(d => {
    const c = d.avg_confidence != null ? d.avg_confidence : 0.8
    return Math.max(0.35, Math.min(1, c))
  })

  const colors = items.map((_, i) => {
    const hue = 190 + i * 6
    return `hsl(${hue}, 85%, 58%)`
  })

  return (
    <Plot
      data={[{
        type: 'bar',
        orientation: 'h',
        y: items.map(d => d.taxon),
        x: items.map(d => d.relative_abundance_pct),
        text: items.map(d =>
          `${d.relative_abundance_pct?.toFixed(2)}%  (conf: ${d.avg_confidence != null ? (d.avg_confidence * 100).toFixed(0) + '%' : '?'})`
        ),
        hovertemplate: '<b>%{y}</b><br>Abundance: %{x:.2f}%<br>%{text}<extra></extra>',
        marker: {
          color: colors,
          opacity: opacities,
          line: { color: 'rgba(0,229,255,0.15)', width: 0.5 },
        },
        textposition: 'none',
      }]}
      layout={{
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'rgba(7,24,40,0.6)',
        font: { family: 'Inter, sans-serif', color: '#7da9bf', size: 11 },
        xaxis: {
          title: 'Relative Abundance (%)',
          gridcolor: 'rgba(0,229,255,0.06)',
          zerolinecolor: 'rgba(0,229,255,0.1)',
          tickfont: { color: '#3d6478' },
          ticksuffix: '%',
        },
        yaxis: {
          automargin: true,
          tickfont: { color: '#e8f4f8', size: 10 },
          gridcolor: 'rgba(0,229,255,0.04)',
        },
        hoverlabel: {
          bgcolor: '#071828',
          bordercolor: '#00e5ff',
          font: { color: '#e8f4f8', size: 12 },
        },
        margin: { t: 10, b: 50, l: 180, r: 20 },
        bargap: 0.3,
      }}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )
}
