import { STATUSES } from './constants'

export function uid() {
  return Math.floor(Date.now() + Math.random() * 100000)
}

export function byIndex(a, b) {
  return (a.order_index - b.order_index) || (a.id - b.id)
}

export function normalizeOrder(list) {
  const next = list.map(t => ({ ...t }))
  STATUSES.forEach(s => {
    const col = next.filter(t => t.status === s).sort(byIndex)
    col.forEach((t, i) => t.order_index = i)
  })
  return next
}
