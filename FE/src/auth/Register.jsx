import React, { useState } from 'react'
import { signupEmail, translateAuthError } from '../services/firebaseAuth'
import { firebaseAvailable } from '../services/firebase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const strong = (p) => p.length >= 9 && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(''); setOk('')
    if (!firebaseAvailable) {
      setErr('Firebase non configurato. Imposta le variabili VITE_FIREBASE_* e rifai la build.')
      return
    }
    if (password !== password2) { setErr('Le password non coincidono'); return }
    if (!strong(password)) { setErr('Password debole (min 9, una cifra e un simbolo)'); return }
    setLoading(true)
    try {
      await signupEmail(email, password) // invio email di verifica (best-effort nel service)
      setOk('Registrazione completata! Ora puoi accedere con la tua email e password.')
    } catch (e) {
      console.error('[REGISTER] Firebase error:', e)
      setErr(translateAuthError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" >
      <div className="auth-card">
        <h1 className="auth-title">Crea l’account</h1>
        <p className="auth-subtitle">L’account è gestito da Firebase Authentication.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div>
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="reg-email"
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
            <label className="auth-label" htmlFor="reg-password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password"
                className="auth-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="Almeno 9 caratteri, 1 numero, 1 simbolo"
                autoComplete="new-password"
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

          <div>
            <label className="auth-label" htmlFor="reg-password2">Conferma password</label>
            <div className="auth-input-wrap">
              <input
                id="reg-password2"
                className="auth-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="Ripeti la password"
                autoComplete="new-password"
                value={password2}
                onChange={e=>setPassword2(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="auth-btn-primary" disabled={loading || !firebaseAvailable}>
            {loading ? 'Registrazione…' : 'Registrati'}
          </button>
        </form>

        {ok && <div className="auth-ok">{ok}</div>}
        {err && <div className="auth-error">{err}</div>}

        <div className="auth-footer">
          <a href="#/login" className="auth-link">Hai già un account? Accedi</a>
          <a href="#/reset" className="auth-link">Password dimenticata?</a>
        </div>
      </div>
    </div>
  )
}
