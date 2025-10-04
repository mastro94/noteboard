// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path.startsWith('/') ? path : '/' + path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  const isJson = ct.includes('application/json')
  if (!res.ok) {
    const txt = await (isJson ? res.json().catch(()=>null) : res.text().catch(()=>'')) || ''
    throw new Error(`${res.status} ${typeof txt === 'string' ? txt : JSON.stringify(txt)}`)
  }
  return isJson ? res.json() : res.text()
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
export async function exchangeFirebaseToken(idToken) {
  return http('/auth/firebase', { method: 'POST', body: { id_token: idToken } })
}

console.log('[Noteboard][auth] BASE =', BASE)
