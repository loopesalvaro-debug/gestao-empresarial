import { useState, useEffect } from 'react'
import { subscribeCollection } from '../../lib/firestore'
import { diffDays, parseDate } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'

// Admin sees everything; Vendedor sees only these tabs
const ADMIN_TABS = [
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
  { id: 'usuarios',  icon: '👥', label: 'Usuários'   },
]

const VENDEDOR_TABS = [
  { id: 'vnd',     icon: '🛒', label: 'Vendas'    },
  { id: 'cli',     icon: '👤', label: 'Clientes'  },
  { id: 'fic',     icon: '📋', label: 'Fichas'    },
  { id: 'est',     icon: '📦', label: 'Estoque'   },
  { id: 'compras', icon: '🛍️', label: 'Compras'   },
  { id: 'boletos', icon: '📄', label: 'Boletos'   },
]

export default function Sidebar({ active, onChange }) {
  const { isAdmin, profile, logout } = useAuth()
  const [fichasPend,  setFichasPend]  = useState(0)
  const [boletosPend, setBoletosPend] = useState(0)

  const TABS = isAdmin ? ADMIN_TABS : VENDEDOR_TABS

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
      padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4,
      flexShrink: 0, minHeight: '100%',
    }}>
      {/* User info */}
      <div style={{
        padding: '10px 12px', marginBottom: 8,
        background: 'var(--bg2)', borderRadius: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
          {profile?.nome || '—'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            background: isAdmin ? '#F0EAFB' : '#E6F1FB',
            color: isAdmin ? '#5B35B5' : '#185FA5',
          }}>
            {isAdmin ? 'ADMIN' : 'VENDEDOR'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ flex: 1 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none',
            background: active === t.id ? 'var(--bg3)' : 'transparent',
            color: active === t.id ? 'var(--text)' : 'var(--text2)',
            fontWeight: active === t.id ? 500 : 400,
            cursor: 'pointer', fontSize: 14, textAlign: 'left', width: '100%',
            fontFamily: 'inherit', transition: 'background .12s', marginBottom: 2,
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
      </div>

      {/* Logout */}
      <button onClick={logout} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 8, border: 'none',
        background: 'transparent', color: '#993C1D',
        cursor: 'pointer', fontSize: 13, width: '100%',
        fontFamily: 'inherit', marginTop: 8,
      }}>
        <span>🚪</span> Sair
      </button>
    </nav>
  )
}
