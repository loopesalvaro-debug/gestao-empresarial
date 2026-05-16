import { useState } from 'react'
import { ToastProvider } from './context/ToastContext'
import Sidebar  from './components/shared/Sidebar'
import Financas from './components/Financas/Financas'
import Estoque  from './components/Estoque/Estoque'
import Compras  from './components/Compras/Compras'
import Clientes from './components/Clientes/Clientes'
import Vendas   from './components/Vendas/Vendas'
import Fichas   from './components/Fichas/Fichas'
import Boletos  from './components/Boletos/Boletos'

const PAGES = {
  fin:     Financas,
  est:     Estoque,
  compras: Compras,
  cli:     Clientes,
  vnd:     Vendas,
  fic:     Fichas,
  boletos: Boletos,
}

export default function App() {
  const [tab, setTab] = useState('fin')
  const Page = PAGES[tab]

  return (
    <ToastProvider>
      <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', minHeight:'100vh', background:'var(--bg2)', color:'var(--text)' }}>

        <header style={{
          background:'var(--bg)', borderBottom:'1px solid var(--border)',
          padding:'0 24px', display:'flex', alignItems:'center', gap:12,
          height:56, position:'sticky', top:0, zIndex:100,
          boxShadow:'0 1px 6px rgba(0,0,0,.05)',
        }}>
          <span style={{ fontSize:22 }}>🌿</span>
          <span style={{ fontSize:16, fontWeight:600 }}>Comercial Jardinense</span>
        </header>

        <div style={{ display:'flex', minHeight:'calc(100vh - 56px)' }}>
          <Sidebar active={tab} onChange={setTab} />
          <main style={{ flex:1, padding:24, overflowY:'auto' }}>
            <Page />
          </main>
        </div>

      </div>
    </ToastProvider>
  )
}
