// FE/src/services/firebase.js
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

// Inizializza Firebase SOLO se la config è completa
let app = null
if (cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId) {
  if (!getApps().length) app = initializeApp(cfg)
} else {
  console.warn('[Firebase] Config mancante: il bottone Google verrà nascosto.')
}

export const firebaseAvailable = !!app
export const auth = firebaseAvailable ? getAuth(app) : null
