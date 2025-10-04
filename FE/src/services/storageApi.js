// FE/src/services/storageApi.js
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')

function authHeader() {
  const t = localStorage.getItem('nb_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : '/' + path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

export const storageApi = {
  mode: 'api',
  listTasks() { return http('/tasks') },
  createTask(payload) { return http('/tasks', { method:'POST', body: JSON.stringify(payload) }) },
  updateTask(id, payload) { return http(`/tasks/${id}`, { method:'PATCH', body: JSON.stringify(payload) }) },
  deleteTask(id) { return http(`/tasks/${id}`, { method:'DELETE' }) },
  me() { return http('/me') },
}
