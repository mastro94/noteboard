import React, { useEffect, useState } from 'react'

export default function Diag() {
  const [health, setHealth] = useState('...')
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE
    fetch(`${base}/health`).then(r => r.text()).then(setHealth).catch(e => setHealth('ERR '+e))
  }, [])
  return (
    <div style={{position:'fixed',bottom:8,right:8,background:'#111',color:'#0f0',padding:12,font:'12px/1.4 monospace',zIndex:9,opacity:0.9}}>
      <div>MODE: {import.meta.env.MODE}</div>
      <div>BASE_URL: {import.meta.env.BASE_URL}</div>
      <div>API: {import.meta.env.VITE_API_BASE}</div>
      <div>FB Project: {import.meta.env.VITE_FIREBASE_PROJECT_ID||'(none)'}</div>
      <div>hash: {window.location.hash}</div>
      <div>token: {localStorage.getItem('nb_token') ? 'YES' : 'no'}</div>
      <div>/health: {health}</div>
    </div>
  )
}
