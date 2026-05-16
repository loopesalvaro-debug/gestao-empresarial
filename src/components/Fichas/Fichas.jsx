import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  Btn, Badge, TH, TD, EmptyState, Loading,
} from '../shared/UI'

export default function Fichas() {
  const toast  = useToast()
  const [fichas, setFichas]   = useState(null)
  const [abertos, setAbertos] = useState({}) // controla quais clientes estão expandidos

  useEffect(() => subscribeCollection('fichas', setFichas), [])

  async function confirmar(f) {
    await updateDocument('fichas', f.id, { status: 'recebida', dataReceb: today() })
    await addDocument('lancamentos', {
      desc: `Ficha recebida${f.clienteNome ? ' – ' + f.clienteNome : ''}`,
      val: f.total, tipo: 'entrada', cat: 'Vendas', data: today(), origem: 'Ficha',
    })
    toast('Recebimento confirmado e lançado no financeiro! ✅')
  }

  async function confirmarTodosCliente(fichasCliente) {
    for (const f of fichasCliente) {
      await updateDocument('fichas', f.id, { status: 'recebida', dataReceb: today() })
      await addDocument('lancamentos', {
        desc: `Ficha recebida${f.clienteNome ? ' – ' + f.clienteNome : ''}`,
        val: f.total, tipo: 'entrada', cat: 'Vendas', data: today(), origem: 'Ficha',
      })
    }
    const total = fichasCliente.reduce((a, f) => a + f.total, 0)
    toast(`Todas as fichas quitadas! ${fmt(total)} lançados no financeiro ✅`)
  }

  function toggleCliente(key) {
    setAbertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (fichas === null) return <Loading />

  const pendentes = fichas.filter(f => f.status === 'pendente')
  const recebidas = fichas.filter(f => f.status === 'recebida')
  const valPend   = pendentes.reduce((a, f) => a + f.total, 0)
  const valRec    = recebidas.reduce((a, f) => a + f.total, 0)

  // Agrupa pendentes por cliente
  const porCliente = pendentes.reduce((acc, f) => {
    const key = f.clienteId || '__sem_cliente__'
    const nome = f.clienteNome || 'Sem cliente'
    if (!acc[key]) acc[key] = { nome, fichas: [] }
    acc[key].fichas.push(f)
    return acc
  }, {})

  const clientes = Object.entries(porCliente).sort((a, b) => a[1].nome.localeCompare(b[1].nome))

  return (
    <div>
      <PageTitle>📋 Fichas</PageTitle>

      <MetricsGrid>
        <Metric label="Fichas pendentes"   value={pendentes.length} color="amber" />
        <Metric label="Total a receber"    value={fmt(valPend)}     color="amber" />
        <Metric label="Clientes com ficha" value={clientes.length}  color="blue"  />
        <Metric label="Total recebido"     value={fmt(valRec)}      color="green" />
      </MetricsGrid>

      {/* ── PENDENTES — agrupado por cliente ── */}
      <Card>
        <CardTitle>⏳ Fichas pendentes por cliente</CardTitle>

        {!clientes.length
          ? <EmptyState>Nenhuma ficha pendente 🎉</EmptyState>
          : clientes.map(([key, grupo]) => {
              const totalCliente = grupo.fichas.reduce((a, f) => a + f.total, 0)
              const aberto       = abertos[key] !== false // começa expandido
              const ordenadas    = [...grupo.fichas].sort((a, b) => {
                const da = (a.data || '').split('/').reverse().join('')
                const db = (b.data || '').split('/').reverse().join('')
                return da.localeCompare(db)
              })

              return (
                <div key={key} style={{ marginBottom: 14, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>

                  {/* Cabeçalho do cliente */}
                  <div
                    onClick={() => toggleCliente(key)}
                    style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 16px', cursor:'pointer',
                      background: '#FAEEDA',
                      borderBottom: aberto ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize:18 }}>👤</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15, color:'#854F0B' }}>{grupo.nome}</div>
                      <div style={{ fontSize:12, color:'#854F0B', opacity:.8 }}>
                        {grupo.fichas.length} {grupo.fichas.length === 1 ? 'ficha' : 'fichas'} pendente{grupo.fichas.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:20, fontWeight:700, color:'#854F0B' }}>{fmt(totalCliente)}</div>
                      <div style={{ fontSize:11, color:'#854F0B', opacity:.7 }}>total em aberto</div>
                    </div>
                    <div style={{ fontSize:18, color:'#854F0B', marginLeft:4 }}>{aberto ? '▲' : '▼'}</div>
                  </div>

                  {/* Lista de fichas do cliente */}
                  {aberto && (
                    <>
                      <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                        <thead>
                          <tr style={{ background:'var(--bg2)' }}>
                            <TH>Data</TH><TH>Itens</TH><TH>Tabela</TH><TH right>Valor</TH><TH />
                          </tr>
                        </thead>
                        <tbody>
                          {ordenadas.map(f => (
                            <tr key={f.id}>
                              <TD secondary>{f.data}</TD>
                              <TD><span style={{ fontSize:12,color:'var(--text2)' }}>{f.itensTxt || '—'}</span></TD>
                              <TD>{f.tabela==='2'?<Badge label="T2 — Revenda" color="tab2"/>:<Badge label="T1 — Final" color="tab1"/>}</TD>
                              <TD right bold color="#854F0B">{fmt(f.total)}</TD>
                              <TD>
                                <Btn primary sm onClick={() => confirmar(f)}>✅ Recebido</Btn>
                              </TD>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Rodapé do cliente com total e botão quitar tudo */}
                      <div style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'10px 16px', background:'var(--bg2)', borderTop:'1px solid var(--border)',
                        gap:12, flexWrap:'wrap',
                      }}>
                        <div style={{ fontSize:13, color:'var(--text2)' }}>
                          Total em aberto: <strong style={{ color:'#854F0B' }}>{fmt(totalCliente)}</strong>
                        </div>
                        {grupo.fichas.length > 1 && (
                          <Btn primary onClick={() => confirmarTodosCliente(grupo.fichas)}>
                            ✅ Quitar todas ({grupo.fichas.length} fichas)
                          </Btn>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })
        }
      </Card>

      {/* ── RECEBIDAS ── */}
      <Card>
        <CardTitle>✅ Fichas recebidas</CardTitle>
        {!recebidas.length
          ? <EmptyState>Nenhuma ficha recebida ainda</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead><tr>
                  <TH>Data venda</TH><TH>Recebido em</TH><TH>Cliente</TH><TH>Itens</TH><TH right>Valor</TH>
                </tr></thead>
                <tbody>
                  {[...recebidas]
                    .sort((a, b) => (b.dataReceb||'').localeCompare(a.dataReceb||''))
                    .map(f => (
                      <tr key={f.id}>
                        <TD secondary>{f.data}</TD>
                        <TD secondary>{f.dataReceb}</TD>
                        <TD bold>{f.clienteNome || '—'}</TD>
                        <TD><span style={{ fontSize:12,color:'var(--text2)' }}>{f.itensTxt || '—'}</span></TD>
                        <TD right bold color="#0F6E56">{fmt(f.total)}</TD>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  )
}
