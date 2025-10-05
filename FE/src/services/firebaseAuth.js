// FE/src/services/firebaseAuth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, firebaseAvailable } from './firebase'

function ensureFirebase() {
  if (!firebaseAvailable || !auth) {
    throw new Error('Accesso con Firebase non disponibile: configura le variabili VITE_FIREBASE_* e rebuild.')
  }
}

export async function loginEmail(email, password) {
  ensureFirebase()
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signupEmail(email, password) {
  ensureFirebase()
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  try { await sendEmailVerification(user) } catch {}
  return user
}

export async function loginGoogle() {
  ensureFirebase()
  console.log('[FB] signInWithPopup Google')
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
  console.log('[FB] signInWithPopup OK', { uid: user.uid, email: user.email })
  return user
}

// Nome “nuovo” che avevo proposto
export async function requestPasswordReset(email) {
  ensureFirebase()
  return sendPasswordResetEmail(auth, email)
}

// Alias “vecchio” per compatibilità col tuo ResetPassword.jsx
export async function sendReset(email) {
  return requestPasswordReset(email)
}

export function watchAuth(cb) {
  ensureFirebase()
  console.log('[FB] onAuthStateChanged: registering listener')
  return onAuthStateChanged(auth, (u) => {
    console.log('[FB] onAuthStateChanged ->', u ? { uid: u.uid, email: u.email } : null)
    cb(u)
  })
}

export async function getFirebaseIdToken() {
  ensureFirebase()
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(true)
}

export async function logoutFirebase() {
  ensureFirebase()
  const { signOut } = await import('firebase/auth')
  return signOut(auth)
}

// Traduzione errori Firebase in messaggi umani
export function translateAuthError(err) {
  const code = (err?.code || '').replace('auth/', '')
  switch (code) {
    case 'invalid-credential':
    case 'wrong-password':
    case 'user-not-found':
      return 'Credenziali non valide. Controlla email e password.'
    case 'invalid-email':
      return 'Formato email non valido.'
    case 'too-many-requests':
      return 'Troppi tentativi. Riprova tra qualche minuto.'
    case 'network-request-failed':
      return 'Problema di rete. Controlla la connessione e riprova.'
    case 'popup-closed-by-user':
      return 'Accesso annullato: finestra chiusa prima del completamento.'
    case 'user-disabled':
      return 'Account disabilitato. Contatta il supporto.'
    case 'email-already-in-use':
      return 'Esiste già un account con questa email.'
    case 'weak-password':
      return 'Password troppo debole: usa almeno 9 caratteri, un numero e un simbolo.'
    case 'internal-error':
      return 'Si è verificato un errore temporaneo. Riprova.'
    default:
      // fallback minimale ma pulito
      return 'Operazione non riuscita. Riprova.'
  }
}

