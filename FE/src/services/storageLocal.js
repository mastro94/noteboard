// Adapter locale: nessuna chiamata HTTP. Lo stato rimane nel FE (useLocalStorage in App).
// Restituisce strutturalmente lo stesso formato dello storage API.
export const storageLocal = {
  mode: "local",
  async listTasks() {
    return []; // App gestisce lo stato locale: qui non serve restituire i dati salvati
  },
  async createTask(payload) {
    // App genera l'oggetto, ma per compat restituimo un eco con id fittizio se serve
    return { id: crypto.randomUUID ? crypto.randomUUID() : Date.now(), ...payload };
  },
  async updateTask(id, payload) {
    return { id, ...payload };
  },
  async deleteTask() {
    return true;
  },
  async reorderColumn() {
    return { ok: true };
  },
};
