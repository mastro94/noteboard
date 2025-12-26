import { useRef } from 'react'
import { byIndex } from '../utils/helpers'

/**
 * opts (opzionale):
 *  - boardRole: 'admin' | 'editor' | 'viewer'
 *  - myUserId: number|string
 */
export default function useDragAndDrop(tasks, setTasks, storage, boardId, opts = {}) {
  const dragItem = useRef(null) // { id, fromStatus }
  const { boardRole = 'viewer', myUserId = null } = opts || {}

  function canMoveTask(task) {
    // Local mode: lascia tutto com'è
    if (storage?.mode !== 'api') return true

    // Admin: può spostare tutto
    if (boardRole === 'admin') return true

    // Viewer: non può spostare nulla
    if (boardRole === 'viewer') return false

    // Editor: può spostare SOLO i propri task
    if (boardRole === 'editor') {
      if (!task) return false
      if (myUserId == null) return false
      return String(task.user_id) === String(myUserId)
    }

    return false
  }

  function onCardDragStart(e, task) {
    // blocca drag se non autorizzato
    if (!canMoveTask(task)) {
      e.preventDefault()
      return
    }

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

  function onColumnDragOver(e) {
    // se non sto trascinando nulla, lascia stare
    if (!dragItem.current) return
    e.preventDefault()
  }

  function onColumnDrop(status) {
    const payload = dragItem.current
    if (!payload) return

    // recupera task dal "tasks" passato al hook (stato attuale)
    const currentTask = (tasks || []).find(t => String(t.id) === String(payload.id))
    if (!canMoveTask(currentTask)) {
      dragItem.current = null
      return
    }

    let newOrderIndex = 0
    setTasks(prev => {
      const next = [...prev]
      const t = next.find(x => String(x.id) === String(payload.id))
      if (!t) return next

      // ulteriore check su prev (più affidabile)
      if (!canMoveTask(t)) return next

      t.status = status
      const target = next
        .filter(x => x.status === status && String(x.id) !== String(t.id))
        .sort(byIndex)

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
