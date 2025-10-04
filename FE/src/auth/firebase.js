import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FIREBASE_WEB_CONFIG } from "../config";

let app;
export function ensureFirebase() {
  if (!FIREBASE_WEB_CONFIG.apiKey) return null;
  if (!getApps().length) app = initializeApp(FIREBASE_WEB_CONFIG);
  return app;
}

export async function signInWithGoogleAndGetIdToken() {
  const appInstance = ensureFirebase();
  if (!appInstance) throw new Error("Firebase non configurato");
  const auth = getAuth(appInstance);
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const idToken = await res.user.getIdToken(); // <-- token Firebase che il BE sa verificare
  return { idToken, user: res.user };
}
