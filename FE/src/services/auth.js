// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text().catch(()=>'')
    throw new Error(`${res.status} ${txt || res.statusText}`)
  }
  return res.json()
}

export async function exchangeFirebaseToken(id_token) {
  return http('/auth/firebase', { method: 'POST', body: { id_token } })
}

console.log('[Noteboard][auth] BASE =', BASE)
