import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH || '/';

  return {
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
          start_url: base,
          display: 'standalone',
          background_color: 'rgba(20, 20, 22, 1)',
          theme_color: 'rgba(20, 20, 22, 1)',
          icons: [
            {
              src: `${base}league-logos/NationalLogo.png`,
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: `${base}league-logos/NationalLogo.png`,
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    base,
  };
})