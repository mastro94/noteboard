import React, { useEffect, useMemo, useState } from 'react'
import Column from './components/Column'
import useLocalStorage from './hooks/useLocalStorage'
import useDragAndDrop from './hooks/useDragAndDrop'
import Login from './auth/Login'
import Register from './auth/Register'
import ResetPassword from './auth/ResetPassword'
import { storage, isAPI } from './services'
import { STATUSES, LABELS, LS_KEY, LS_ACTIVE_BOARD_KEY } from './utils/constants'
import { uid, byIndex, normalizeOrder } from './utils/helpers'
import { watchAuth, getFirebaseIdToken, logoutFirebase } from './services/firebaseAuth'
import { exchangeFirebaseToken } from './services/auth'
import UserAvatar from './components/UserAvatar'

import TagManager from './components/TagManager'
import TaskPanel from './components/TaskPanel'

import BoardManager from './components/BoardManager'

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

  // --- Boards (API) ---
  const [activeBoardId, setActiveBoardId] = useState(() => localStorage.getItem(LS_ACTIVE_BOARD_KEY) || '')
  const [boards, setBoards] = useState([])
  const [newBoardTitle, setNewBoardTitle] = useState('')

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
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'tags' | 'boards'

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
          localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
          setAuth(null)
          setTasksApi([])
          setTags([])
          setBoards([])
          setActiveBoardId('')
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

  // /me per avatar
  useEffect(() => {
    const token = localStorage.getItem('nb_token')
    if (!isAPI || !token) return
    if (auth?.user) return
    storage.me().then(user => {
      setAuth(prev => prev ? { ...prev, user } : { token, user })
    }).catch(err => console.error('[AUTH] /me failed:', err))
  }, [isAPI, auth])

  // Carica BOARDS (API) e seleziona board valida (o prima)
  useEffect(() => {
    if (!isAPI) return
    const token = localStorage.getItem('nb_token')
    if (!token) return
    let abort = false
    ;(async () => {
      try {
        const data = await storage.listBoards()
        if (abort) return
        const list = Array.isArray(data) ? data : []
        setBoards(list)

        const saved = localStorage.getItem(LS_ACTIVE_BOARD_KEY) || ''
        const savedValid = saved && list.some(b => String(b.id) === String(saved))
        const fallback = list[0]?.id != null ? String(list[0].id) : ''

        const pick = savedValid ? String(saved) : fallback
        if (pick && pick !== String(activeBoardId || '')) {
          localStorage.setItem(LS_ACTIVE_BOARD_KEY, pick)
          setActiveBoardId(pick)
        }
      } catch (err) {
        console.error('[BOARDS] listBoards failed:', err)
      }
    })()
    return () => { abort = true }
    // NB: NON mettere activeBoardId tra le dipendenze (evita loop)
  }, [isAPI, auth?.token])

  // Quando cambia board: persisti + reset UI + carica tasks/tags
  useEffect(() => {
    if (!isAPI) return
    const token = localStorage.getItem('nb_token')
    if (!token) return
    if (!activeBoardId) return

    localStorage.setItem(LS_ACTIVE_BOARD_KEY, String(activeBoardId))

    // reset “local UI state” legata alla board
    setTasksApi([])
    setTags([])
    setSelectedTagId('')
    setActiveTagFilterId(null)
    setEditingId(null)
    setActiveTab('tasks')

    let abort = false
    ;(async () => {
      try {
        const [ts, tgs] = await Promise.all([
          storage.listTasks(activeBoardId),
          storage.listTags(activeBoardId),
        ])
        if (abort) return
        setTasksApi(Array.isArray(ts) ? ts : [])
        setTags(Array.isArray(tgs) ? tgs : [])
      } catch (err) {
        console.error('[BOARD] reload tasks/tags failed:', err)
      }
    })()

    return () => { abort = true }
  }, [isAPI, auth?.token, activeBoardId])

  // --- Actions: BOARDS ---
  const activeBoardObj = useMemo(
    () => boards.find(b => String(b.id) === String(activeBoardId)),
    [boards, activeBoardId]
  )

  const selectBoard = (id) => {
    const v = String(id)
    localStorage.setItem(LS_ACTIVE_BOARD_KEY, v)
    setActiveBoardId(v)
  }

  const createBoard = async (e) => {
    e.preventDefault()
    if (!isAPI) return
    const title = newBoardTitle.trim()
    if (!title) return
    try {
      const created = await storage.createBoard({ title })
      setBoards(prev => [...prev, created])
      setNewBoardTitle('')
      selectBoard(created.id)
    } catch (err) {
      console.error('[BOARDS] createBoard failed:', err)
      alert('Errore creazione board: ' + err.message)
    }
  }

  const onDeleteBoard = async (id) => {
    const b = boards.find(x => String(x.id) === String(id))
    const label = b ? `“${b.title}”` : `ID ${id}`
    if (!confirm(`Eliminare la board ${label}? Verranno eliminati anche i task/tag associati.`)) return

    try {
      await storage.deleteBoard(id)

      setBoards(prev => prev.filter(x => String(x.id) !== String(id)))

      // se elimini quella attiva: scegli fallback
      if (String(activeBoardId) === String(id)) {
        const remaining = boards.filter(x => String(x.id) !== String(id))
        const nextId = remaining[0]?.id ? String(remaining[0].id) : ''
        if (nextId) {
          localStorage.setItem(LS_ACTIVE_BOARD_KEY, nextId)
          setActiveBoardId(nextId)
        } else {
          localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
          setActiveBoardId('')
          setTasksApi([])
          setTags([])
        }
      }
    } catch (err) {
      console.error('[BOARDS] deleteBoard failed:', err)
      alert('Errore eliminazione board: ' + err.message)
    }
  }


  // --- Actions: TAGS ---
  async function onCreateTag(e){
    e.preventDefault()
    const name = newTagName.trim()
    if (!name) return
    try {
      const created = await storage.createTag({
        name,
        color: newTagColor || undefined,
        ...(isAPI ? { board_id: activeBoardId } : {}),
      })
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
      if (isAPI) await storage.deleteTag(id, activeBoardId)
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
    if (isAPI && !activeBoardId) {
      alert('Seleziona prima una board.'); return
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
      board_id: activeBoardId || undefined,
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
        priority: selectedPriority,
        board_id: activeBoardId,
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
      return {
        ...t,
        title: (editingTitle || '').trim() || t.title,
        description: (editingDesc || '').trim(),
        updated_at: new Date().toISOString(),
        tags: chosenTag ? [chosenTag] : [],
        priority: editingPriority
      }
    }))
    setEditingId(null)
    if (isAPI) {
      const payload = {}
      if (newTitle) payload.title = newTitle
      payload.description = newDesc
      payload.tag_ids = chosenTag ? [chosenTag.id] : []
      payload.priority = editingPriority
      const n = Number(id)
      storage.updateTask(Number.isFinite(n) ? n : id, payload, activeBoardId)
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
    if (isAPI) storage.deleteTask(id, activeBoardId).catch(err => console.error('[TASKS] deleteTask failed:', err))
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
      storage.updateTask(Number.isFinite(n)? n : id, { status: targetStatus }, activeBoardId)
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
    useDragAndDrop(currentTasks, setCurrentTasks, storage, activeBoardId)

  // ---- Auth gating ----
  async function logout(){
    await logoutFirebase().catch(()=>{})
    localStorage.removeItem('nb_token')
    localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
    setActiveBoardId('')
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

  // ---- Board gating (API): se non selezionata, mostra picker ----
  if (isAPI && !activeBoardId) {
    return (
      <div className="container">
        <header className="header">
          <h1>Noteboard</h1>
          <div className="header-right">
            <UserAvatar user={auth?.user} />
            <button className="btn" onClick={logout}>Logout</button>
          </div>
        </header>

        <h2 style={{ marginTop: 12 }}>Seleziona una board</h2>

        <form onSubmit={createBoard} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input
            className="input"
            value={newBoardTitle}
            onChange={(e)=>setNewBoardTitle(e.target.value)}
            placeholder="Nome board…"
          />
          <button className="primaryBtn" type="submit">Crea</button>
        </form>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {boards.length ? boards.map(b => (
            <button key={b.id} className="btn" onClick={()=>selectBoard(b.id)}>
              {b.title}
            </button>
          )) : <span style={{ opacity: 0.7 }}>Nessuna board. Creane una.</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Riga superiore: logo + selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0 }}>Noteboard</h1>

            {/* Board selector (API) */}
            {isAPI && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="btn"
                  value={activeBoardId}
                  onChange={(e) => selectBoard(e.target.value)}
                  title="Seleziona board"
                  style={{ fontWeight: 600 }}
                >
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>
                      {String(b.id) === String(activeBoardId) ? `✓ ${b.title}` : b.title}
                    </option>
                  ))}
                </select>

                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
                    setActiveBoardId('')
                  }}
                  title="Cambia board"
                >
                  Cambia
                </button>
              </div>
            )}
          </div>

          {/* Titolo board BEN VISIBILE (coerente, senza bordo/box) */}
          {isAPI && activeBoardObj && (
            <div
              style={{
                marginTop: 6,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.35)',     // primary light
                background: 'rgba(59,130,246,0.08)',          // primary soft
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                maxWidth: 420,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1d4ed8', // primary scuro
                  opacity: 0.9,
                }}
              >
                Board attiva
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: -0.2,
                  color: '#0f172a', // quasi-black (leggibilità)
                }}
              >
                {activeBoardObj.title}
              </div>
            </div>
          )}
        </div>

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
        <button
          type="button"
          className={activeTab === 'boards' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('boards')}
        >
          Board Manager
        </button>

      </nav>

      {/* CONTENUTO SCHEDE */}
      {activeTab === 'boards' ? (
          <BoardManager
            isAPI={isAPI}
            boards={boards}
            activeBoardId={activeBoardId}
            onSelectBoard={(id) => selectBoard(id)}
            newBoardTitle={newBoardTitle}
            setNewBoardTitle={setNewBoardTitle}
            onCreateBoard={createBoard}
            onDeleteBoard={onDeleteBoard}
          />
        ) : activeTab === 'tags' ? (
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
