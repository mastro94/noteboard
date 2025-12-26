import React from 'react'
import Card from './Card'
import { LABELS } from '../utils/constants'

export default function Column({
  status,
  tasks = [],
  counters = { total: 0 },
  onDragOver,
  onDrop,

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

  editingPriority,
  setEditingPriority,

  // ✅ permessi
  boardRole = 'viewer',
  myUserId = null,

  // ✅ NEW: assignee support
  boardUsers = [],
  editingAssigneeId = '',
  setEditingAssigneeId = () => {},
  canAssign = false,
}) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const total = typeof counters?.total === 'number' ? counters.total : safeTasks.length

  function canEditTask(t) {
    if (!t) return false
    if (boardRole === 'admin') return true
    if (boardRole === 'viewer') return false
    if (boardRole === 'editor') {
      if (myUserId == null) return false
      return String(t.user_id) === String(myUserId)
    }
    return false
  }

  return (
    <div className="column" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="columnHeader">
        <h2 style={{ margin: 0 }}>{LABELS[status]}</h2>
        <span className="count">
          {safeTasks.length}/{total}
        </span>
      </div>

      <div>
        {safeTasks.map((t) => {
          const canEdit = canEditTask(t)
          const canMove = canEdit
          const canDelete = canEdit
          const canDrag = canEdit

          return (
            <Card
              key={t.id}
              task={t}
              disableLeft={status === 'todo'}
              disableRight={status === 'done'}
              onRemove={onRemove}
              onEditStart={onEditStart}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
              onDragStart={onDragStart}
              isEditing={String(editingId) === String(t.id)}
              editingTitle={editingTitle}
              setEditingTitle={setEditingTitle}
              editingDesc={editingDesc}
              setEditingDesc={setEditingDesc}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              editingTagId={editingTagId}
              setEditingTagId={setEditingTagId}
              tagsList={tagsList}
              editingPriority={editingPriority}
              setEditingPriority={setEditingPriority}
              canDrag={canDrag}
              canEdit={canEdit}
              canMove={canMove}
              canDelete={canDelete}
              // ✅ NEW props (assignee)
              boardUsers={boardUsers}
              editingAssigneeId={editingAssigneeId}
              setEditingAssigneeId={setEditingAssigneeId}
              canAssign={canAssign}
            />
          )
        })}
      </div>
    </div>
  )
}
