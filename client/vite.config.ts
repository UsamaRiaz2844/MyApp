import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project repo at https://<user>.github.io/<repo>/,
// so the app is hosted under this sub-path. Change it if you rename the repo
// or move to a custom domain (then use '/').
const BASE = '/MyApp/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-512-maskable.png',
        'icons/favicon-64.png',
      ],
      manifest: {
        id: BASE,
        name: 'Pronto - Chat',
        short_name: 'Pronto',
        description: 'Simple, fast one-to-one chat. Be there. Be Pronto.',
        theme_color: '#6366f1',
        background_color: '#0b0c10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['.loca.lt', '.trycloudflare.com'],
  },
});
