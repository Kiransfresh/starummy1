import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // Only scan the real web entry. Capacitor keeps a compiled copy under
  // android/app/src/main/assets/public; Vite must not treat that generated
  // Android output as source during dependency discovery.
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    proxy: {
      '/fast2sms': {
        target: 'https://www.fast2sms.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fast2sms/, '')
      }
    }
  }
})