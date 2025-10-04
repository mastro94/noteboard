// FE/src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

if (!cfg.apiKey) {
  console.warn('[Firebase] Config mancante: controlla i file .env.*')
}
console.log('[Firebase] cfg:', {
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  appId: cfg.appId,
  messagingSenderId: cfg.messagingSenderId,
})

export const app = initializeApp(cfg)
export const auth = getAuth(app)
