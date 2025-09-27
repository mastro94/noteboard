import React from 'react'

export default function Card({ task, isEditing, editingTitle, setEditingTitle, editingDesc, setEditingDesc, onSaveEdit, onCancelEdit, onEditStart, onRemove, onMoveLeft, onMoveRight, onDragStart, disableLeft, disableRight }) {
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
          <div className="cardActions">
            <button className="primaryBtn" onClick={() => onSaveEdit(task.id)}>Salva</button>
            <button className="btn" onClick={onCancelEdit}>Annulla</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="cardTitle">{task.title}</div>
          {task.description && <div className="cardDesc">{task.description}</div>}
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
