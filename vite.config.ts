import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Fantasy Football Union',
        short_name: 'FFU',
        start_url: '/ffu-app/',
        display: 'standalone',
        background_color: '#f9fafb',
        theme_color: '#2563eb',
        icons: [
          {
            src: '/ffu-app/league-logos/NationalLogo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/ffu-app/league-logos/NationalLogo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: command === 'build' ? '/ffu-app/' : '/',
}))