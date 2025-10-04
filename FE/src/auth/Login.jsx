// FE/src/auth/Login.jsx
import React, { useState } from 'react'
import { loginEmail, loginGoogle, getFirebaseIdToken } from '../services/firebaseAuth'
import { exchangeFirebaseToken } from '../services/auth'

export default function Login({ onLogin }) {
  console.log('[Login.jsx] build id = 2025-10-04T#1')

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await loginEmail(identifier.trim(), password)
      const idToken = await getFirebaseIdToken()
      if (!idToken) throw new Error('Impossibile ottenere ID token Firebase')
      const data = await exchangeFirebaseToken(idToken)
      localStorage.setItem('nb_token', data.token)
      onLogin?.(data)
    } catch (e) {
      setErr(e?.message || 'Login fallito')
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setErr(''); setLoading(true)
    try {
      await loginGoogle()
      const idToken = await getFirebaseIdToken()
      if (!idToken) throw new Error('Impossibile ottenere ID token Firebase')
      const data = await exchangeFirebaseToken(idToken)
      localStorage.setItem('nb_token', data.token)
      onLogin?.(data)
    } catch (e) {
      setErr(e?.message || 'Login Google fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authCard">
      <h2>Accedi</h2>

      <form onSubmit={submit}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={identifier}
          onChange={(e)=>setIdentifier(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          required
        />
        <button className="primaryBtn" disabled={loading}>
          {loading ? 'Accesso…' : 'Accedi'}
        </button>
      </form>

      {/* Bottone Google visibile SEMPRE */}
      <button className="btn" onClick={loginWithGoogle} disabled={loading} style={{ marginTop: 8 }}>
        Accedi con Google
      </button>

      <div style={{marginTop: 12, fontSize: 14}}>
        Non hai un account? <a href="#/signup">Registrati</a> ·
        <a href="#/reset" style={{ marginLeft: 8 }}>Password dimenticata?</a>
      </div>

      {err && <p className="error" style={{marginTop: 8}}>{err}</p>}
    </div>
  )
}
