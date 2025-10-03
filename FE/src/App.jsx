import React, { useEffect, useMemo, useState } from 'react'
import Column from './components/Column'
import useLocalStorage from './hooks/useLocalStorage'
import useDragAndDrop from './hooks/useDragAndDrop'
import Login from './auth/Login'
import Register from './auth/Register'
import { storage, isAPI } from './services'
import { STATUSES, LABELS, LS_KEY } from './utils/constants'
import { uid, byIndex, normalizeOrder } from './utils/helpers'
import UserAvatar from './components/UserAvatar'
import './styles.css'

const ROUTES = {
  login:  '#/login',
  signup: '#/signup',
  board:  '#/board',
}

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

  // Routing & auth
  const [route, setRoute] = useState(window.location.hash || ROUTES.login)
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem('nb_token')
    return t ? { token: t } : null
  })

  // Recupera profilo se ho solo il token (per far funzionare l'avatar dopo refresh)
  useEffect(() => {
    const token = localStorage.getItem('nb_token')
    if (!isAPI || !token) return
    if (auth?.user) return
    storage.me()
      .then(user => setAuth(prev => prev ? { ...prev, user } : { token, user }))
      .catch(err => console.error('[Noteboard] /me failed:', err))
  }, [isAPI, auth])

  // Normalizza hash al primo load: mappa i vecchi path ai nuovi e imposta default
  useEffect(() => {
    const hash = window.location.hash
    const legacyMap = {
      '#/': ROUTES.board,
      '#/?': ROUTES.board,
      '#/register': ROUTES.signup,
    }
    const normalized = legacyMap[hash] || hash

    if (!normalized) {
      const target = auth ? ROUTES.board : ROUTES.login
      window.location.hash = target
      setRoute(target)
    } else if (normalized !== hash) {
      window.location.hash = normalized
      setRoute(normalized)
    }
  }, []) // solo on-mount

  // Aggiorna route su hashchange
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || (auth ? ROUTES.board : ROUTES.login))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [auth])

  // Se autenticato e sono su login/signup, manda alla board (qualora arrivi manualmente lì)
  useEffect(() => {
    if (!auth) return
    if (route.startsWith(ROUTES.login) || route.startsWith(ROUTES.signup)) {
      window.location.hash = ROUTES.board
    }
  }, [auth, route])

  // Carica i task SOLO se loggato e in API mode
  useEffect(() => {
    if (!isAPI) return
    const token = localStorage.getItem('nb_token')
    if (!token) return

    let abort = false
    ;(async () => {
      try {
        const data = await storage.listTasks()
        if (!abort) setTasksApi(data)
      } catch (err) {
        console.error('[Noteboard] listTasks failed:', err)
      }
    })()
    return () => { abort = true }
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
        .catch(console.error)
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
        .catch(err => console.error('[Noteboard] PATCH /tasks/:id (title/desc) failed:', err))
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
    if (isAPI) storage.deleteTask(id).catch(console.error)
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
        .catch(err => console.error('[Noteboard] PATCH /tasks/:id failed on arrow move:', err))
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
  function onLogin({ token, user }) {
    setAuth({ token, user })
    window.location.hash = ROUTES.board
    if (isAPI) {
      storage.listTasks()
        .then(setTasksApi)
        .catch(err => console.error('[Noteboard] listTasks after login failed:', err))
    }
  }

  function logout(){
    localStorage.removeItem('nb_token')
    setAuth(null)
    window.location.hash = ROUTES.login
  }

  if (!auth) {
    if (route.startsWith(ROUTES.signup)) return <Register />
    return <Login onLogin={onLogin} />
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
