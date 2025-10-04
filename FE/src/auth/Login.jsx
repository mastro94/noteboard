import React, { useState } from 'react'
import { loginEmail, loginGoogle, getFirebaseIdToken } from '../services/firebaseAuth'
import { exchangeFirebaseToken } from '../services/auth'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      // 1) Firebase email+password
      const cred = await loginEmail(email.trim(), password)
      // 2) ID token Firebase
      const idToken = await getFirebaseIdToken(cred.user)
      // 3) Scambio sul BE -> JWT app
      const { token, user } = await exchangeFirebaseToken(idToken)
      localStorage.setItem('nb_token', token)
      onLogin?.({ token, user })
    } catch (e) {
      setErr(e?.message || 'Login fallito')
    } finally {
      setLoading(false)
    }
  }

  async function signInGoogle() {
    setErr(''); setLoading(true)
    try {
      const cred = await loginGoogle()
      const idToken = await getFirebaseIdToken(cred.user)
      const { token, user } = await exchangeFirebaseToken(idToken)
      localStorage.setItem('nb_token', token)
      onLogin?.({ token, user })
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
        <button className="primaryBtn" disabled={loading}>
          {loading ? 'Accesso…' : 'Accedi'}
        </button>
      </form>

      <button className="btn" style={{marginTop: 12}} onClick={signInGoogle} disabled={loading}>
        Accedi con Google
      </button>

      <div style={{marginTop: 12, fontSize: 14}}>
        <a href="#/signup">Registrati</a> · <a href="#/reset">Password dimenticata?</a>
      </div>

      {err && <p className="error" style={{marginTop: 8}}>{err}</p>}
    </div>
  )
}
