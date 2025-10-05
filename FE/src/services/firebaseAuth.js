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
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
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
  return onAuthStateChanged(auth, cb)
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
