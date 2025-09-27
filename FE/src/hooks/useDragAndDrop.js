import { useRef } from 'react'
import { byIndex } from '../utils/helpers'

/**
 * Gestione drag&drop HTML5 per spostare task tra colonne.
 * Restituisce handlers da agganciare a colonne e card.
 */
export default function useDragAndDrop(tasks, setTasks) {
  const dragItem = useRef(null) // { id, fromStatus }

  function onCardDragStart(e, task) {
    // Evita drag se l'origine è un controllo interattivo (click su button, input, link, textarea)
    const target = e.target
    if (target && target.closest && target.closest('button, input, textarea, a, [role="button"]')) {
      e.preventDefault()
      return
    }
    // Solo trascinamento con tasto sinistro
    if (e.button !== 0) return
    // Imposta esplicitamente il tipo di operazione drag
    if (e.dataTransfer) {
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(task.id)) } catch {}
    }
    dragItem.current = { id: task.id, fromStatus: task.status }
  }

  function onColumnDragOver(e) { e.preventDefault() }

  function onColumnDrop(status) {
    const payload = dragItem.current
    if (!payload) return
    setTasks(prev => {
      const next = [...prev]
      const t = next.find(x => x.id === payload.id)
      if (!t) return next
      t.status = status
      const target = next.filter(x => x.status === status && x.id !== t.id).sort(byIndex)
      t.order_index = target.length
      t.updated_at = new Date().toISOString()
      return next
    })
    dragItem.current = null
  }

  return { onCardDragStart, onColumnDragOver, onColumnDrop }
}


