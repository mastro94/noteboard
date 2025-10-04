// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${res.status} ${txt || res.statusText}`)
  }
  return res.json()
}

export const authApi = {
  register({ email, username, password, password2 }) {
    // legacy: non usato se passi da Firebase, ma lo lasciamo
    return http('/auth/register', { method: 'POST', body: { email, username, password, password2 } })
  },
  login({ identifier, password }) {
    // legacy: non usato se passi da Firebase
    return http('/auth/login', { method: 'POST', body: { identifier, password } })
  },
  me(token) {
    return http('/me', { headers: { Authorization: `Bearer ${token}` } })
  },
}

// 🔄 Scambio idToken Firebase → JWT Noteboard
export async function exchangeFirebaseToken(id_token) {
  return http('/auth/firebase', { method: 'POST', body: { id_token } })
}

console.log('[Noteboard][auth] BASE =', BASE)
