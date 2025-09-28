import React, { useState } from 'react'
import { authApi } from '../services/auth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function strong(p){ return p.length>=9 && /\d/.test(p) && /[^A-Za-z0-9]/.test(p) }

  async function submit(e){
    e.preventDefault()
    setErr(''); setMsg('')
    if (!strong(password)) { setErr('Password debole: min 9, numeri e speciali.'); return }
    if (password !== password2) { setErr('Le password non coincidono.'); return }
    try{
      await authApi.register({ email, username, password, password2 })
      setMsg('Controlla la tua email e clicca il link di verifica. Poi torna qui a fare login.')
    } catch (e) {
      setErr('Registrazione non riuscita (email/username già usati?).')
      console.error(e)
    }
  }

  return (
    <div className="container">
      <h2>Registrazione</h2>
      <form className="addForm" onSubmit={submit}>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input className="input" type="password" placeholder="Ripeti password" value={password2} onChange={e=>setPassword2(e.target.value)} />
        <button className="primaryBtn">Crea account</button>
      </form>
      {msg && <p style={{color:'#16a34a'}}>{msg}</p>}
      {err && <p style={{color:'#dc2626'}}>{err}</p>}
      <p>Hai già un account? <a href="#/login">Vai al login</a></p>
    </div>
  )
}
