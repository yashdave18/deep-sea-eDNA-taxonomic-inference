import Plot from 'react-plotly.js'

/**
 * UMAP scatter plot of novel-candidate reads.
 * Props:
 *   data    — array of novel cluster objects from /pipeline/novel/:id
 *   onSelect — callback(read) when a point is clicked
 */
export default function UmapScatter({ data, onSelect }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '360px' }}>
        <div className="icon">🔬</div>
        <p>No novel candidates detected in this sample.</p>
      </div>
    )
  }

  // Group by cluster for coloring
  const clusters = [...new Set(data.map(d => d.embedding_cluster_id))]
  const palette = [
    '#00e5ff', '#a78bfa', '#00bfa5', '#f59e0b', '#fb7185',
    '#34d399', '#60a5fa', '#e879f9', '#fbbf24', '#4ade80',
  ]

  const traces = clusters.map((clusterId, idx) => {
    const points = data.filter(d => d.embedding_cluster_id === clusterId)
    return {
      type: 'scatter',
      mode: 'markers',
      name: clusterId === -1 ? 'Noise' : `Cluster ${clusterId}`,
      x: points.map(p => p.umap_x),
      y: points.map(p => p.umap_y),
      text: points.map(p => {
        const lineage = p.nearest_known_relative
        const lineageStr = lineage && typeof lineage === 'object'
          ? Object.values(lineage).filter(Boolean).join(' › ')
          : 'Unknown'
        return `<b>${p.read_id}</b><br>Nearest: ${lineageStr}<br>Confidence: ${p.confidence != null ? (p.confidence * 100).toFixed(1) + '%' : 'N/A'}<br>Rank: ${p.deepest_rank || 'N/A'}`
      }),
      hovertemplate: '%{text}<extra></extra>',
      customdata: points,
      marker: {
        color: clusterId === -1 ? '#3d6478' : palette[idx % palette.length],
        size: 8,
        opacity: 0.85,
        line: { color: 'rgba(2,13,24,0.6)', width: 0.5 },
      },
    }
  })

  function handleClick(event) {
    if (!event.points || event.points.length === 0) return
    const pt = event.points[0]
    onSelect?.(pt.customdata)
  }

  return (
    <Plot
      data={traces}
      layout={{
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'rgba(7,24,40,0.6)',
        font: { family: 'Inter, sans-serif', color: '#7da9bf', size: 11 },
        xaxis: {
          title: 'UMAP 1',
          gridcolor: 'rgba(0,229,255,0.06)',
          zerolinecolor: 'rgba(0,229,255,0.1)',
          tickfont: { color: '#3d6478' },
        },
        yaxis: {
          title: 'UMAP 2',
          gridcolor: 'rgba(0,229,255,0.06)',
          zerolinecolor: 'rgba(0,229,255,0.1)',
          tickfont: { color: '#3d6478' },
        },
        legend: {
          font: { color: '#7da9bf', size: 11 },
          bgcolor: 'rgba(7,24,40,0.8)',
          bordercolor: 'rgba(0,229,255,0.12)',
          borderwidth: 1,
        },
        hoverlabel: {
          bgcolor: '#071828',
          bordercolor: '#00e5ff',
          font: { color: '#e8f4f8', size: 12 },
        },
        margin: { t: 10, b: 50, l: 50, r: 10 },
        dragmode: 'pan',
      }}
      config={{
        displayModeBar: true,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
        displaylogo: false,
        responsive: true,
        scrollZoom: true,
      }}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )
}
