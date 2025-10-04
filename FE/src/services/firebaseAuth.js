// FE/src/services/firebaseAuth.js
import { auth } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth'

// Login email/password
export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

// Login con Google
export async function loginGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

// **Signup email/password** (questa mancava!)
export async function signupEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

// (opzionale) invio email di verifica all'utente loggato
export async function sendVerificationEmail(user) {
  const u = user || auth.currentUser
  if (!u) throw new Error('Nessun utente autenticato')
  return sendEmailVerification(u)
}

// Reset password
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

// Logout Firebase
export async function logoutFirebase() {
  return signOut(auth)
}

// Watcher auth → callback(fbUser) su ogni variazione
export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb)
}

// Ottieni l'ID token Firebase per lo scambio col BE
export async function getFirebaseIdToken(user) {
  const u = user || auth.currentUser
  if (!u) return null
  return u.getIdToken(true) // force refresh
}
