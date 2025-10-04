// FE/src/auth/ResetPassword.jsx
import React, { useState } from 'react'
import { resetPassword } from '../services/firebaseAuth'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function submit(e){
    e.preventDefault()
    setMsg(''); setErr('')
    try {
      await resetPassword(email.trim())
      setMsg('Email di reset inviata (se l’account esiste).')
    } catch (e) {
      setErr(e?.message || 'Errore nell’invio reset')
    }
  }

  return (
    <div className="authCard">
      <h2>Recupero password</h2>
      <form onSubmit={submit}>
        <input className="input" type="email" placeholder="Email"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="primaryBtn">Invia link</button>
      </form>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="error">{err}</p>}
      <div style={{marginTop: 12}}>
        <a href="#/login">Torna al login</a>
      </div>
    </div>
  )
}
