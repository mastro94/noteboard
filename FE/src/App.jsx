import React, { useEffect, useMemo, useState } from 'react'
import Column from './components/Column'
import useLocalStorage from './hooks/useLocalStorage'
import useDragAndDrop from './hooks/useDragAndDrop'
import Login from './auth/Login'
import Register from './auth/Register'
import ResetPassword from './auth/ResetPassword'
import { storage, isAPI } from './services'
import { STATUSES, LABELS, LS_KEY } from './utils/constants'
import { uid, byIndex, normalizeOrder } from './utils/helpers'
import { watchAuth, getFirebaseIdToken, logoutFirebase } from './services/firebaseAuth'
import { exchangeFirebaseToken } from './services/auth'
import UserAvatar from './components/UserAvatar'
import './styles.css'

const ROUTES = {
  login:  '#/login',
  signup: '#/signup',
  board:  '#/board',
  reset:  '#/reset',
}

// [LOG] avvio app: hash, token, modalità
console.log('[APP] start. hash=', window.location.hash)
console.log('[APP] token in LS?', !!localStorage.getItem('nb_token'))
console.log('[APP] isAPI=', isAPI)

export default function App() {
  const [tasksLocal, setTasksLocal] = useLocalStorage(LS_KEY, [])
  const [tasksApi, setTasksApi] = useState([])
  const currentTasks = isAPI ? tasksApi : tasksLocal
  const setCurrentTasks = isAPI ? setTasksApi : setTasksLocal

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')

  const [route, setRoute] = useState(window.location.hash || ROUTES.login)
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem('nb_token')
    return t ? { token: t } : null
  })

  // Normalizza hash al primo load (Pages può arrivare senza hash)
  useEffect(() => {
    const hash = window.location.hash
    const legacyMap = { '#/': ROUTES.board, '#/?': ROUTES.board, '#/register': ROUTES.signup }
    const normalized = legacyMap[hash] || hash || (auth ? ROUTES.board : ROUTES.login)
    // [LOG] normalizzazione route
    console.log('[ROUTE] normalize:', { initialHash: hash, normalized, hasToken: !!localStorage.getItem('nb_token') })
    if (normalized !== hash) window.location.hash = normalized
    setRoute(normalized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Router minimale su hash
  useEffect(() => {
    const onHash = () => {
      console.log('[ROUTE] hashchange ->', window.location.hash) // [LOG]
      setRoute(window.location.hash || (auth ? ROUTES.board : ROUTES.login))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [auth])

  // 🔄 Firebase → scambio token col BE
  useEffect(() => {
    console.log('[AUTH] watchAuth attached') // [LOG]
    const un = watchAuth(async (fbUser) => {
      try {
        console.log('[AUTH] onAuthStateChanged ->', fbUser ? { uid: fbUser.uid, email: fbUser.email } : null) // [LOG]
        if (!fbUser) {
          // logout
          localStorage.removeItem('nb_token')
          setAuth(null)
          setTasksApi([])
          if (!route.startsWith(ROUTES.login) && !route.startsWith(ROUTES.signup) && !route.startsWith(ROUTES.reset)) {
            window.location.hash = ROUTES.login
          }
          return
        }
        // utente loggato su Firebase
        console.log('[AUTH] Firebase user present, fetching idToken') // [LOG]
        const idToken = await getFirebaseIdToken()
        if (!idToken) return

        console.log('[AUTH] exchanging idToken with BE', { api: import.meta.env.VITE_API_BASE }) // [LOG]
        const session = await exchangeFirebaseToken(idToken) // { token, user }
        console.log('[AUTH] exchange OK. user=', session.user) // [LOG]
        localStorage.setItem('nb_token', session.token)
        setAuth({ token: session.token, user: session.user })

        if (route.startsWith(ROUTES.login) || route.startsWith(ROUTES.signup) || route.startsWith(ROUTES.reset)) {
          window.location.hash = ROUTES.board
        }
      } catch (err) {
        console.error('[AUTH] exchange FAILED', err) // [LOG]
      }
    })
    return () => un()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carica i task SOLO se loggato e in API mode
  useEffect(() => {
    console.log('[TASKS] loading… isAPI=', isAPI, 'hasToken=', !!localStorage.getItem('nb_token')) // [LOG]
    if (!isAPI) return
    const token = localStorage.getItem('nb_token')
    if (!token) return

    let abort = false
    ;(async () => {
      try {
        const data = await storage.listTasks()
        if (!abort) {
          console.log('[TASKS] fetched', Array.isArray(data) ? data.length : data) // [LOG]
          setTasksApi(data)
        }
      } catch (err) {
        console.error('[TASKS] listTasks failed:', err) // [LOG]
      }
    })()
    return () => { abort = true }
  }, [isAPI, auth])

  // Recupera profilo se ho solo il token (per avatar dopo refresh)
  useEffect(() => {
    const token = localStorage.getItem('nb_token')
    if (!isAPI || !token) return
    if (auth?.user) return
    storage.me()
      .then(user => {
        console.log('[AUTH] /me OK user=', user) // [LOG]
        setAuth(prev => prev ? { ...prev, user } : { token, user })
      })
      .catch(err => console.error('[AUTH] /me failed:', err)) // [LOG]
  }, [isAPI, auth])

  // ---- Actions ----
  function addTask(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return

    if (isAPI && !localStorage.getItem('nb_token')) {
      alert('Devi essere loggato per creare task.')
      return
    }

    const newTask = {
      id: uid(),
      title: t,
      description: desc.trim(),
      status: 'todo',
      order_index: (Array.isArray(columns.todo) ? columns.todo.length : 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCurrentTasks(prev => [...prev, newTask])
    setTitle(''); setDesc('')

    if (isAPI) {
      storage.createTask({ title: newTask.title, description: newTask.description, status: 'todo' })
        .then(created => {
          setCurrentTasks(curr => {
            const tmpIdx = curr.findIndex(x => x.title === newTask.title && x.created_at === newTask.created_at)
            if (tmpIdx >= 0) {
              const copy = [...curr]
              copy[tmpIdx] = { ...created }
              return copy
            }
            return curr
          })
        })
        .catch(err => console.error('[TASKS] createTask failed:', err)) // [LOG]
    }
  }

  function startEdit(task){
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingDesc(task.description || '')
  }

  function saveEdit(id) {
    const newTitle = (editingTitle || '').trim()
    const newDesc  = (editingDesc  || '').trim()
    setCurrentTasks(prev => prev.map(t =>
      t.id === id ? { ...t, title: newTitle || t.title, description: newDesc, updated_at: new Date().toISOString() } : t
    ))
    setEditingId(null)
    if (isAPI) {
      const payload = {}; if (newTitle) payload.title = newTitle; payload.description = newDesc
      const n = Number(id)
      storage.updateTask(Number.isFinite(n) ? n : id, payload)
        .catch(err => console.error('[TASKS] PATCH /tasks/:id (title/desc) failed:', err)) // [LOG]
    }
  }

  function cancelEdit(){ setEditingId(null) }

  function removeTask(id){
    setCurrentTasks(prev => {
      const victim = prev.find(t=>t.id===id)
      const rest = prev.filter(t=>t.id!==id)
      if (victim){ rest.filter(t=>t.status===victim.status).sort(byIndex).forEach((t,i)=> t.order_index=i) }
      return [...rest]
    })
    if (isAPI) storage.deleteTask(id).catch(err => console.error('[TASKS] deleteTask failed:', err)) // [LOG]
  }

  function moveTo(id, targetStatus){
    setCurrentTasks(prev => {
      const next = prev.map(t => ({ ...t }))
      const i = next.findIndex(t => t.id === id)
      if (i === -1) return prev
      if (next[i].status === targetStatus) return prev
      next[i].status = targetStatus
      next[i].updated_at = new Date().toISOString()
      return normalizeOrder(next)
    })
    if (isAPI) {
      const n = Number(id)
      storage.updateTask(Number.isFinite(n)? n : id, { status: targetStatus })
        .catch(err => console.error('[TASKS] PATCH /tasks/:id failed on arrow move:', err)) // [LOG]
    }
  }

  // ---- Filtering / columns ----
  const filtered = useMemo(() => {
    const base = Array.isArray(currentTasks) ? currentTasks : []
    if (!query.trim()) return base
    const q = query.toLowerCase()
    return base.filter(t =>
      (t?.title || '').toLowerCase().includes(q) ||
      (t?.description || '').toLowerCase().includes(q)
    )
  }, [currentTasks, query])

  const columns = useMemo(() => {
    const by = { todo: [], in_progress: [], done: [] }
    const list = Array.isArray(filtered) ? filtered : []
    for (const t of list) {
      const s = t?.status
      if (s === 'todo' || s === 'in_progress' || s === 'done') by[s].push(t)
    }
    STATUSES.forEach(s => by[s].sort(byIndex))
    return by
  }, [filtered])

  const counters = useMemo(() => ({ total: filtered.length }), [filtered])
  const { onCardDragStart, onColumnDragOver, onColumnDrop } =
    useDragAndDrop(currentTasks, setCurrentTasks, storage)

  // ---- Auth gating ----
  async function logout(){
    await logoutFirebase().catch(()=>{})
    localStorage.removeItem('nb_token')
    setAuth(null)
    window.location.hash = ROUTES.login
  }

  if (!auth) {
    if (route.startsWith(ROUTES.signup)) return <Register />
    if (route.startsWith(ROUTES.reset))  return <ResetPassword />
    return <Login />
  }

  // ---- UI ----
  function clearDone(){ setCurrentTasks(prev => prev.filter(t => t.status !== 'done')) }
  function exportJSON(){
    const blob = new Blob([JSON.stringify(currentTasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'kanban-tasks.json'; a.click(); URL.revokeObjectURL(url)
  }
  function importJSON(ev){
    const f = ev.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => { try {
      const data = JSON.parse(reader.result); if (Array.isArray(data)) setCurrentTasks(normalizeOrder(data))
    } catch { alert('File JSON non valido') } }
    reader.readAsText(f); ev.target.value = ''
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Noteboard</h1>
        <div className="header-right">
          <UserAvatar user={auth?.user} />
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="toolbar">
        <form className="addForm" onSubmit={addTask}>
          <input className="input" placeholder="Nuovo task…" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="input" placeholder="Descrizione (opzionale)" value={desc} onChange={e=>setDesc(e.target.value)} />
          <button className="primaryBtn" type="submit">Aggiungi</button>
        </form>
        <div className="toolsRight">
          <input className="input" placeholder="🔎 Cerca…" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="btn" onClick={exportJSON}>Export JSON</button>
          <label className="importLabel">Import JSON
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importJSON} />
          </label>
          <button className="warnBtn" onClick={clearDone}>Svuota Done</button>
        </div>
      </div>

      <div className="board">
        {STATUSES.map(s => (
          <Column
            key={s}
            status={s}
            label={LABELS[s]}
            tasks={columns?.[s] || []}
            counters={counters}
            onDragOver={onColumnDragOver}
            onDrop={() => onColumnDrop(s)}
            onRemove={removeTask}
            onEditStart={startEdit}
            onMoveLeft={(id)=>moveTo(id, s === 'done' ? 'in_progress' : 'todo')}
            onMoveRight={(id)=>moveTo(id, s === 'todo' ? 'in_progress' : 'done')}
            onDragStart={onCardDragStart}
            editingId={editingId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            editingDesc={editingDesc}
            setEditingDesc={setEditingDesc}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
          />
        ))}
      </div>
    </div>
  )
}
