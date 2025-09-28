// Adapter REST per backend Flask su PythonAnywhere
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');        // es. https://<user>.pythonanywhere.com
const API_KEY  = import.meta.env.VITE_API_KEY;           // stessa chiave del backend
const headers  = {
  "Content-Type": "application/json",
  "X-API-KEY": API_KEY || "",
};

function authHeader(){
  const t = localStorage.getItem('nb_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function http(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers||{}) },
    ...opts
  })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(`${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

export const storageApi = {
  mode: "api",
  listTasks(){ return http('/tasks') },
  createTask(payload){ return http('/tasks', { method:'POST', body: JSON.stringify(payload) }) },
  updateTask(id, payload){ return http(`/tasks/${id}`, { method:'PATCH', body: JSON.stringify(payload) }) },
  deleteTask(id){ return http(`/tasks/${id}`, { method:'DELETE' }) },
  reorderColumn(status, orderedIds){ return http('/tasks/reorder', { method:'POST', body: JSON.stringify({ status, ordered_ids: orderedIds }) }) }
};
