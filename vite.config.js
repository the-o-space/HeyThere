import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Required for libp2p in browser
    global: 'globalThis',
  },
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: ['libp2p', '@libp2p/webrtc', '@libp2p/websockets'],
  },
  server: {
    // Allow WebRTC connections in development
    https: false,
    host: true, // Allow external connections for mobile testing
  },
})
