import React, { useMemo, useState } from 'react'
import Column from './components/Column'
import useLocalStorage from './hooks/useLocalStorage'
import useDragAndDrop from './hooks/useDragAndDrop'
import { STATUSES, LABELS, LS_KEY } from './utils/constants'
import { uid, byIndex, normalizeOrder } from './utils/helpers'
import './styles.css'

export default function App() {
  const [tasks, setTasks] = useLocalStorage(LS_KEY, [])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return tasks
    const q = query.toLowerCase()
    return tasks.filter(t => t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q))
  }, [tasks, query])

  const columns = useMemo(() => {
    const by = { todo: [], in_progress: [], done: [] }
    filtered.forEach(t => by[t.status].push(t))
    STATUSES.forEach(s => by[s].sort(byIndex))
    return by
  }, [filtered])

  const counters = useMemo(() => ({ total: filtered.length }), [filtered])

  const { onCardDragStart, onColumnDragOver, onColumnDrop } = useDragAndDrop(tasks, setTasks)

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
    setTasks(prev => [...prev, newTask])
    setTitle(''); setDesc('')
  }

  function startEdit(task){
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingDesc(task.description || '')
  }

  function saveEdit(id){
    setTasks(prev => prev.map(t => t.id===id ? { ...t, title: editingTitle.trim()||t.title, description: editingDesc, updated_at: new Date().toISOString() } : t))
    setEditingId(null)
  }

  function cancelEdit(){ setEditingId(null) }

  function removeTask(id){
    setTasks(prev => {
      const victim = prev.find(t=>t.id===id)
      const rest = prev.filter(t=>t.id!==id)
      if (victim){
        const same = rest.filter(t=>t.status===victim.status).sort(byIndex)
        same.forEach((t,i)=> t.order_index=i)
      }
      return [...rest]
    })
  }

  function moveTo(id, targetStatus){
    setTasks(prev => {
      const next = prev.map(t => ({ ...t }))
      const i = next.findIndex(t => t.id === id)
      if (i === -1) return prev
      if (next[i].status === targetStatus) return prev
      next[i].status = targetStatus
      next[i].updated_at = new Date().toISOString()
      return normalizeOrder(next)
    })
  }

  


  function clearDone(){ setTasks(prev => prev.filter(t=>t.status!=='done')) }

  function exportJSON(){
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
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
        if (Array.isArray(data)) setTasks(normalizeOrder(data))
      } catch { alert('File JSON non valido') }
    }
    reader.readAsText(file)
    ev.target.value = ''
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Noteboard</h1>
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
          <Column key={s}
            status={s}
            tasks={columns[s]}
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
