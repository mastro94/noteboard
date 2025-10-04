// FE/src/auth/Register.jsx
import React, { useState } from 'react'
import { signupEmail, sendVerificationEmail } from '../services/firebaseAuth'
// Se vuoi scambiare subito il token dopo signup (non obbligatorio):
// import { getFirebaseIdToken } from '../services/firebaseAuth'
// import { exchangeFirebaseToken } from '../services/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setMsg(''); setLoading(true)
    try {
      if (password !== password2) throw new Error('Le password non coincidono')

      // 1) Crea utente su Firebase
      const cred = await signupEmail(email.trim(), password)

      // 2) Invia email di verifica
      await sendVerificationEmail(cred.user)

      // (opzionale) Se vuoi loggare subito lato BE, scambia l’ID token:
      // const idToken = await getFirebaseIdToken(cred.user)
      // await exchangeFirebaseToken(idToken)

      setMsg('Registrazione completata! Controlla la tua email e conferma l’indirizzo prima di accedere.')
      setEmail(''); setPassword(''); setPassword2('')
    } catch (e) {
      setErr(e?.message || 'Registrazione fallita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authCard">
      <h2>Registrati</h2>
      <form onSubmit={submit}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Ripeti password"
          value={password2}
          onChange={e=>setPassword2(e.target.value)}
          required
        />
        <button className="primaryBtn" disabled={loading}>
          {loading ? 'Invio…' : 'Crea account'}
        </button>
      </form>

      <div style={{marginTop: 12, fontSize: 14}}>
        Hai già un account? <a href="#/login">Accedi</a>
      </div>

      {msg && <p className="ok" style={{marginTop: 8}}>{msg}</p>}
      {err && <p className="error" style={{marginTop: 8}}>{err}</p>}
    </div>
  )
}
