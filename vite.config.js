import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    include: ['qrcode.react', '@yudiel/react-qr-scanner', 'barcode-detector/ponyfill']
  },
  resolve: {
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
