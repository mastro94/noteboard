// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProd = process.env.NODE_ENV === 'production'

const buildTime = new Date().toISOString()
const commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || 'local'

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/noteboard/' : '/',
  build: {
    outDir: isProd ? 'docs' : 'dist',   // 👈 in prod scrive in docs/
    emptyOutDir: true,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __COMMIT_SHA__: JSON.stringify(commit.slice(0,7)),
  },
})
