import React, { useState, useMemo } from "react";
import { apiLoginEmailPassword, apiLoginWithFirebaseIdToken } from "../api";
import { ENABLE_GOOGLE } from "../config";
import { signInWithGoogleAndGetIdToken, ensureFirebase } from "../auth/firebase";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const googleAvailable = useMemo(() => {
    try {
      if (!ENABLE_GOOGLE) return false;
      return !!ensureFirebase();
    } catch {
      return false;
    }
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLoginEmailPassword(identifier, password);
      // salva token dove già lo gestisci (localStorage / context)
      localStorage.setItem("nb_token", data.token);
      // redirect alla tua home / board
      window.location.href = "/noteboard/#/boards";
    } catch (err) {
      setError(err.message || "Errore di login");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError("");
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogleAndGetIdToken();
      const data = await apiLoginWithFirebaseIdToken(idToken);
      localStorage.setItem("nb_token", data.token);
      window.location.href = "/noteboard/#/boards";
    } catch (err) {
      setError(err.message || "Errore accesso con Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth: 420, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 12}}>
      <h2>Accedi a Noteboard</h2>

      <form onSubmit={onSubmit} style={{display: "grid", gap: 12}}>
        <label>
          Email o username
          <input
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            required
            placeholder="email o username"
            autoComplete="username"
            style={{width: "100%"}}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="password"
            autoComplete="current-password"
            style={{width: "100%"}}
          />
        </label>

        <button disabled={loading} type="submit">
          {loading ? "Accesso..." : "Accedi"}
        </button>
      </form>

      {googleAvailable && (
        <>
          <div style={{textAlign:"center", margin:"12px 0"}}>— oppure —</div>
          <button disabled={loading} onClick={onGoogle} style={{width:"100%"}}>
            Continua con Google
          </button>
        </>
      )}

      {error && <p style={{color:"crimson", marginTop: 12}}>{error}</p>}
    </div>
  );
}
