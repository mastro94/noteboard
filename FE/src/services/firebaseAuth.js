// FE/src/services/firebaseAuth.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'
import { exchangeFirebaseToken } from './auth'

export async function signupEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

// Restituisce una funzione per disiscriversi
export function watchAuth(onChange) {
  return onAuthStateChanged(auth, onChange)
}

// Utility per ottenere l'idToken dell'utente Firebase corrente
export async function getFirebaseIdToken() {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(/* forceRefresh */ true)
}

// Logout Firebase (solo client)
export async function logoutFirebase() {
  const { signOut } = await import('firebase/auth')
  return signOut(auth)
}
