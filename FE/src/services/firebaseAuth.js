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
import { auth } from './firebase'

export async function loginEmail(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signupEmail(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  // invia email di verifica (opzionale ma consigliato)
  try { await sendEmailVerification(user) } catch {}
  return user
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  return user
}

export async function sendReset(email) {
  await sendPasswordResetEmail(auth, email)
}

export function watchAuth(cb) {
  // cb(user|null) ad ogni variazione
  return onAuthStateChanged(auth, cb)
}

export async function getFirebaseIdToken() {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken(/* forceRefresh */ true)
}

export async function logoutFirebase() {
  const { signOut } = await import('firebase/auth')
  return signOut(auth)
}
