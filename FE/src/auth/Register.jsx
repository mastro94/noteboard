import React, { useState } from 'react'
import { authApi } from '../services/auth'
import { signupEmail } from '../services/firebaseAuth'
import { firebaseAvailable } from '../services/firebase'

export default function Register() {
  const [tab, setTab] = useState('be') // 'be' | 'fb'
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const strong = (p) => p.length >= 9 && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)

  async function submitBE(e){
    e.preventDefault()
    setErr(''); setOk('')
    if (!strong(password) || password !== password2) {
      setErr('Password non valida o non coincide'); return
    }
    setLoading(true)
    try {
      await authApi.register({ email, username, password, password2 })
      setOk('Registrazione completata! Ora puoi accedere con Email/Password (BE).')
    } catch (e) {
      console.error(e); setErr(e.message || 'Registrazione BE fallita')
    } finally {
      setLoading(false)
    }
  }

  async function submitFB(e){
    e.preventDefault()
    setErr(''); setOk('')
    if (!strong(password) || password !== password2) {
      setErr('Password non valida o non coincide'); return
    }
    setLoading(true)
    try {
      await signupEmail(email, password)
      setOk('Registrazione completata su Firebase! Controlla la verifica email.')
    } catch (e) {
      console.error(e); setErr(e.message || 'Registrazione Firebase fallita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authBox">
      <h2>Registrati</h2>

      <div style={{display:'flex', gap:8, marginBottom:12}}>
        <button className={tab==='be'?'btnPrimary':'btn'} onClick={()=>setTab('be')}>Backend (Email/Username)</button>
        <button className={tab==='fb'?'btnPrimary':'btn'} onClick={()=>setTab('fb')}>Firebase</button>
      </div>

      {tab==='be' && (
        <form onSubmit={submitBE} style={{display:'grid', gap:8}}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="input" placeholder="Conferma Password" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} />
          <button className="btnPrimary" disabled={loading} type="submit">{loading ? 'Invio…' : 'Registrati (BE)'}</button>
        </form>
      )}

      {tab==='fb' && (
        <form onSubmit={submitFB} style={{display:'grid', gap:8}}>
          {!firebaseAvailable && <div className="hint">Config Firebase mancante (VITE_FIREBASE_*).</div>}
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <input className="input" placeholder="Conferma Password" type="password" value={password2} onChange={e=>setPassword2(e.target.value)} />
          <button className="btnPrimary" disabled={loading || !firebaseAvailable} type="submit">
            {loading ? 'Invio…' : 'Registrati (Firebase)'}
          </button>
        </form>
      )}

      {ok && <div className="ok" style={{marginTop:12}}>{ok}</div>}
      {err && <div className="error" style={{marginTop:12}}>{err}</div>}
    </div>
  )
}
