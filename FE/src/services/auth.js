// FE/src/services/auth.js
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`
  console.debug('[HTTP→]', method, url, { body, headers })

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(err => {
    console.error('[HTTP×] network error', method, url, err)
    throw err
  })

  console.debug('[HTTP←]', res.status, res.statusText, res.url)
  const ct = res.headers.get('content-type') || ''
  const isJson = ct.includes('application/json')
  if (!res.ok) {
    const payload = await (isJson ? res.json().catch(() => null) : res.text().catch(() => ''))
    console.error('[HTTP!] error payload:', payload)
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload || {})
    throw new Error(`${res.status} ${msg}`)
  }
  const payload = isJson ? await res.json() : await res.text()
  console.debug('[HTTP✓] payload:', payload)
  return payload
}



export const authApi = {
  register({ email, username, password, password2 }) {
    return http('/auth/register', { method: 'POST', body: { email, username, password, password2 } })
  },
  login({ identifier, password }) {
    return http('/auth/login', { method: 'POST', body: { identifier, password } })
  },
  me(token) {
    return http('/me', { headers: { Authorization: `Bearer ${token}` } })
  },
}

export async function exchangeFirebaseToken(idToken) {
  return http('/auth/firebase', { method: 'POST', body: { id_token: idToken } })
}

console.log('[Noteboard][auth] API_BASE =', BASE)
