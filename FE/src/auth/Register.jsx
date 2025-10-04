import React, { useState } from 'react'
import { signupEmail } from '../services/firebaseAuth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  async function submit(e){
    e.preventDefault()
    setErr(''); setOk('')
    if (password !== password2) {
      setErr('Le password non coincidono')
      return
    }
    if (password.length < 9 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setErr('Password debole: minimo 9 caratteri, almeno un numero e un carattere speciale')
      return
    }
    try {
      await signupEmail(email, password)
      setOk('Registrazione completata! Controlla la tua email per la verifica.')
      // onAuthStateChanged gestirà poi l’exchange token + redirect alla board
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Registrazione fallita')
    }
  }

  return (
    <div className="authBox">
      <h2>Registrazione</h2>
      <form onSubmit={submit}>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="input" placeholder="Ripeti password" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} />
        {err && <div className="error">{err}</div>}
        {ok && <div className="success">{ok}</div>}
        <button className="primaryBtn" type="submit">Registrati</button>
      </form>
      <div className="links">
        <a href="#/login">Hai già un account? Login</a>
      </div>
    </div>
  )
}
