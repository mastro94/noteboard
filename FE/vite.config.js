// FE/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

const buildTime = new Date().toISOString()
const commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || 'local'

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/noteboard/' : '/',      // Pages serve sotto /noteboard/
  build: {
    // 👇 in produzione scriviamo nella cartella /docs alla RADICE del repo
    outDir: isProd ? resolve(__dirname, '../docs') : 'dist',
    emptyOutDir: true,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __COMMIT_SHA__: JSON.stringify(commit.slice(0,7)),
  },
})
