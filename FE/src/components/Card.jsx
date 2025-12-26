import React, { useEffect, useRef, useState, useMemo } from 'react'

export default function Card({
  task,

  isEditing,
  editingTitle,
  setEditingTitle,
  editingDesc,
  setEditingDesc,
  onSaveEdit,
  onCancelEdit,

  onEditStart,
  onRemove,
  onMoveLeft,
  onMoveRight,

  onDragStart,
  disableLeft,
  disableRight,

  editingTagId,
  setEditingTagId,
  tagsList,

  editingPriority,
  setEditingPriority,

  // ✅ NEW: assignee
  boardUsers = [],
  editingAssigneeId,
  setEditingAssigneeId,
  canAssign = true,

  // ✅ permessi UI
  canDrag = true,
  canEdit = true,
  canMove = true,
  canDelete = true,
}) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const tagDropdownRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!tagDropdownRef.current) return
      if (!tagDropdownRef.current.contains(e.target)) setTagDropdownOpen(false)
    }
    function onEsc(e) {
      if (e.key === 'Escape') setTagDropdownOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST']

  const chosenTag = (tagsList || []).find(t => String(t.id) === String(editingTagId))
  const dragTitle = canDrag ? 'Trascina per spostare nella colonna desiderata' : 'Non hai i permessi per spostare questo task'

  const assigneeObj = useMemo(() => {
    const id = task?.assignee_id
    if (id == null || id === '') return null
    return (boardUsers || []).find(u => String(u.id) === String(id)) || null
  }, [task?.assignee_id, boardUsers])

  const canEditAssignee = !!canEdit && !!canAssign
  const safeBoardUsers = Array.isArray(boardUsers) ? boardUsers : []

  return (
    <div
      draggable={!!canDrag}
      onDragStart={(e) => {
        if (!canDrag) { e.preventDefault(); return }
        onDragStart?.(e, task)
      }}
      className="card"
      title={dragTitle}
      style={!canDrag ? { opacity: 0.92, cursor: 'not-allowed' } : undefined}
    >
      {isEditing ? (
        <div>
          <input
            className="input"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            disabled={!canEdit}
          />
          <textarea
            className="textarea"
            rows={3}
            value={editingDesc}
            onChange={(e) => setEditingDesc(e.target.value)}
            disabled={!canEdit}
          />

          {/* tag + priorità + assignee */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8, flexWrap:'wrap' }}>
            {/* dropdown tag */}
            <div ref={tagDropdownRef} style={{ position:'relative' }}>
              <button
                type="button"
                className="tagSelectBtn"
                onClick={() => canEdit && setTagDropdownOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={tagDropdownOpen}
                title="Seleziona un tag (opzionale)"
                disabled={!canEdit}
                style={!canEdit ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
              >
                {!chosenTag ? (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <span className="tagSwatch" style={{ background:'#e5e7eb' }} />
                    <span>— nessun tag —</span>
                  </span>
                ) : (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <span className="tagSwatch" style={{ background: chosenTag.color || '#e5e7eb' }} />
                    <span>{chosenTag.name}</span>
                  </span>
                )}
                <span aria-hidden="true" style={{ marginLeft:8 }}>▾</span>
              </button>

              {tagDropdownOpen && canEdit ? (
                <div
                  role="listbox"
                  style={{
                    position:'absolute',
                    top:'calc(100% + 6px)',
                    left:0,
                    zIndex:20,
                    minWidth:260,
                    maxHeight:220,
                    overflow:'auto',
                    borderRadius:10,
                    border:'1px solid rgba(0,0,0,0.12)',
                    background:'#fff',
                    boxShadow:'0 10px 25px rgba(0,0,0,0.12)',
                    padding:6,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    style={{ width:'100%', textAlign:'left' }}
                    onClick={() => { setEditingTagId(''); setTagDropdownOpen(false) }}
                  >
                    — nessun tag —
                  </button>

                  {(tagsList || []).map(tg => (
                    <button
                      key={tg.id}
                      type="button"
                      className="btn"
                      style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}
                      onClick={() => { setEditingTagId(String(tg.id)); setTagDropdownOpen(false) }}
                    >
                      <span className="tagSwatch" style={{ background: tg.color || '#e5e7eb' }} />
                      <span>{tg.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* priorità */}
            <select
              className="btn"
              value={editingPriority || 'LOW'}
              onChange={(e) => setEditingPriority(e.target.value)}
              disabled={!canEdit}
              title="Priorità"
              style={{ fontWeight: 600 }}
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* ✅ assignee */}
            <select
              className="btn"
              value={String(editingAssigneeId ?? '')}
              onChange={(e) => setEditingAssigneeId?.(e.target.value)}
              disabled={!canEditAssignee}
              title={!canEditAssignee ? 'Permessi insufficienti' : 'Assegna a'}
              style={{ fontWeight: 600, minWidth: 200 }}
            >
              <option value="">— Non assegnato —</option>
              {safeBoardUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.username || u.email || `User ${u.id}`}
                  {u.role ? ` (${u.role})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="cardActions" style={{ marginTop: 10 }}>
            <button
              className="primaryBtn"
              onClick={() => onSaveEdit(task.id)}
              disabled={!canEdit}
              title={!canEdit ? 'Permessi insufficienti' : 'Salva'}
            >
              Salva
            </button>
            <button className="btn" onClick={onCancelEdit}>Annulla</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{task.title}</div>

          {task.description ? (
            <div style={{ marginTop: 6, opacity: 0.9, whiteSpace:'pre-wrap' }}>{task.description}</div>
          ) : null}

          {/* ✅ assignee (view) */}
          {task.assignee_id != null && task.assignee_id !== '' && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span
                className="tagChip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  lineHeight: '18px',
                  backgroundColor: '#eef2ff',
                  color: '#111827'
                }}
                title={`Assegnato a: ${assigneeObj?.username || assigneeObj?.email || task.assignee_id}`}
              >
                👤 <span style={{ fontWeight: 700 }}>Assignee:</span>{' '}
                <span>{assigneeObj?.username || assigneeObj?.email || task.assignee_id}</span>
              </span>
            </div>
          )}

          {/* badge priorità */}
          {task.priority && (
            <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
              <span
                className="prioBadge"
                data-prio={task.priority}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:6,
                  padding:'3px 8px',
                  borderRadius:999,
                  fontSize:13,
                  background:'#f9fafb'
                }}
                title={`Priorità: ${task.priority}`}
              >
                {task.priority === 'LOW' && '🟢'}
                {task.priority === 'MEDIUM' && '🟡'}
                {task.priority === 'HIGH' && '🟠'}
                {task.priority === 'HIGHEST' && '🔴'}
                <span>{task.priority}</span>
              </span>
            </div>
          )}

          {/* chips tag */}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <div className="tagsRow" style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {task.tags.map(tag => (
                <span
                  key={tag.id}
                  className="tagChip"
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: '18px',
                    backgroundColor: tag.color || '#e5e7eb',
                    color: '#111827'
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="cardActions">
            <button
              className="btn"
              onClick={() => onMoveLeft(task.id)}
              disabled={disableLeft || !canMove}
              title={!canMove ? 'Permessi insufficienti' : 'Sposta a sinistra'}
            >
              ⟵
            </button>
            <button
              className="btn"
              onClick={() => onMoveRight(task.id)}
              disabled={disableRight || !canMove}
              title={!canMove ? 'Permessi insufficienti' : 'Sposta a destra'}
            >
              ⟶
            </button>
            <button
              className="btn"
              onClick={() => onEditStart(task)}
              disabled={!canEdit}
              title={!canEdit ? 'Permessi insufficienti' : 'Modifica'}
            >
              Modifica
            </button>
            <button
              className="dangerBtn"
              onClick={() => onRemove(task.id)}
              disabled={!canDelete}
              title={!canDelete ? 'Permessi insufficienti' : 'Elimina'}
            >
              Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
