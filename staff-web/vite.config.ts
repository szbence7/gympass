import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Accept connections from any host (including *.gym.local, *.gymgo.hu)
    port: 5173,
    // Allow subdomains for tenant access (dev: *.gym.local, prod: *.gymgo.hu)
    allowedHosts: ['.gym.local', '.gympass.local', '.gymgo.hu'],
    // Proxy API requests to backend in dev (so relative /api/* works)
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
