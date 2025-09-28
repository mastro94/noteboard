import React, { useState } from 'react'
import { authApi } from '../services/auth'

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function submit(e){
    e.preventDefault()
    setErr('')
    try {
      const { token, user } = await authApi.login({ identifier, password })
      localStorage.setItem('nb_token', token)
      onLogin({ token, user })
    } catch (e) {
      setErr('Credenziali errate o email non verificata.')
      console.error(e)
    }
  }

  return (
    <div className="container">
      <h2>Login</h2>
      <form className="addForm" onSubmit={submit}>
        <input className="input" placeholder="Email o username" value={identifier} onChange={e=>setIdentifier(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="primaryBtn">Entra</button>
      </form>
      {err && <p style={{color:'#dc2626'}}>{err}</p>}
      <p>Non hai un account? <a href="#/register">Registrati</a></p>
    </div>
  )
}
