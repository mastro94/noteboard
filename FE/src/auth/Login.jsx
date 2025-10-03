// FE/src/auth/Login.jsx
import React, { useState } from 'react'
import { login as apiLogin } from '../services/auth'

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiLogin(identifier, password) // { token, user }
      localStorage.setItem('nb_token', data.token)
      onLogin?.(data)
    } catch (err) {
      console.error(err)
      alert('Login non riuscito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authBox">
      <h2>Accedi</h2>
      <form onSubmit={submit}>
        <input
          className="input"
          placeholder="Email o username"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="primaryBtn" type="submit" disabled={loading}>
          {loading ? '...' : 'Login'}
        </button>
      </form>
      <p style={{marginTop:8}}>
        Non hai un account? <a href="#/signup">Registrati</a>

      </p>
    </div>
  )
}
