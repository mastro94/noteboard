const API_BASE = import.meta.env.VITE_API_BASE || ''

function getToken() {
  return localStorage.getItem('nb_token') || ''
}

async function fetchJSON(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const storageApi = {
  mode: 'api',

  me() {
    return fetchJSON('/me', { method: 'GET' })
  },

  // boards
  listBoards() {
    return fetchJSON('/boards', { method: 'GET' })
  },
  createBoard(payload) {
    return fetchJSON('/boards', { method: 'POST', body: JSON.stringify(payload) })
  },
  deleteBoard(boardId) {
    return fetchJSON(`/boards/${boardId}`, { method: 'DELETE' })
  },

  // ✅ ruolo utente su board (serve endpoint BE; vedi sotto)
  getMyBoardRole(boardId) {
    return fetchJSON(`/boards/${encodeURIComponent(boardId)}/my-role`, { method: 'GET' })
  },

  // tasks (BE: /tasks + board_id)
  listTasks(boardId) {
    return fetchJSON(`/tasks?board_id=${encodeURIComponent(boardId)}`, { method: 'GET' })
  },
  createTask(payload) {
    // BE prende board_id dal body
    return fetchJSON(`/tasks`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateTask(taskId, payload, boardId) {
    // BE richiede board_id in query o body (helper prende anche da body, ma qui usiamo query)
    return fetchJSON(
      `/tasks/${encodeURIComponent(taskId)}?board_id=${encodeURIComponent(boardId)}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    )
  },
  deleteTask(taskId, boardId) {
    return fetchJSON(`/tasks/${encodeURIComponent(taskId)}?board_id=${encodeURIComponent(boardId)}`, { method: 'DELETE' })
  },

  // tags (BE: /tags + board_id)
  listTags(boardId) {
    return fetchJSON(`/tags?board_id=${encodeURIComponent(boardId)}`, { method: 'GET' })
  },
  createTag(payload) {
    // BE prende board_id dal body
    return fetchJSON(`/tags`, { method: 'POST', body: JSON.stringify(payload) })
  },
  deleteTag(tagId, boardId) {
    return fetchJSON(`/tags/${encodeURIComponent(tagId)}?board_id=${encodeURIComponent(boardId)}`, { method: 'DELETE' })
  },

  // invites (già coerenti col BE)
  createInvite(boardId, payload) {
    return fetchJSON(`/boards/${boardId}/invites`, { method: 'POST', body: JSON.stringify(payload) })
  },
  previewInvite(token) {
    return fetchJSON(`/invites/${encodeURIComponent(token)}`, { method: 'GET' })
  },
  acceptInvite(token) {
    return fetchJSON(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' })
  },
}

export default storageApi
