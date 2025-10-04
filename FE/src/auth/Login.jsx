import React, { useState } from 'react'
import { loginEmail, loginGoogle } from '../services/firebaseAuth'

export default function Login() {
  const [identifier, setIdentifier] = useState('')   // email
  const [password, setPassword]   = useState('')
  const [err, setErr]             = useState('')
  const [loading, setLoading]     = useState(false)

  async function submit(e){
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await loginEmail(identifier.trim(), password)
      // NIENTE redirect qui: ci pensa watchAuth in App.jsx a scambiare il token e navigare.
    } catch (e) {
      setErr(e?.message || 'Login fallito')
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle(){
    setErr('')
    try {
      await loginGoogle()
      // Anche qui: watchAuth farà il resto.
    } catch (e) {
      setErr(e?.message || 'Login Google fallito')
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
          onChange={e=>setIdentifier(e.target.value)}
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

      <div style={{marginTop: 12}}>
        <button className="btn" onClick={signInWithGoogle}>
          🔐 Accedi con Google
        </button>
      </div>

      {err && <p className="error" style={{marginTop: 8}}>{err}</p>}

      <div style={{marginTop: 12, fontSize: 14}}>
        <a href="#/signup">Crea un account</a> · <a href="#/reset">Password dimenticata?</a>
      </div>
    </div>
  )
}
