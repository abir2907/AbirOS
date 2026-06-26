import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Dev proxy forwards API + health calls to the Express server so the browser
// talks to a single origin (no CORS in dev) and cookies "just work".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@abiros/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT) || 5173,
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
      '/health': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
    },
  },
});
