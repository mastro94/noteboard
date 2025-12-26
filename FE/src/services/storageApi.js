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

  // --- BOARDS ---
  listBoards() { return http('/boards') },
  createBoard(payload) { return http('/boards', { method: 'POST', body: JSON.stringify(payload) }) },
  deleteBoard(id) { return http(`/boards/${id}`, { method: 'DELETE' }) },

  // --- INVITES ---
  createInvite(boardId, { email, role = 'editor' }) {
    return http(`/boards/${boardId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
  },

  previewInvite(token) {
    return http(`/invites/${encodeURIComponent(token)}`)
  },

  acceptInvite(token) {
    return http(`/invites/${encodeURIComponent(token)}`, {
      method: 'POST',
    })
  },

  // --- TASKS ---
  listTasks(boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tasks${q}`)
  },
  createTask(payload) { return http('/tasks', { method:'POST', body: JSON.stringify(payload) }) },
  updateTask(id, payload, boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tasks/${id}${q}`, { method:'PATCH', body: JSON.stringify(payload) })
  },
  deleteTask(id, boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tasks/${id}${q}`, { method:'DELETE' })
  },

  // --- TAGS ---
  listTags(boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tags${q}`)
  },
  createTag(payload) { return http('/tags', { method:'POST', body: JSON.stringify(payload) }) },
  updateTag(id, payload, boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tags/${id}${q}`, { method:'PATCH', body: JSON.stringify(payload) })
  },
  deleteTag(id, boardId) {
    const q = boardId ? `?board_id=${encodeURIComponent(boardId)}` : ''
    return http(`/tags/${id}${q}`, { method:'DELETE' })
  },

  // --- USER ---
  me() { return http('/me') },
}
