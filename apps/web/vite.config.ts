import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Cache PDF.js worker
        runtimeCaching: [
          {
            urlPattern: /.*\.pdf$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'pdf-cache', expiration: { maxEntries: 50 } },
          },
        ],
      },
      manifest: {
        name: 'MIRROR — Field Intelligence Platform',
        short_name: 'MIRROR',
        description: 'Hybrid Field Intelligence & Incident Assessment',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mirror/core': path.resolve(__dirname, '../../packages/core/src'),
      '@mirror/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@mirror/sync': path.resolve(__dirname, '../../packages/sync/src'),
      '@mirror/evidence': path.resolve(__dirname, '../../packages/evidence/src'),
    },
  },
});
