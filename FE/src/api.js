import { API_BASE } from "./config";

export async function apiLoginEmailPassword(identifier, password) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Login fallito: ${r.status} ${txt || r.statusText}`);
  }
  return r.json();
}

export async function apiLoginWithFirebaseIdToken(id_token) {
  const r = await fetch(`${API_BASE}/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Firebase exchange fallito: ${r.status} ${txt || r.statusText}`);
  }
  return r.json();
}
