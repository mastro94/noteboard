import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

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
