import React, { useMemo, useState } from 'react'
import Column from './components/Column'
import useLocalStorage from './hooks/useLocalStorage'
import { useEffect } from 'react';
import useDragAndDrop from './hooks/useDragAndDrop'
import Login from './auth/Login'
import Register from './auth/Register'
import { storage, isAPI } from './services'
import { STATUSES, LABELS, LS_KEY } from './utils/constants'
import { uid, byIndex, normalizeOrder } from './utils/helpers'
import './styles.css'

export default function App() {
  const [tasksLocal, setTasksLocal] = useLocalStorage(LS_KEY, [])
  const [tasksApi, setTasksApi] = useState([])

  // puntatori dinamici in base alla modalità
  const currentTasks = isAPI ? tasksApi : tasksLocal
  const setCurrentTasks = isAPI ? setTasksApi : setTasksLocal

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')

  useEffect(() => {
    if (!isAPI) return;
    (async () => {
      const data = await storage.listTasks();
      setTasksApi(data);
    })();
  }, []);

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
      if (s === 'todo' || s === 'in_progress' || s === 'done') {
        by[s].push(t)
      }
    }
    STATUSES.forEach(s => by[s].sort(byIndex))
    return by
  }, [filtered])

  const counters = useMemo(() => ({ total: filtered.length }), [filtered])

  const { onCardDragStart, onColumnDragOver, onColumnDrop } = useDragAndDrop(currentTasks, setCurrentTasks, storage)

  function addTask(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const newTask = {
      id: uid(),
      title: t,
      description: desc.trim(),
      status: 'todo',
      order_index: columns.todo.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCurrentTasks(prev => [...prev, newTask])
    setTitle(''); setDesc('')

    if (isAPI) {
      // crea su backend, poi sostituisci l'elemento placeholder con quello ufficiale
      storage.createTask({ title: newTask.title, description: newTask.description, status: 'todo' })
        .then(created => {
          setCurrentTasks(curr => {
            // rimpiazza il placeholder (id locale) con la risposta ufficiale
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

    // Aggiornamento ottimistico in UI
    setCurrentTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              title: newTitle || t.title,
              description: newDesc,
              updated_at: new Date().toISOString()
            }
          : t
      )
    )
    setEditingId(null)

    // Persistenza lato API (solo in api mode)
    if (isAPI) {
      const payload = {}
      if (newTitle) payload.title = newTitle
      payload.description = newDesc

      const numericId = Number(id)
      const idToSend = Number.isFinite(numericId) ? numericId : id
      storage.updateTask(idToSend, payload)
        .catch(err => {
          console.error("[Noteboard] PATCH /tasks/:id (title/desc) failed:", err)
        })
    }
  }


  function cancelEdit(){ setEditingId(null) }

  function removeTask(id){
    setCurrentTasks(prev => {
      const victim = prev.find(t=>t.id===id)
      const rest = prev.filter(t=>t.id!==id)
      if (victim){
        const same = rest.filter(t=>t.status===victim.status).sort(byIndex)
        same.forEach((t,i)=> t.order_index=i)
      }
      return [...rest]
    })

    if (isAPI) {
      storage.deleteTask(id).catch(console.error)
    }
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
      const numericId = Number(id)
      const idToSend = Number.isFinite(numericId) ? numericId : id
      storage.updateTask(idToSend, { status: targetStatus }).catch(err => {
        console.error("[Noteboard] PATCH /tasks/:id failed on arrow move:", err)
      })
    }
  }

  /* SignUp, Login and Logout functions */

  const [route, setRoute] = useState(window.location.hash || '#/login')
  const [auth, setAuth] = useState(()=> {
    const t = localStorage.getItem('nb_token')
    return t ? { token: t } : null
  })

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || (auth ? '#/' : '#/login'))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [auth])

  function onLogin({ token, user }) {
    setAuth({ token, user })
    window.location.hash = '#/'
  }
  function logout() { localStorage.removeItem('nb_token'); setAuth(null); window.location.hash = '#/login' }

  if (!auth) {
    if (route.startsWith('#/register')) return <Register />
    return <Login onLogin={onLogin} />
  }

  


  function clearDone(){ setCurrentTasks(prev => prev.filter(t=>t.status!=='done')) }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(currentTasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'kanban-tasks.json'; a.click(); URL.revokeObjectURL(url)
  }

  function importJSON(ev){
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (Array.isArray(data)) setCurrentTasks(normalizeOrder(data))
      } catch { alert('File JSON non valido') }
    }
    reader.readAsText(file)
    ev.target.value = ''
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Noteboard</h1>
        <button className="btn" onClick={logout}>Logout</button>
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
            status={s}
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
