import React, { useState } from 'react'
import { register as apiRegister } from '../services/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiRegister({ email, username, password, password2 })
      alert('Registrazione completata! Ora effettua il login.')
      window.location.hash = '#/login'
    } catch (err) {
      console.error(err)
      alert('Registrazione non riuscita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authBox">
      <h2>Registrati</h2>
      <form onSubmit={submit}>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="input" type="password" placeholder="Ripeti password" value={password2} onChange={e=>setPassword2(e.target.value)} />
        <button className="primaryBtn" type="submit" disabled={loading}>
          {loading ? '...' : 'Crea account'}
        </button>
      </form>
      <p style={{marginTop:8}}>
        Hai già un account? <a href="#/login">Accedi</a>
      </p>
    </div>
  )
}
