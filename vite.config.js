/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      injectManifest: {
        // O motor 3D e o LiveKit são carregados estritamente sob demanda;
        // não devem aumentar o download inicial nem o precache das demais experiências.
        globIgnores: ['**/three-vendor-*.js', '**/three.module-*.js', '**/livekit-vendor-*.js'],
      },
      includeAssets: ['brand/favicon-64.png', 'icons.svg'],
      manifest: {
        name: mode === 'provisional' ? 'Comunhão | Versão provisória' : 'Comunhão | Oração Constante',
        short_name: 'Comunhão',
        description: 'App de intercessão para grupos de mocidade — Círculo de Oração, mural de pedidos e ranking de intercessão.',
        theme_color: '#0e1310',
        background_color: '#0e1310',
        display: 'standalone',
        lang: 'pt-BR',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/livekit-client')) {
            return 'livekit-vendor';
          }
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 750,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    css: true,
  },
}))

