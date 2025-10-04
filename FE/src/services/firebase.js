// FE/src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const cfgFromEnv = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
}

// Fallback opzionale (runtime) se mai servisse in futuro:
const cfgFromWindow = (typeof window !== 'undefined' && window.__FB_CONFIG__) || {}
const firebaseConfig = { ...cfgFromEnv, ...cfgFromWindow }

// Debug "sicuro": non stampo apiKey intera
console.log('[Firebase] cfg:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 6) + '…' : undefined,
})

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
