// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

function buildUrl(path) {
  return BASE
    ? `${BASE}${path.startsWith('/') ? path : '/' + path}`
    : (path.startsWith('/') ? path : '/' + path)
}

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  const token = localStorage.getItem('nb_token')
  if (token) h['Authorization'] = `Bearer ${token}`

  const res = await fetch(buildUrl(path), {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${res.status} ${txt || res.statusText}`)
  }
  return res.json()
}

export async function login(identifier, password) {
  return http('/auth/login', { method: 'POST', body: { identifier, password } })
}

export async function register(payload) {
  return http('/auth/register', { method: 'POST', body: payload })
}

export async function me() {
  return http('/me')
}

console.log('[Noteboard][auth] BASE =', BASE)
