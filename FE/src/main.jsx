import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// 🔎 BOOT INFO (build/env/router)
console.log('[BOOT] MODE=', import.meta.env.MODE, 'BASE_URL=', import.meta.env.BASE_URL)
console.log('[BOOT] VITE_API_BASE=', import.meta.env.VITE_API_BASE)
console.log('[BOOT] VITE_FIREBASE_PROJECT_ID=', import.meta.env.VITE_FIREBASE_PROJECT_ID)
console.log('[BOOT] location=', window.location.href)
console.log('[BUILD] time=', (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'n/a'),
            'commit=', (typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : 'n/a'))

// 🔎 BOOTSTRAP LOG + catcher errori
console.log('[Noteboard] client bootstrap')
window.addEventListener('error', e =>
  console.error('[Noteboard] window error:', e?.error || e?.message || e)
)
window.addEventListener('unhandledrejection', e =>
  console.error('[Noteboard] unhandledrejection:', e?.reason || e)
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
