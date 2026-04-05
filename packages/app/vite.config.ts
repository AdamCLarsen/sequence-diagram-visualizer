import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/sequence-diagram-visualizer/',
  root: '.',
  resolve: {
    alias: {
      '@seq-viz/core': path.resolve(__dirname, '../core/src'),
    },
  },
  build: {
    outDir: 'dist',
  },
})
