import { storageApi } from './storageApi'
import { storageLocal } from './storageLocal'

const mode = (import.meta.env.VITE_MODE || 'local').toLowerCase()
export const storage = mode === 'api' ? storageApi : storageLocal
export const isAPI = storage.mode === 'api'

// 🔎 LOG CONFIG
console.log(
  '[Noteboard] VITE_MODE =', mode,
  '→ isAPI =', isAPI,
  'API_BASE =', import.meta.env.VITE_API_BASE
)
