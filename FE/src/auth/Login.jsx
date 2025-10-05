import React, { useMemo, useState } from 'react'
import { authApi } from '../services/auth'
import { loginEmail, loginGoogle } from '../services/firebaseAuth'
import { firebaseAvailable } from '../services/firebase'

export default function Login() {
  const [tab, setTab] = useState('be') // 'be' | 'fb'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [emailFB, setEmailFB] = useState('')
  const [passFB, setPassFB] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const googleVisible = useMemo(() => firebaseAvailable, [])

  async function submitBE(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const data = await authApi.login({ identifier, password })
      localStorage.setItem('nb_token', data.token)
      window.location.hash = '#/board'
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Login fallito')
    } finally {
      setLoading(false)
    }
  }

  async function submitFB(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await loginEmail(emailFB, passFB) // onAuthStateChanged (in App.jsx) farà exchange + redirect
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Login Firebase fallito')
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setErr('')
    setLoading(true)
    try {
      await loginGoogle() // onAuthStateChanged gestirà exchange + redirect
    } catch (e) {
      console.error(e)
      setErr(e.message || 'Google login fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authBox">
      <h2>Login</h2>

      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button className={tab==='be'?'btnPrimary':'btn'} onClick={()=>setTab('be')}>Email/Password (Backend)</button>
        <button className={tab==='fb'?'btnPrimary':'btn'} onClick={()=>setTab('fb')}>Firebase / Google</button>
      </div>

      {tab==='be' && (
        <form onSubmit={submitBE} style={{display:'grid', gap:8}}>
          <input className="input" placeholder="Email o username" value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />
          <button className="btnPrimary" disabled={loading} type="submit">{loading ? 'Accesso…' : 'Accedi (BE)'}</button>
        </form>
      )}

      {tab==='fb' && (
        <form onSubmit={submitFB} style={{display:'grid', gap:8}}>
          <input className="input" placeholder="Email" value={emailFB} onChange={e=>setEmailFB(e.target.value)} autoComplete="username" />
          <input className="input" placeholder="Password" type="password" value={passFB} onChange={e=>setPassFB(e.target.value)} autoComplete="current-password" />
          <button className="btnPrimary" disabled={loading} type="submit">{loading ? 'Accesso…' : 'Accedi con Firebase'}</button>

          {googleVisible && (
            <button className="btn" type="button" onClick={onGoogle} disabled={loading}>
              Continua con Google
            </button>
          )}
          {!googleVisible && (
            <div className="hint">Google non disponibile: configura VITE_FIREBASE_* e rebuild.</div>
          )}
          <a href="#/reset" className="link">Password dimenticata?</a>
        </form>
      )}

      {err && <div className="error" style={{marginTop:12}}>{err}</div>}
    </div>
  )
}
