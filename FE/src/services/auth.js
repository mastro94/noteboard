// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function http(path, { method='GET', body, headers={} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(()=> '')
    throw new Error(`${res.status} ${txt || res.statusText}`)
  }
  return res.json()
}

// Scambia ID token Firebase con il JWT del tuo BE
export async function exchangeFirebaseToken(id_token) {
  return http('/auth/firebase', { method: 'POST', body: { id_token } })
}

// (opzionale) se vuoi ancora il login legacy, LASCIALO ma NON usarlo nel Login.jsx
export async function loginLegacy(identifier, password) {
  return http('/auth/login', { method: 'POST', body: { identifier, password } })
}
