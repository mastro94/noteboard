import React from 'react'
import Card from './Card'
import { LABELS } from '../utils/constants'

export default function Column({
  status,
  tasks = [],
  counters = { total: 0 },
  onDragOver,
  onDrop,

  // callback/props
  onRemove,
  onEditStart,
  onMoveLeft,
  onMoveRight,
  onDragStart,
  editingId,
  editingTitle,
  setEditingTitle,
  editingDesc,
  setEditingDesc,
  onSaveEdit,
  onCancelEdit,
  editingTagId,
  setEditingTagId,
  tagsList,

  // nuova gestione priorità in edit
  editingPriority,
  setEditingPriority,
}) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const total = typeof counters?.total === 'number' ? counters.total : safeTasks.length

  return (
    <div className="column" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="columnHeader">
        <h2 style={{ margin: 0 }}>{LABELS[status]}</h2>
        <span className="count">{safeTasks.length}/{total}</span>
      </div>
      <div>
        {safeTasks.map((t) => (
          <Card
            key={t.id}
            task={t}
            disableLeft={status === 'todo'}
            disableRight={status === 'done'}

            /* callback base */
            onRemove={onRemove}
            onEditStart={onEditStart}
            onMoveLeft={onMoveLeft}
            onMoveRight={onMoveRight}
            onDragStart={onDragStart}

            /* stato di editing titolo/descrizione */
            isEditing={editingId === t.id}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            editingDesc={editingDesc}
            setEditingDesc={setEditingDesc}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}

            /* tag in edit */
            editingTagId={editingTagId}
            setEditingTagId={setEditingTagId}
            tagsList={tagsList}

            /* priorità in edit */
            editingPriority={editingPriority}
            setEditingPriority={setEditingPriority}
          />
        ))}
      </div>
    </div>
  )
}
