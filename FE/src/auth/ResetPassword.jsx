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
      await resetPassword(email)
      setMsg('Email inviata! Controlla la tua casella per reimpostare la password.')
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Errore invio email reset')
    }
  }

  return (
    <div className="authBox">
      <h2>Recupera password</h2>
      <form onSubmit={submit}>
        <input className="input" placeholder="La tua email" value={email} onChange={e=>setEmail(e.target.value)} />
        {err && <div className="error">{err}</div>}
        {msg && <div className="success">{msg}</div>}
        <button className="primaryBtn" type="submit">Invia link</button>
      </form>
      <div className="links">
        <a href="#/login">Torna al login</a>
      </div>
    </div>
  )
}
