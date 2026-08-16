import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      // react-plotly.js internally imports 'plotly.js/dist/plotly'
      // Map it to the lighter dist-min bundle we have installed
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
    },
  },
})
