import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Accept connections from any host (including *.gym.local)
    port: 5173,
    allowedHosts: ['.gym.local'], // Allow all *.gym.local subdomains
    // Proxy API requests to backend in dev (so relative /api/* works)
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
