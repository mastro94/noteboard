const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

function token() {
  return localStorage.getItem('nb_token') || ''
}

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const h = {
    'Content-Type': 'application/json',
    ...headers,
  }
  const t = token()
  if (t) h['Authorization'] = `Bearer ${t}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${txt}`)
  }
  // 204 delete
  if (res.status === 204) return null
  return res.json()
}

export const storageApi = {
  mode: 'api',

  async listTasks() {
    // il backend restituisce solo i task dell'utente del token
    return http('/tasks')
  },

  async createTask({ title, description, status = 'todo' }) {
    return http('/tasks', {
      method: 'POST',
      body: { title, description, status },
    })
  },

  async updateTask(id, patch) {
    return http(`/tasks/${id}`, {
      method: 'PATCH',
      body: patch,
    })
  },

  async deleteTask(id) {
    return http(`/tasks/${id}`, { method: 'DELETE' })
  },
}
