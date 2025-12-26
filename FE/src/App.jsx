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
  login: '#/login',
  signup: '#/signup',
  board: '#/board',
  reset: '#/reset',
  invite: '#/invite',
}

const PENDING_INVITE_KEY = 'nb_pending_invite_token'

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

// Priorità + emoji
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST']
export const PRIORITY_EMOJI = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  HIGHEST: '🔴',
}

function getHashQueryParam(name) {
  const h = window.location.hash || ''
  const qIndex = h.indexOf('?')
  if (qIndex === -1) return null
  const qs = h.slice(qIndex + 1)
  return new URLSearchParams(qs).get(name)
}

function InvitePage({ token, onDone }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let abort = false
    setErr('')
    setData(null)
    storage
      .previewInvite(token)
      .then((d) => {
        if (!abort) setData(d)
      })
      .catch((e) => {
        if (!abort) setErr(e?.message || 'Errore invito')
      })
    return () => {
      abort = true
    }
  }, [token])

  async function accept() {
    setErr('')
    try {
      setLoading(true)
      const res = await storage.acceptInvite(token) // { ok, board_id }
      onDone(res?.board_id)
    } catch (e) {
      setErr(e?.message || 'Accettazione non riuscita')
    } finally {
      setLoading(false)
    }
  }

  const boardTitle = data?.board?.title
  const status = data?.status

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Invito a board</h2>

        {err ? <div style={{ marginBottom: 10, color: '#b42318', fontSize: 13 }}>{String(err)}</div> : null}

        {boardTitle ? (
          <>
            <p style={{ margin: '8px 0' }}>
              Board: <b>{boardTitle}</b>
            </p>
            <p style={{ margin: '8px 0', opacity: 0.85 }}>
              Stato: <b>{status}</b>
            </p>

            <button
              className="primaryBtn"
              onClick={accept}
              disabled={loading || status !== 'pending'}
              title={status !== 'pending' ? 'Invito non più accettabile' : 'Accetta invito'}
            >
              {loading ? 'Accetto…' : 'Accetta invito'}
            </button>
          </>
        ) : (
          <p style={{ opacity: 0.7 }}>Caricamento invito…</p>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => (window.location.hash = ROUTES.board)}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
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

  // ✅ Role on board (admin/editor/viewer)
  const [boardRole, setBoardRole] = useState('viewer')

  // ✅ NEW: users in board (owner + members)
  const [boardUsers, setBoardUsers] = useState([])

  // --- New Task form ---
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [query, setQuery] = useState('')

  // ✅ NEW: assignee in "create"
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')

  // --- Edit Task ---
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')
  // ✅ NEW: assignee in "edit"
  const [editingAssigneeId, setEditingAssigneeId] = useState('')

  // --- Tags ---
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0].hex)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [activeTagFilterId, setActiveTagFilterId] = useState(null)
  const [editingTagId, setEditingTagId] = useState('')

  // --- Priorità ---
  const [selectedPriority, setSelectedPriority] = useState('LOW')
  const [editingPriority, setEditingPriority] = useState('LOW')

  // --- Tabs ---
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'tags' | 'boards'

  // ---- Permessi (FE) ----
  const myUserId = auth?.user?.id ?? auth?.user?.user_id ?? auth?.user?.uid ?? null
  const canInvite = !isAPI ? false : boardRole === 'admin'
  const canCreateTask = !isAPI ? true : boardRole === 'admin' || boardRole === 'editor'
  const canAssignToOthers = !isAPI ? true : boardRole === 'admin' // editor solo a sé (enforced by BE)
  const canRenameBoard = !isAPI ? false : boardRole === 'admin'

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
          setBoardUsers([])
          setActiveBoardId('')
          setBoardRole('viewer')
          setSelectedAssigneeId('')
          setEditingAssigneeId('')
          if (
            !route.startsWith(ROUTES.login) &&
            !route.startsWith(ROUTES.signup) &&
            !route.startsWith(ROUTES.reset) &&
            !route.startsWith(ROUTES.invite)
          ) {
            window.location.hash = ROUTES.login
          }
          return
        }

        const idToken = await getFirebaseIdToken()
        if (!idToken) return
        const session = await exchangeFirebaseToken(idToken) // { token, user }
        localStorage.setItem('nb_token', session.token)
        setAuth({ token: session.token, user: session.user })

        const pending = localStorage.getItem(PENDING_INVITE_KEY)
        if (pending) {
          window.location.hash = `${ROUTES.invite}?token=${encodeURIComponent(pending)}`
        } else if (route.startsWith(ROUTES.login) || route.startsWith(ROUTES.signup) || route.startsWith(ROUTES.reset)) {
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
    storage
      .me()
      .then((user) => {
        setAuth((prev) => (prev ? { ...prev, user } : { token, user }))
      })
      .catch((err) => console.error('[AUTH] /me failed:', err))
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
        const savedValid = saved && list.some((b) => String(b.id) === String(saved))
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
    return () => {
      abort = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAPI, auth?.token])

  // When board changes: load role + tasks/tags + users
  useEffect(() => {
    if (!isAPI) return
    const token = localStorage.getItem('nb_token')
    if (!token) return
    if (!activeBoardId) return

    localStorage.setItem(LS_ACTIVE_BOARD_KEY, String(activeBoardId))

    setTasksApi([])
    setTags([])
    setBoardUsers([])
    setSelectedTagId('')
    setActiveTagFilterId(null)
    setEditingId(null)
    setEditingAssigneeId('')
    setSelectedAssigneeId('')
    setActiveTab('tasks')

    let abort = false
    ;(async () => {
      try {
        // 1) ruolo sulla board
        const roleRes = await storage.getMyBoardRole(activeBoardId).catch(() => null)
        if (!abort) setBoardRole(roleRes?.role || 'viewer')

        // 2) users + tasks + tags
        const [users, ts, tgs] = await Promise.all([
          storage.listBoardUsers(activeBoardId).catch(() => []),
          storage.listTasks(activeBoardId),
          storage.listTags(activeBoardId),
        ])
        if (abort) return
        setBoardUsers(Array.isArray(users) ? users : [])
        setTasksApi(Array.isArray(ts) ? ts : [])
        setTags(Array.isArray(tgs) ? tgs : [])
      } catch (err) {
        console.error('[BOARD] reload tasks/tags/users failed:', err)
      }
    })()

    return () => {
      abort = true
    }
  }, [isAPI, auth?.token, activeBoardId])

  // --- Actions: BOARDS ---
  const activeBoardObj = useMemo(
    () => boards.find((b) => String(b.id) === String(activeBoardId)),
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
    const t = newBoardTitle.trim()
    if (!t) return
    try {
      const created = await storage.createBoard({ title: t })
      setBoards((prev) => [...prev, created])
      setNewBoardTitle('')
      selectBoard(created.id)
    } catch (err) {
      console.error('[BOARDS] createBoard failed:', err)
      alert('Errore creazione board: ' + err.message)
    }
  }

  const onDeleteBoard = async (id) => {
    const b = boards.find((x) => String(x.id) === String(id))
    const label = b ? `“${b.title}”` : `ID ${id}`
    if (!confirm(`Eliminare la board ${label}? Verranno eliminati anche i task/tag associati.`)) return

    try {
      await storage.deleteBoard(id)
      setBoards((prev) => prev.filter((x) => String(x.id) !== String(id)))

      if (String(activeBoardId) === String(id)) {
        const remaining = boards.filter((x) => String(x.id) !== String(id))
        const nextId = remaining[0]?.id ? String(remaining[0].id) : ''
        if (nextId) {
          localStorage.setItem(LS_ACTIVE_BOARD_KEY, nextId)
          setActiveBoardId(nextId)
        } else {
          localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
          setActiveBoardId('')
          setTasksApi([])
          setTags([])
          setBoardUsers([])
          setBoardRole('viewer')
        }
      }
    } catch (err) {
      console.error('[BOARDS] deleteBoard failed:', err)
      alert('Errore eliminazione board: ' + err.message)
    }
  }

  const onRenameBoard = async (boardId, newTitle) => {
    if (!isAPI) return
    if (!canRenameBoard) {
      alert('Permessi insufficienti.')
      return
    }

    const title = (newTitle || '').trim()
    if (!title) return

    try {
      const updated = await storage.renameBoard(boardId, { title }) // PATCH /boards/:id
      setBoards((prev) =>
        (prev || []).map((b) => (String(b.id) === String(boardId) ? { ...b, ...updated } : b))
      )
    } catch (err) {
      console.error('[BOARDS] renameBoard failed:', err)
      alert('Errore rinomina board: ' + (err?.message || 'unknown'))
      throw err
    }
  }

  // --- Actions: INVITES ---
  const onCreateInvite = async (boardId, email, role) => {
    return storage.createInvite(boardId, { email, role })
  }

  function assertCanEditTaskById(taskId) {
    if (!isAPI) return true
    if (boardRole === 'admin') return true
    if (boardRole === 'viewer') return false
    const t = (currentTasks || []).find((x) => String(x.id) === String(taskId))
    if (!t) return false
    if (boardRole === 'editor') {
      if (myUserId == null) return false
      return String(t.user_id) === String(myUserId)
    }
    return false
  }

  // --- Actions: TAGS ---
  async function onCreateTag(e) {
    e.preventDefault()
    if (isAPI && boardRole !== 'admin') {
      alert('Permessi insufficienti.')
      return
    }
    const name = newTagName.trim()
    if (!name) return
    try {
      const created = await storage.createTag({
        name,
        color: newTagColor || undefined,
        ...(isAPI ? { board_id: activeBoardId } : {}),
      })
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName('')
      setNewTagColor(PRESET_COLORS[0].hex)
    } catch (err) {
      alert('Errore creazione tag: ' + err.message)
    }
  }

  async function onDeleteTag(id) {
    if (isAPI && boardRole !== 'admin') {
      alert('Permessi insufficienti.')
      return
    }
    const tag = tags.find((t) => String(t.id) === String(id))
    const label = tag ? `“${tag.name}”` : `ID ${id}`
    if (!confirm(`Eliminare il tag ${label}?`)) return
    try {
      if (isAPI) await storage.deleteTag(id, activeBoardId)
      setTags((prev) => prev.filter((t) => String(t.id) !== String(id)))
      setSelectedTagId((prev) => (String(prev) === String(id) ? '' : prev))
      setActiveTagFilterId((prev) => (String(prev) === String(id) ? null : prev))
      setEditingTagId((prev) => (String(prev) === String(id) ? '' : prev))
      setCurrentTasks((prev) => {
        const next = (prev || []).map((task) => {
          if (!Array.isArray(task.tags) || task.tags.length === 0) return task
          const cleaned = task.tags.filter((t) => String(t.id) !== String(id))
          if (cleaned.length === task.tags.length) return task
          return { ...task, tags: cleaned }
        })
        return next
      })
    } catch (e) {
      console.error('[TAGS] delete failed:', e)
      alert("Errore durante l’eliminazione del tag.")
    }
  }

  // --- Actions: TASKS ---
  function addTask(e) {
    e.preventDefault()
    if (isAPI && !canCreateTask) {
      alert('Permessi insufficienti.')
      return
    }

    const t = title.trim()
    if (!t) return
    if (!PRIORITIES.includes(selectedPriority)) setSelectedPriority('LOW')
    if (isAPI && !localStorage.getItem('nb_token')) {
      alert('Devi essere loggato per creare task.')
      return
    }
    if (isAPI && !activeBoardId) {
      alert('Seleziona prima una board.')
      return
    }

    // ✅ assignee policy FE (BE enforces anyway)
    let assigneeForCreate = selectedAssigneeId
    if (!canAssignToOthers) {
      assigneeForCreate = String(myUserId ?? '')
    }
    if (assigneeForCreate === '') assigneeForCreate = null

    const chosenTag = tags.find((x) => String(x.id) === String(selectedTagId))
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
      user_id: myUserId || undefined,
      assignee_id: assigneeForCreate ?? null,
    }

    setCurrentTasks((prev) => {
      const next = [...prev, newTask]
      next
        .filter((tt) => tt.status === 'todo')
        .sort(byIndex)
        .forEach((tt, i) => (tt.order_index = i))
      return next
    })
    setTitle('')
    setDesc('')
    setSelectedAssigneeId('')

    if (isAPI) {
      storage
        .createTask({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          tag_ids: chosenTag ? [chosenTag.id] : [],
          priority: selectedPriority,
          board_id: activeBoardId,
          assignee_id: newTask.assignee_id,
        })
        .then((created) => {
          setCurrentTasks((curr) => {
            const idx = curr.findIndex((x) => x.title === newTask.title && x.created_at === newTask.created_at)
            if (idx >= 0) {
              const copy = [...curr]
              copy[idx] = { ...created }
              return copy
            }
            return curr
          })
        })
        .catch((err) => console.error('[TASKS] createTask failed:', err))
    }
  }

  function startEdit(task) {
    if (isAPI && !assertCanEditTaskById(task.id)) {
      alert('Permessi insufficienti.')
      return
    }
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingDesc(task.description || '')
    setEditingTagId(String(task?.tags?.[0]?.id ?? ''))
    setEditingPriority(task?.priority || 'LOW')
    setEditingAssigneeId(String(task?.assignee_id ?? ''))
  }

  function saveEdit(id) {
    if (isAPI && !assertCanEditTaskById(id)) {
      alert('Permessi insufficienti.')
      return
    }

    const newTitle = (editingTitle || '').trim()
    const newDesc = (editingDesc || '').trim()
    const chosenTag = tags.find((x) => String(x.id) === String(editingTagId))

    let nextAssignee = editingAssigneeId
    if (!canAssignToOthers) {
      nextAssignee = String(myUserId ?? '')
    }
    if (nextAssignee === '') nextAssignee = null

    setCurrentTasks((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(id)) return t
        return {
          ...t,
          title: newTitle || t.title,
          description: newDesc,
          updated_at: new Date().toISOString(),
          tags: chosenTag ? [chosenTag] : [],
          priority: editingPriority,
          assignee_id: nextAssignee ?? null,
        }
      })
    )
    setEditingId(null)

    if (isAPI) {
      const payload = {}
      if (newTitle) payload.title = newTitle
      payload.description = newDesc
      payload.tag_ids = chosenTag ? [chosenTag.id] : []
      payload.priority = editingPriority
      payload.assignee_id = nextAssignee

      const n = Number(id)
      storage
        .updateTask(Number.isFinite(n) ? n : id, payload, activeBoardId)
        .catch((err) => console.error('[TASKS] PATCH title/desc/priority/assignee failed:', err))
    }
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function removeTask(id) {
    if (isAPI && !assertCanEditTaskById(id)) {
      alert('Permessi insufficienti.')
      return
    }

    setCurrentTasks((prev) => {
      const victim = prev.find((t) => String(t.id) === String(id))
      const rest = prev.filter((t) => String(t.id) !== String(id))
      if (victim) {
        rest
          .filter((t) => t.status === victim.status)
          .sort(byIndex)
          .forEach((t, i) => (t.order_index = i))
      }
      return [...rest]
    })
    if (isAPI) storage.deleteTask(id, activeBoardId).catch((err) => console.error('[TASKS] deleteTask failed:', err))
  }

  function moveTo(id, targetStatus) {
    if (isAPI && !assertCanEditTaskById(id)) {
      alert('Permessi insufficienti.')
      return
    }

    setCurrentTasks((prev) => {
      const next = prev.map((t) => ({ ...t }))
      const i = next.findIndex((t) => String(t.id) === String(id))
      if (i === -1) return prev
      if (next[i].status === targetStatus) return prev
      next[i].status = targetStatus
      next[i].updated_at = new Date().toISOString()
      return normalizeOrder(next)
    })

    if (isAPI) {
      const n = Number(id)
      storage
        .updateTask(Number.isFinite(n) ? n : id, { status: targetStatus }, activeBoardId)
        .catch((err) => console.error('[TASKS] PATCH status failed:', err))
    }
  }

  // ---- Filtering (testo + tag toggle) ----
  const filtered = useMemo(() => {
    const base = Array.isArray(currentTasks) ? currentTasks : []
    const byText = (() => {
      if (!query.trim()) return base
      const q = query.toLowerCase()
      return base.filter(
        (t) => (t?.title || '').toLowerCase().includes(q) || (t?.description || '').toLowerCase().includes(q)
      )
    })()
    if (!activeTagFilterId) return byText
    return byText.filter((t) => Array.isArray(t.tags) && t.tags.some((tag) => String(tag.id) === String(activeTagFilterId)))
  }, [currentTasks, query, activeTagFilterId])

  const columns = useMemo(() => {
    const by = { todo: [], in_progress: [], done: [] }
    for (const t of filtered) {
      if (t.status === 'todo' || t.status === 'in_progress' || t.status === 'done') by[t.status].push(t)
    }
    STATUSES.forEach((s) => by[s].sort(byIndex))
    return by
  }, [filtered])

  const counters = useMemo(() => ({ total: filtered.length }), [filtered])

  // ✅ permessi al drag hook
  const { onCardDragStart, onColumnDragOver, onColumnDrop } = useDragAndDrop(
    currentTasks,
    setCurrentTasks,
    storage,
    activeBoardId,
    {
      boardRole,
      myUserId,
    }
  )

  // ---- Auth gating ----
  async function logout() {
    await logoutFirebase().catch(() => {})
    localStorage.removeItem('nb_token')
    localStorage.removeItem(LS_ACTIVE_BOARD_KEY)
    setActiveBoardId('')
    setBoardRole('viewer')
    setBoardUsers([])
    setAuth(null)
    window.location.hash = ROUTES.login
  }

  // ---- Tools helpers ----
  function clearDone() {
    setCurrentTasks((prev) => prev.filter((t) => t.status !== 'done'))
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(currentTasks, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kanban-tasks.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  function importJSON(ev) {
    const f = ev.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (Array.isArray(data)) setCurrentTasks(normalizeOrder(data))
      } catch {
        alert('File JSON non valido')
      }
    }
    reader.readAsText(f)
    ev.target.value = ''
  }

  function toggleTagFilter() {
    if (!selectedTagId) return
    setActiveTagFilterId((prev) => (String(prev) === String(selectedTagId) ? null : selectedTagId))
  }

  const sortedTags = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags])
  const selectedTagObj = tags.find((t) => String(t.id) === String(selectedTagId))
  const isFilterActive = activeTagFilterId && String(activeTagFilterId) === String(selectedTagId)

  // ✅ INVITE pre-auth
  if (!auth && route.startsWith(ROUTES.invite)) {
    const token = getHashQueryParam('token')
    if (token) localStorage.setItem(PENDING_INVITE_KEY, token)
    window.location.hash = ROUTES.login
    return null
  }

  // Gate auth
  if (!auth) {
    if (route.startsWith(ROUTES.signup)) return <Register />
    if (route.startsWith(ROUTES.reset)) return <ResetPassword />
    return <Login />
  }

  // ✅ INVITE page (autenticato)
  if (route.startsWith(ROUTES.invite)) {
    const token = getHashQueryParam('token') || localStorage.getItem(PENDING_INVITE_KEY) || ''
    if (!token) {
      return (
        <div className="container">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Invito non valido</h2>
            <button className="btn" onClick={() => (window.location.hash = ROUTES.board)}>
              Vai alla board
            </button>
          </div>
        </div>
      )
    }
    return (
      <InvitePage
        token={token}
        onDone={(boardId) => {
          localStorage.removeItem(PENDING_INVITE_KEY)
          storage
            .listBoards()
            .then((list) => setBoards(Array.isArray(list) ? list : []))
            .catch(() => {})
          if (boardId) selectBoard(boardId)
          window.location.hash = ROUTES.board
        }}
      />
    )
  }

  // ---- Board gating (API): se non selezionata, mostra picker ----
  if (isAPI && !activeBoardId) {
    return (
      <div className="container">
        <header className="header">
          <h1>Noteboard</h1>
          <div className="header-right">
            <UserAvatar user={auth?.user} />
            <button className="btn" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <h2 style={{ marginTop: 12 }}>Seleziona una board</h2>

        <form onSubmit={createBoard} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input
            className="input"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="Nome board…"
          />
          <button className="primaryBtn" type="submit">
            Crea
          </button>
        </form>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {boards.length ? (
            boards.map((b) => (
              <button key={b.id} className="btn" onClick={() => selectBoard(b.id)}>
                {b.title}
              </button>
            ))
          ) : (
            <span style={{ opacity: 0.7 }}>Nessuna board. Creane una.</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0 }}>Noteboard</h1>

            {isAPI && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="btn"
                  value={activeBoardId}
                  onChange={(e) => selectBoard(e.target.value)}
                  title="Seleziona board"
                  style={{ fontWeight: 600 }}
                >
                  {boards.map((b) => (
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

          {isAPI && activeBoardObj && (
            <div
              style={{
                marginTop: 6,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.35)',
                background: 'rgba(59,130,246,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                maxWidth: 520,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', opacity: 0.9 }}>Board attiva</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Ruolo: <b>{boardRole}</b>
                </div>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: -0.2,
                  color: '#0f172a',
                }}
              >
                {activeBoardObj.title}
              </div>
            </div>
          )}
        </div>

        <div className="header-right">
          <UserAvatar user={auth?.user} />
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button type="button" className={activeTab === 'tasks' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tasks')}>
          Nuovo Task & Ricerca
        </button>
        <button type="button" className={activeTab === 'tags' ? 'tab active' : 'tab'} onClick={() => setActiveTab('tags')}>
          Tag Manager
        </button>
        <button type="button" className={activeTab === 'boards' ? 'tab active' : 'tab'} onClick={() => setActiveTab('boards')}>
          Board Manager
        </button>
      </nav>

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
          onCreateInvite={onCreateInvite}
          canInvite={canInvite}
          onRenameBoard={onRenameBoard}
          canRename={canRenameBoard}
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
          title={title}
          setTitle={setTitle}
          desc={desc}
          setDesc={setDesc}
          addTask={addTask}
          query={query}
          setQuery={setQuery}
          exportJSON={exportJSON}
          importJSON={importJSON}
          clearDone={clearDone}
          tags={sortedTags}
          selectedTagId={selectedTagId}
          setSelectedTagId={setSelectedTagId}
          selectedTagObj={selectedTagObj}
          isFilterActive={!!isFilterActive}
          toggleTagFilter={toggleTagFilter}
          selectedPriority={selectedPriority}
          setSelectedPriority={setSelectedPriority}
          PRIORITY_EMOJI={PRIORITY_EMOJI}
          canCreateTask={canCreateTask}
          // ✅ NEW: assignee (create)
          boardUsers={boardUsers}
          selectedAssigneeId={selectedAssigneeId}
          setSelectedAssigneeId={setSelectedAssigneeId}
          canAssignToOthers={canAssignToOthers}
        />
      )}

      {activeTagFilterId && (
        <div style={{ margin: '4px 0 8px', fontSize: 13 }}>
          Filtrando per tag:{' '}
          <strong>{tags.find((t) => String(t.id) === String(activeTagFilterId))?.name || activeTagFilterId}</strong> — clic
          su “Mostra tutti” per rimuovere il filtro.
        </div>
      )}

      <div className="board">
        {STATUSES.map((s) => (
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
            onMoveLeft={(id) => moveTo(id, s === 'done' ? 'in_progress' : 'todo')}
            onMoveRight={(id) => moveTo(id, s === 'todo' ? 'in_progress' : 'done')}
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
            boardRole={boardRole}
            myUserId={myUserId}
            // ✅ NEW: assignee props to Card via Column
            boardUsers={boardUsers}
            editingAssigneeId={editingAssigneeId}
            setEditingAssigneeId={setEditingAssigneeId}
            canAssign={canAssignToOthers || boardRole === 'editor'} // editor: true but BE will restrict to self
          />
        ))}
      </div>
    </div>
  )
}
