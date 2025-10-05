import React, { useState } from 'react'
import { loginEmail, loginGoogle } from '../services/firebaseAuth'
import { firebaseAvailable } from '../services/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!firebaseAvailable) {
      setErr('Firebase non configurato. Imposta le variabili VITE_FIREBASE_* e rifai la build.')
      return
    }
    setLoading(true)
    try {
      await loginEmail(email, password) // onAuthStateChanged farà exchange token + redirect
    } catch (e) {
      setErr(e?.message || 'Accesso non riuscito')
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setErr('')
    setLoading(true)
    try {
      await loginGoogle()
    } catch (e) {
      setErr(e?.message || 'Accesso Google non riuscito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Accedi a Noteboard</h1>
        <p className="auth-subtitle">Usa email e password registrate su Firebase, oppure Google.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div>
            <label className="auth-label" htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="tu@esempio.com"
                autoComplete="username"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                className="auth-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye"
                onClick={()=>setShowPwd(v=>!v)}
                aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}
              >
                {showPwd ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>

          <button className="auth-btn-primary" disabled={loading || !firebaseAvailable}>
            {loading ? 'Accesso…' : 'Accedi'}
          </button>
        </form>

        <div className="auth-divider">
          <span className="line"></span> oppure <span className="line"></span>
        </div>

        <button type="button" className="auth-btn-google" onClick={onGoogle} disabled={loading || !firebaseAvailable}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 31.6 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 5.1 29.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.8 0 20-7.8 20-21 0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16.7 18.8 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 5.1 29.1 3 24 3 16.3 3 9.6 7.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.8 13.6-4.8l-6.3-5.2c-2 1.4-4.7 2.3-7.3 2.3-5.3 0-9.6-3.4-11.2-8.1l-6.5 5.1C9.6 40.7 16.3 45 24 45z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.6-5.6 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 5.1 29.1 3 24 3c-11.6 0-21 9.4-21 21s9.4 21 21 21c10.8 0 20-7.8 20-21 0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continua con Google
        </button>

        {err && <div className="auth-error">{err}</div>}

        <div className="auth-footer">
          <a href="#/reset" className="auth-link">Password dimenticata?</a>
          <a href="#/signup" className="auth-link">Non hai un account? Registrati</a>
        </div>
      </div>
    </div>
  )
}
