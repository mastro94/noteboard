import { useRef } from 'react'
import { byIndex } from '../utils/helpers'

export default function useDragAndDrop(tasks, setTasks, storage, boardId) {
  const dragItem = useRef(null) // { id, fromStatus }

  function onCardDragStart(e, task) {
    const target = e.target
    if (target?.closest?.('button, input, textarea, a, [role="button"]')) {
      e.preventDefault()
      return
    }
    if (e.button !== 0) return
    if (e.dataTransfer) {
      try {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(task.id))
      } catch {}
    }
    dragItem.current = { id: task.id, fromStatus: task.status }
  }

  function onColumnDragOver(e) { e.preventDefault() }

  function onColumnDrop(status) {
    const payload = dragItem.current
    if (!payload) return

    let newOrderIndex = 0
    setTasks(prev => {
      const next = [...prev]
      const t = next.find(x => x.id === payload.id)
      if (!t) return next
      t.status = status
      const target = next.filter(x => x.status === status && x.id !== t.id).sort(byIndex)
      newOrderIndex = target.length
      t.order_index = newOrderIndex
      t.updated_at = new Date().toISOString()
      return next
    })
    dragItem.current = null

    if (storage?.mode === 'api') {
      const numericId = Number(payload.id)
      const idToSend = Number.isFinite(numericId) ? numericId : payload.id
      storage.updateTask(idToSend, { status, order_index: newOrderIndex }, boardId)
        .catch(err => console.error('[Noteboard] PATCH /tasks/:id failed after drop:', err))
    }
  }

  return { onCardDragStart, onColumnDragOver, onColumnDrop }
}
