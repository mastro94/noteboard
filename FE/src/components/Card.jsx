import React, { useEffect, useRef, useState } from 'react'

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
  tagsList
}) {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const tagDropdownRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (!tagDropdownRef.current) return
      if (!tagDropdownRef.current.contains(e.target)) {
        setTagDropdownOpen(false)
      }
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


  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="card"
      title="Trascina per spostare nella colonna desiderata"
    >
      {isEditing ? (
        <div>
          <input className="input" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
          <textarea className="textarea" rows={3} value={editingDesc} onChange={(e) => setEditingDesc(e.target.value)} />
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
            <div ref={tagDropdownRef} style={{ position:'relative' }}>
  <button
    type="button"
    className="tagSelectBtn"
    onClick={() => setTagDropdownOpen(v => !v)}
    aria-haspopup="listbox"
    aria-expanded={tagDropdownOpen}
    title="Seleziona un tag (opzionale)"
  >
    {(() => {
      const chosen = (tagsList || []).find(t => String(t.id) === String(editingTagId))
      if (!chosen) {
        return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <span className="tagSwatch" style={{ background:'#e5e7eb' }} />
            <span>— nessun tag —</span>
          </span>
        )
      }
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <span className="tagSwatch" style={{ background: chosen.color || '#e5e7eb' }} />
          <span>{chosen.name}</span>
        </span>
      )
    })()}
    <span aria-hidden="true" style={{ marginLeft:8 }}>▾</span>
  </button>

  {tagDropdownOpen && (
    <div className="tagMenu" role="listbox" tabIndex={-1}>
      <div
        role="option"
        aria-selected={String(editingTagId || '') === ''}
        className="tagMenuItem"
        onClick={() => { setEditingTagId(''); setTagDropdownOpen(false) }}
        title="Nessun tag"
      >
        <span className="tagSwatch" style={{ background:'#e5e7eb' }} />
        <span>— nessun tag —</span>
      </div>

      {(tagsList || []).map(t => (
        <div
          key={t.id}
          role="option"
          aria-selected={String(editingTagId) === String(t.id)}
          className="tagMenuItem"
          onClick={() => { setEditingTagId(String(t.id)); setTagDropdownOpen(false) }}
          title={t.name}
        >
          <span className="tagSwatch" style={{ background: t.color || '#e5e7eb' }} />
          <span>{t.name}</span>
        </div>
      ))}
    </div>
  )}
            </div>

            {/* preview chip del tag scelto */}
            {(() => {
              const chosen = (tagsList || []).find(t => String(t.id) === String(editingTagId))
              if (!chosen) return null
              return (
                <span
                  className="tagChip"
                  style={{
                    display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:12, lineHeight:'18px',
                    backgroundColor: chosen.color || '#e5e7eb', color:'#111827'
                  }}
                >
                  {chosen.name}
                </span>
              )
            })()}
          </div>
          <div className="cardActions">
            <button className="primaryBtn" onClick={() => onSaveEdit(task.id)}>Salva</button>
            <button className="btn" onClick={onCancelEdit}>Annulla</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="cardTitle">{task.title}</div>
          {task.description && <div className="cardDesc">{task.description}</div>}

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
            <button className="btn" onClick={() => onMoveLeft(task.id)} disabled={disableLeft}>⟵</button>
            <button className="btn" onClick={() => onMoveRight(task.id)} disabled={disableRight}>⟶</button>
            <button className="btn" onClick={() => onEditStart(task)}>Modifica</button>
            <button className="dangerBtn" onClick={() => onRemove(task.id)}>Elimina</button>
          </div>
        </div>
      )}
    </div>
  )
}
