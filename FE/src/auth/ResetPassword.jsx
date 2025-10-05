import React, { useState } from 'react'
import { requestPasswordReset } from '../services/firebaseAuth'
import { firebaseAvailable } from '../services/firebase'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setOk(''); setErr('')
    if (!firebaseAvailable) {
      setErr('Firebase non configurato. Imposta le variabili VITE_FIREBASE_* e rifai la build.')
      return
    }
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setOk('Email inviata! Controlla la tua casella per il link di reset.')
    } catch (e) {
      setErr(e?.message || 'Invio email di reset non riuscito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reimposta la password</h1>
        <p className="auth-subtitle">Inserisci l’email usata in registrazione. Ti invieremo un link di reset.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div>
            <label className="auth-label" htmlFor="reset-email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="reset-email"
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

          <button className="auth-btn-primary" disabled={loading || !firebaseAvailable}>
            {loading ? 'Invio…' : 'Invia link di reset'}
          </button>
        </form>

        {ok && <div className="auth-ok">{ok}</div>}
        {err && <div className="auth-error">{err}</div>}

        <div className="auth-footer">
          <a href="#/login" className="auth-link">Torna al login</a>
          <a href="#/signup" className="auth-link">Crea un account</a>
        </div>
      </div>
    </div>
  )
}
