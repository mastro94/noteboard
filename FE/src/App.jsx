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

import TagManager from './components/TagManager'
import TaskPanel from './components/TaskPanel'

import './styles.css'

const ROUTES = {
  login:  '#/login',
  signup: '#/signup',
  board:  '#/board',
  reset:  '#/reset',
}

// Palette colori fissa
export const PRESET_COLORS = [
  { hex: '#ef4444', name: 'Rosso' },
  { hex: '#f59e0b', name: 'Ambra' },
  { hex: '#f97316', name: 'Arancione' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#10b981', name: 'Smeraldo' },
  { hex: '#06b6d4', name: 'Ciano' },
  { hex: '#3b82f6', name: 'Blu' },
  { hex: '#6366f1', name: 'Indaco' },
  { hex: '#a855f7', name: 'Viola' },
  { hex: '#ec4899', name: 'Rosa' },
]


// Priorità + emoji (per menu a tendina)
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST']
export const PRIORITY_EMOJI = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  HIGHEST: '🔴',
}

export default function App() {
  // --- Tasks data source (LS vs API) ---
  const [tasksLocal, setTasksLocal] = useLocalStorage(LS_KEY, [])
  const [tasksApi, setTasksApi] = useState([])
  const currentTasks = isAPI ? tasksApi : tasksLocal
  const setCurrentTasks = isAPI ? setTasksApi : setTasksLocal

  // --- Router/Auth ---
  const [route, setRoute] = useState(window.location.hash || ROUTES.login)
  const [auth, setAuth] = useState(() => {
    const t = localStorage.getItem('nb_token')
    return t ? { token: t } : null
  })

  // --- New Task form ---
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [query, setQuery] = useState('')

  // --- Edit Task ---
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')

  // --- Tags ---
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0].hex)
  const [selectedTagId, setSelectedTagId] = useState('')            // per nuovo task
  const [activeTagFilterId, setActiveTagFilterId] = useState(null)  // filtro toggle
  const [editingTagId, setEditingTagId] = useState('')

  // --- Priorità ---
  const [selectedPriority, setSelectedPriority] = useState('LOW')
  const [editingPriority, setEditingPriority] = useState('LOW')

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'tags'

  // Normalizza hash al primo load
  useEffect(() => {
    const hash = window.location.hash
    const legacyMap = { '#/': ROUTES.board, '#/?': ROUTES.board, '#/register': ROUTES.signup }
    const normalized = legacyMap[hash] || hash || (auth ? ROUTES.board : ROUTES.login)
    if (normalized !== hash) window.location.hash = normalized
    setRoute(normalized)
    if (auth) setActiveTab('tasks')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Router minimale
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || (auth ? ROUTES.board : ROUTES.login))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [auth])

  // 🔄 Firebase → BE
  useEffect(() => {
    const un = watchAuth(async (fbUser) => {
      try {
        if (!fbUser) {
          localStorage.removeItem('nb_token')
          setAuth(null)
          setTasksApi([])
          if (!route.startsWith(ROUTES.login) && !route.startsWith(ROUTES.signup) && !route.startsWith(ROUTES.reset)) {
            window.location.hash = ROUTES.login
          }
          return
        }
        const idToken = await getFirebaseIdToken()
        if (!idToken) return
        const session = await exchangeFirebaseToken(idToken) // { token, user }
        localStorage.setItem('nb_token', session.token)
        setAuth({ token: session.token, user: session.user })
        if (route.startsWith(ROUTES.login) || route.startsWith(ROUTES.signup) || route.startsWith(ROUTES.reset)) {
          window.location.hash = ROUTES.board
        }
      } catch (err) {
        console.error('[AUTH] exchange FAILED', err)
      }
    })
    return () => un()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carica tasks dal BE
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
        console.error('[TASKS] listTasks failed:', err)
      }
    })()
    return () => { abort = true }
  }, [isAPI, auth])

  // /me per avatar
  useEffect(() => {
    const token = localStorage.getItem('nb_token')
    if (!isAPI || !token) return
    if (auth?.user) return
    storage.me().then(user => {
      setAuth(prev => prev ? { ...prev, user } : { token, user })
    }).catch(err => console.error('[AUTH] /me failed:', err))
  }, [isAPI, auth])

  // Carica TAG
  useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const data = await storage.listTags()
        if (!abort && Array.isArray(data)) {
          setTags(data)
          if (selectedTagId && !data.find(t => String(t.id) === String(selectedTagId))) {
            setSelectedTagId('')
          }
          if (activeTagFilterId && !data.find(t => String(t.id) === String(activeTagFilterId))) {
            setActiveTagFilterId(null)
          }
        }
      } catch (e) {
        console.warn('[TAGS] listTags failed (ok in local mode):', e)
      }
    })()
    return () => { abort = true }
  }, [isAPI, auth?.token])

  // --- Actions: TAGS ---
  async function onCreateTag(e){
    e.preventDefault()
    const name = newTagName.trim()
    if (!name) return
    try {
      const created = await storage.createTag({ name, color: newTagColor || undefined })
      setTags(prev => [...prev, created].sort((a,b)=>a.name.localeCompare(b.name)))
      setNewTagName('')
      setNewTagColor(PRESET_COLORS[0].hex)
    } catch(err){
      alert('Errore creazione tag: ' + err.message)
    }
  }

  async function onDeleteTag(id){
    const tag = tags.find(t => String(t.id) === String(id))
    const label = tag ? `“${tag.name}”` : `ID ${id}`
    if (!confirm(`Eliminare il tag ${label}?`)) return
    try {
      if (isAPI) await storage.deleteTag(id)
      setTags(prev => prev.filter(t => String(t.id) !== String(id)))
      setSelectedTagId(prev => String(prev) === String(id) ? '' : prev)
      setActiveTagFilterId(prev => String(prev) === String(id) ? null : prev)
      setEditingTagId(prev => String(prev) === String(id) ? '' : prev)
      setCurrentTasks(prev => {
        const next = (prev || []).map(task => {
          if (!Array.isArray(task.tags) || task.tags.length === 0) return task
          const cleaned = task.tags.filter(t => String(t.id) !== String(id))
          if (cleaned.length === task.tags.length) return task
          return { ...task, tags: cleaned }
        })
        return next
      })
    } catch (e) {
      console.error('[TAGS] delete failed:', e)
      alert('Errore durante l’eliminazione del tag.')
    }
  }

  // --- Actions: TASKS ---
  function addTask(e) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    if (!PRIORITIES.includes(selectedPriority)) setSelectedPriority('LOW')
    if (isAPI && !localStorage.getItem('nb_token')) {
      alert('Devi essere loggato per creare task.'); return
    }

    const chosenTag = tags.find(x => String(x.id) === String(selectedTagId))
    const newTask = {
      id: uid(),
      title: t,
      description: (desc || '').trim(),
      status: 'todo',
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: chosenTag ? [chosenTag] : [],
      priority: selectedPriority,
    }

    setCurrentTasks(prev => {
      const next = [...prev, newTask]
      next.filter(tt=>tt.status==='todo').sort(byIndex).forEach((tt,i)=> tt.order_index=i)
      return next
    })
    setTitle(''); setDesc('')

    if (isAPI) {
      storage.createTask({
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        tag_ids: chosenTag ? [chosenTag.id] : [],
        priority: selectedPriority
      })
      .then(created => {
        setCurrentTasks(curr => {
          const idx = curr.findIndex(x => x.title === newTask.title && x.created_at === newTask.created_at)
          if (idx >= 0) {
            const copy = [...curr]; copy[idx] = { ...created }; return copy
          }
          return curr
        })
      })
      .catch(err => console.error('[TASKS] createTask failed:', err))
    }
  }

  function startEdit(task){
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingDesc(task.description || '')
    setEditingTagId(String(task?.tags?.[0]?.id ?? ''))
    setEditingPriority(task?.priority || 'LOW')
  }

  function saveEdit(id) {
    const newTitle = (editingTitle || '').trim()
    const newDesc  = (editingDesc  || '').trim()
    const chosenTag = tags.find(x => String(x.id) === String(editingTagId))
    setCurrentTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = {
        ...t,
        title: (editingTitle || '').trim() || t.title,
        description: (editingDesc || '').trim(),
        updated_at: new Date().toISOString(),
        tags: chosenTag ? [chosenTag] : [],
        priority: editingPriority
      }
      return updated
    }))
    setEditingId(null)
    if (isAPI) {
      const payload = {}; if (newTitle) payload.title = newTitle; payload.description = newDesc
      payload.tag_ids = chosenTag ? [chosenTag.id] : []
      payload.priority = editingPriority
      const n = Number(id)
      storage.updateTask(Number.isFinite(n) ? n : id, payload)
        .catch(err => console.error('[TASKS] PATCH title/desc/priority failed:', err))
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
    if (isAPI) storage.deleteTask(id).catch(err => console.error('[TASKS] deleteTask failed:', err))
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
        .catch(err => console.error('[TASKS] PATCH status failed:', err))
    }
  }

  // ---- Filtering (testo + tag toggle) ----
  const filtered = useMemo(() => {
    const base = Array.isArray(currentTasks) ? currentTasks : []
    const byText = (() => {
      if (!query.trim()) return base
      const q = query.toLowerCase()
      return base.filter(t =>
        (t?.title || '').toLowerCase().includes(q) ||
        (t?.description || '').toLowerCase().includes(q)
      )
    })()
    if (!activeTagFilterId) return byText
    return byText.filter(t => Array.isArray(t.tags) && t.tags.some(tag => String(tag.id) === String(activeTagFilterId)))
  }, [currentTasks, query, activeTagFilterId])

  const columns = useMemo(() => {
    const by = { todo: [], in_progress: [], done: [] }
    for (const t of filtered) {
      if (t.status === 'todo' || t.status === 'in_progress' || t.status === 'done') by[t.status].push(t)
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

  // ---- Tools helpers ----
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

  function toggleTagFilter(){
    if (!selectedTagId) return
    setActiveTagFilterId(prev =>
      String(prev) === String(selectedTagId) ? null : selectedTagId
    )
  }

  const sortedTags = useMemo(() => [...tags].sort((a,b)=>a.name.localeCompare(b.name)), [tags])
  const selectedTagObj = tags.find(t => String(t.id) === String(selectedTagId))
  const isFilterActive = activeTagFilterId && String(activeTagFilterId) === String(selectedTagId)

  // Gate auth
  if (!auth) {
    if (route.startsWith(ROUTES.signup)) return <Register />
    if (route.startsWith(ROUTES.reset))  return <ResetPassword />
    return <Login />
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

      {/* TAB BAR */}
      <nav className="tabs">
        <button
          type="button"
          className={activeTab === 'tasks' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('tasks')}
        >
          Nuovo Task & Ricerca
        </button>
        <button
          type="button"
          className={activeTab === 'tags' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('tags')}
        >
          Tag Manager
        </button>
      </nav>


      {/* CONTENUTO SCHEDE */}
      {activeTab === 'tags' ? (
        <TagManager
          newTagName={newTagName}
          setNewTagName={setNewTagName}
          newTagColor={newTagColor}
          setNewTagColor={setNewTagColor}
          onCreateTag={onCreateTag}
          tags={sortedTags}
          onDeleteTag={onDeleteTag}
          presetColors={PRESET_COLORS}
        />
      ) : (
        <TaskPanel
          title={title} setTitle={setTitle}
          desc={desc} setDesc={setDesc}
          addTask={addTask}
          query={query} setQuery={setQuery}
          exportJSON={exportJSON} importJSON={importJSON}
          clearDone={clearDone}
          tags={sortedTags}
          selectedTagId={selectedTagId} setSelectedTagId={setSelectedTagId}
          selectedTagObj={selectedTagObj}
          isFilterActive={!!isFilterActive}
          toggleTagFilter={toggleTagFilter}
          selectedPriority={selectedPriority} setSelectedPriority={setSelectedPriority}
          PRIORITY_EMOJI={PRIORITY_EMOJI}
        />
      )}

      {/* info filtro attivo */}
      {activeTagFilterId && (
        <div style={{ margin: '4px 0 8px', fontSize: 13 }}>
          Filtrando per tag: <strong>
            {tags.find(t => String(t.id) === String(activeTagFilterId))?.name || activeTagFilterId}
          </strong> — clic su “Mostra tutti” per rimuovere il filtro.
        </div>
      )}

      {/* Board */}
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
            editingTagId={editingTagId}
            setEditingTagId={setEditingTagId}
            tagsList={sortedTags}
            editingPriority={editingPriority}
            setEditingPriority={setEditingPriority}
          />
        ))}
      </div>
    </div>
  )
}
