import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  // Dev and Playwright run concurrently; their optimizers must not overwrite
  // each other's React chunks while a browser still holds the previous graph.
  cacheDir: path.resolve(import.meta.dirname, 'node_modules/.vite', mode),
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    include: ['qrcode.react', '@yudiel/react-qr-scanner', 'barcode-detector/ponyfill']
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '~', replacement: path.resolve(import.meta.dirname, './src') }
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://localhost:5000',
        rewrite: (url) => url.replace(/^\/api/, ''),
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  }
}))
