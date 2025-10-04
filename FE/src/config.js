export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5173";
export const ENABLE_GOOGLE = String(import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN || "false") === "true";

export const FIREBASE_WEB_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};
