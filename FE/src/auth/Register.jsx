// FE/src/auth/Register.jsx
import React, { useState } from 'react'
import { signupEmail, sendVerificationEmail } from '../services/firebaseAuth'

export default function Register() {
  const [email, setEmail]       = useState('')
  const [username, setUsername] = useState('') // opzionale: puoi anche non usarlo lato Firebase
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [ok, setOk]             = useState('')

  async function submit(e){
    e.preventDefault()
    setErr(''); setOk(''); setLoading(true)

    if (password !== password2) {
      setErr('Le password non coincidono'); setLoading(false); return
    }
    if (password.length < 9 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setErr('Password debole: almeno 9 caratteri, un numero e un carattere speciale')
      setLoading(false); return
    }

    try {
      const cred = await signupEmail(email.trim(), password)
      // opzionale: invio email di verifica da Firebase
      await sendVerificationEmail(cred.user).catch(()=>{})
      setOk('Registrazione completata! Controlla la tua email per la verifica.')
      // Il redirect avverrà grazie a watchAuth in App.jsx che scambia il token.
    } catch (e) {
      setErr(e?.message || 'Registrazione fallita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authCard">
      <h2>Crea account</h2>
      <form onSubmit={submit}>
        <input className="input" type="email" placeholder="Email"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" type="text" placeholder="Username (facoltativo)"
               value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Password"
               value={password} onChange={e=>setPassword(e.target.value)} required />
        <input className="input" type="password" placeholder="Ripeti password"
               value={password2} onChange={e=>setPassword2(e.target.value)} required />
        <button className="primaryBtn" disabled={loading}>
          {loading ? 'Creo…' : 'Registrati'}
        </button>
      </form>

      {ok && <p className="ok" style={{marginTop: 8}}>{ok}</p>}
      {err && <p className="error" style={{marginTop: 8}}>{err}</p>}

      <div style={{marginTop: 12, fontSize: 14}}>
        <a href="#/login">Hai già un account? Accedi</a>
      </div>
    </div>
  )
}
