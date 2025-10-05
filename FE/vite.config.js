// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev serviamo a base '/', in prod (GitHub Pages) serviamo sotto '/noteboard/'
const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/noteboard/' : '/',
})
