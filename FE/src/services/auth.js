const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(`${res.status} ${text}`)
  }
  return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text()
}

export const authApi = {
  async register({ email, username, password, password2 }) {
    return http('/auth/register', { method: 'POST', body: JSON.stringify({ email, username, password, password2 }) })
  },
  async login({ identifier, password }) {
    return http('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) })
  },
  async me(token) {
    return http('/me', { headers: { Authorization: `Bearer ${token}` } })
  }
}
