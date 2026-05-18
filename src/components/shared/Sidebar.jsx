import { useState, useEffect } from 'react'
import { subscribeCollection } from '../../lib/firestore'
import { diffDays, parseDate } from '../../lib/utils'

const TABS = [
  { id: 'dash',      icon: '📊', label: 'Dashboard'  },
  { id: 'fin',       icon: '💰', label: 'Finanças'   },
  { id: 'caixa',     icon: '🏧', label: 'Caixa'      },
  { id: 'est',       icon: '📦', label: 'Estoque'    },
  { id: 'compras',   icon: '🛍️', label: 'Compras'    },
  { id: 'cli',       icon: '👤', label: 'Clientes'   },
  { id: 'vnd',       icon: '🛒', label: 'Vendas'     },
  { id: 'fic',       icon: '📋', label: 'Fichas'     },
  { id: 'boletos',   icon: '📄', label: 'Boletos'    },
  { id: 'relatorios',icon: '📈', label: 'Relatórios' },
]

export default function Sidebar({ active, onChange }) {
  const [fichasPend,  setFichasPend]  = useState(0)
  const [boletosPend, setBoletosPend] = useState(0)

  useEffect(() => {
    const u1 = subscribeCollection('fichas', list =>
      setFichasPend(list.filter(f => f.status === 'pendente').length)
    )
    const u2 = subscribeCollection('boletos', list => {
      const venc = list.filter(b => {
        if (b.status === 'pago') return false
        const d = parseDate(b.vencimento)
        return d && diffDays(d) <= 0
      })
      setBoletosPend(venc.length)
    }, 'vencimento')
    return () => { u1(); u2() }
  }, [])

  return (
    <nav style={{
      width: 190, background: 'var(--bg)', borderRight: '1px solid var(--border)',
      padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, border: 'none',
          background: active === t.id ? 'var(--bg3)' : 'transparent',
          color: active === t.id ? 'var(--text)' : 'var(--text2)',
          fontWeight: active === t.id ? 500 : 400,
          cursor: 'pointer', fontSize: 14, textAlign: 'left', width: '100%',
          fontFamily: 'inherit', transition: 'background .12s',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
          <span>{t.label}</span>
          {t.id === 'fic' && fichasPend > 0 && (
            <span style={{ marginLeft:'auto', background:'#993C1D', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>
              {fichasPend}
            </span>
          )}
          {t.id === 'boletos' && boletosPend > 0 && (
            <span style={{ marginLeft:'auto', background:'#993C1D', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>
              {boletosPend}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
