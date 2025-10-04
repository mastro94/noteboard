// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  const token = localStorage.getItem('nb_token')
  if (token) h['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text().catch(()=>res.statusText)}`)
  }
  return res.json()
}

// Scambia id_token Firebase con JWT del backend
export async function exchangeFirebaseToken(idToken) {
  return http('/auth/firebase', { method: 'POST', body: { id_token: idToken } })
}

// Profilo utente dal BE
export async function getMe() {
  return http('/me')
}
