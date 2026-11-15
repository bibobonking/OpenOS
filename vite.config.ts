import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the built index.html works from file:// inside Electron.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})