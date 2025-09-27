import React from 'react'
import Card from './Card'
import { LABELS } from '../utils/constants'

export default function Column({ status, tasks, counters, onDragOver, onDrop, onRemove, onEditStart, onMoveLeft, onMoveRight, onDragStart, editingId, editingTitle, setEditingTitle, editingDesc, setEditingDesc, onSaveEdit, onCancelEdit }) {
  const { total } = counters
  return (
    <div className="column" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="columnHeader">
        <h2 style={{ margin: 0 }}>{LABELS[status]}</h2>
        <span className="count">{tasks.length}/{total}</span>
      </div>
      <div>
        {tasks.map((t) => (
          <Card key={t.id}
            task={t}
            disableLeft={status === 'todo'}
            disableRight={status === 'done'}
            onRemove={onRemove}
            onEditStart={onEditStart}
            onMoveLeft={onMoveLeft}
            onMoveRight={onMoveRight}
            onDragStart={onDragStart}
            isEditing={editingId === t.id}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            editingDesc={editingDesc}
            setEditingDesc={setEditingDesc}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        ))}
      </div>
    </div>
  )
}
