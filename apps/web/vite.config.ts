import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Dev proxy forwards API + health calls to the Express server so the browser
// talks to a single origin (no CORS in dev) and cookies "just work".
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'AbirOS — your personal AI OS',
        short_name: 'AbirOS',
        description: 'Your personal AI operating system for your digital life.',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell so it loads offline; never cache API responses.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/health/],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@abiros/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    // host: true exposes the dev server on your LAN so a phone on the same Wi-Fi
    // can open it at http://<your-PC-IP>:5173 (Vite prints the "Network:" URL).
    host: true,
    port: Number(process.env.WEB_PORT) || 5173,
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
      '/health': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
    },
  },
  // `vite preview` (production build) needs its own proxy so the installable
  // PWA can reach the API while you test it locally.
  preview: {
    host: true,
    port: Number(process.env.WEB_PORT) || 5173,
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
      '/health': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: true },
    },
  },
});
