// FE/src/services/firebaseAuth.js
import { auth } from './firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'

export async function signupEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function sendVerificationEmail(user) {
  const u = user || auth.currentUser
  if (!u) throw new Error('No user to verify')
  return sendEmailVerification(u)
}

export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function loginGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb)
}

export async function getFirebaseIdToken(user) {
  const u = user || auth.currentUser
  return u?.getIdToken(true)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export async function logoutFirebase() {
  return signOut(auth)
}
