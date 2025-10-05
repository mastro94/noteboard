// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev serviamo a base '/', in prod (GitHub Pages) serviamo sotto '/noteboard/'
const isProd = process.env.NODE_ENV === 'production'

// metadata di build che userai nei log
const buildTime = new Date().toISOString()
const commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || 'local'

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/noteboard/' : '/',
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __COMMIT_SHA__: JSON.stringify(commit.slice(0, 7)),
  },
})
