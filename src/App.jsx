import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Login           from './components/Auth/Login'
import Sidebar         from './components/shared/Sidebar'
import Dashboard       from './components/Dashboard/Dashboard'
import Financas        from './components/Financas/Financas'
import Caixa           from './components/Caixa/Caixa'
import Estoque         from './components/Estoque/Estoque'
import Compras         from './components/Compras/Compras'
import Clientes        from './components/Clientes/Clientes'
import Vendas          from './components/Vendas/Vendas'
import Fichas          from './components/Fichas/Fichas'
import Boletos         from './components/Boletos/Boletos'
import Relatorios      from './components/Relatorios/Relatorios'
import GerenciarUsuarios from './components/Admin/GerenciarUsuarios'

// All pages
const ALL_PAGES = {
  dash:       Dashboard,
  fin:        Financas,
  caixa:      Caixa,
  est:        Estoque,
  compras:    Compras,
  cli:        Clientes,
  vnd:        Vendas,
  fic:        Fichas,
  boletos:    Boletos,
  relatorios: Relatorios,
  usuarios:   GerenciarUsuarios,
}

// Default tab per role
const DEFAULT_TAB = { admin: 'dash', vendedor: 'vnd' }

// Pages each role can access
const ROLE_PAGES = {
  admin:    Object.keys(ALL_PAGES),
  vendedor: ['vnd', 'cli', 'fic', 'est', 'compras', 'boletos'],
}

function AppContent() {
  const { user, profile, loading, isAdmin } = useAuth()
  const role    = profile?.perfil || 'vendedor'
  const allowed = ROLE_PAGES[role] || ROLE_PAGES.vendedor
  const [tab, setTab] = useState(null)

  // Set default tab when role is known
  useEffect(() => {
    if (profile) setTab(DEFAULT_TAB[profile.perfil] || 'vnd')
  }, [profile])

  // Loading screen
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg2)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
          <div style={{ fontSize:14, color:'var(--text2)' }}>Carregando...</div>
        </div>
      </div>
    )
  }

  // Not logged in → show login
  if (!user) return <Login />

  // User logged in but profile not loaded yet
  if (!profile) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg2)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
          <div style={{ fontSize:14, color:'var(--text2)' }}>Carregando perfil...</div>
        </div>
      </div>
    )
  }

  // Inactive user
  if (profile.ativo === false) {
    const { logout } = useAuth()
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg2)', padding:24 }}>
        <div style={{ background:'var(--bg)', borderRadius:16, padding:'32px 28px', maxWidth:360, textAlign:'center', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🚫</div>
          <div style={{ fontSize:17, fontWeight:600, marginBottom:8 }}>Acesso desativado</div>
          <div style={{ fontSize:14, color:'var(--text2)', marginBottom:20 }}>
            Sua conta foi desativada. Entre em contato com o administrador.
          </div>
          <button onClick={logout} style={{
            padding:'10px 24px', borderRadius:8, border:'none',
            background:'var(--text)', color:'var(--bg)', fontSize:14,
            cursor:'pointer', fontFamily:'inherit', fontWeight:500,
          }}>Sair</button>
        </div>
      </div>
    )
  }

  // Guard: if current tab not allowed, reset
  const currentTab  = tab && allowed.includes(tab) ? tab : allowed[0]
  const Page        = ALL_PAGES[currentTab]

  function handleTabChange(newTab) {
    if (allowed.includes(newTab)) setTab(newTab)
  }

  return (
    <div style={{
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      minHeight: '100vh', background: 'var(--bg2)', color: 'var(--text)',
    }}>
      <header style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 6px rgba(0,0,0,.05)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Comercial Jardinense</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>
          {profile.nome} &nbsp;·&nbsp;
          <span style={{
            background: isAdmin ? '#F0EAFB' : '#E6F1FB',
            color: isAdmin ? '#5B35B5' : '#185FA5',
            padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          }}>
            {isAdmin ? 'ADMIN' : 'VENDEDOR'}
          </span>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Sidebar active={currentTab} onChange={handleTabChange} />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {Page ? <Page /> : null}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
