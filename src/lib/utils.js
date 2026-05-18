export const fmt = n =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtQ = (n, u) => {
  const v = Number(n || 0)
  const s = v % 1 === 0 ? v.toString() : v.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
  return `${s} ${u || 'unid'}`
}

export const today    = () => new Date().toLocaleDateString('pt-BR')
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const uid      = () => Math.random().toString(36).slice(2, 9)

export function parseDate(str) {
  if (!str) return null
  if (str.includes('-')) return new Date(str + 'T00:00:00')
  const [d, m, y] = str.split('/')
  return new Date(`${y}-${m}-${d}T00:00:00`)
}

export function isSameDay(d1, d2) {
  return d1 && d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
}

export function isSameMonth(d1, d2) {
  return d1 && d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()
}

export function diffDays(d) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.ceil((d - hoje) / (1000 * 60 * 60 * 24))
}

export function fmtDate(v) {
  if (!v) return '—'
  if (v.includes('-')) {
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }
  return v
}

export function sortByDate(arr, field = 'data') {
  return [...arr].sort((a, b) => {
    const da = (a[field] || '').split('/').reverse().join('')
    const db = (b[field] || '').split('/').reverse().join('')
    return db.localeCompare(da)
  })
}
