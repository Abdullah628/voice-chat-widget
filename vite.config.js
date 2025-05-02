import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // 👈 allows LAN access
    port: 5173, // or any port you want
    allowedHosts: ['4f71-59-153-102-62.ngrok-free.app']
  }
})
