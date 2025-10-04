import React, { useState } from 'react'
import { loginEmail, loginGoogle } from '../services/firebaseAuth'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function submit(e){
    e.preventDefault()
    setErr('')
    try {
      // Con Firebase usiamo sempre email, non username
      await loginEmail(identifier, password)
      // onAuthStateChanged in App.jsx farà il resto (exchange token + redirect)
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Login fallito')
    }
  }

  async function google(){
    setErr('')
    try {
      await loginGoogle()
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Google login fallito')
    }
  }

  return (
    <div className="authBox">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input className="input" placeholder="Email" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="error">{err}</div>}
        <button className="primaryBtn" type="submit">Login</button>
      </form>
      <button className="btn" onClick={google}>Continua con Google</button>
      <div className="links">
        <a href="#/signup">Registrati</a> · <a href="#/reset">Password dimenticata?</a>
      </div>
    </div>
  )
}
