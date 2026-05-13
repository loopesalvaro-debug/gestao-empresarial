export const fmt = n =>
  'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtQ = (n, u) => {
  const v = Number(n || 0)
  const s = v % 1 === 0 ? v.toString() : v.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
  return `${s} ${u || 'unid'}`
}

export const today = () => new Date().toLocaleDateString('pt-BR')

export const uid = () => Math.random().toString(36).slice(2, 9)
