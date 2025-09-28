// Adapter REST per backend Flask su PythonAnywhere
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');        // es. https://<user>.pythonanywhere.com
const API_KEY  = import.meta.env.VITE_API_KEY;           // stessa chiave del backend
const headers  = {
  "Content-Type": "application/json",
  "X-API-KEY": API_KEY || "",
};

async function http(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, { headers, ...opts });
  if (!res.ok) {
    const text = await res.text().catch(()=> "");
    console.error("[Noteboard] API error", res.status, path, text);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

export const storageApi = {
  mode: "api",
  async listTasks() {
    return http("/tasks", { method: "GET" });
  },
  async createTask(payload) {
    return http("/tasks", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateTask(id, payload) {
    return http(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  async deleteTask(id) {
    await http(`/tasks/${id}`, { method: "DELETE" });
    return true;
  },
  async reorderColumn(status, orderedIds) {
    return http("/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ status, ordered_ids: orderedIds }),
    });
  },
};
