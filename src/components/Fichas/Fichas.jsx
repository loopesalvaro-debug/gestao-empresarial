import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  Btn, Badge, TH, TD, EmptyState, Loading,
} from '../shared/UI'

export default function Fichas() {
  const toast = useToast()
  const [fichas, setFichas] = useState(null)

  useEffect(() => subscribeCollection('fichas', setFichas), [])

  async function confirmar(f) {
    await updateDocument('fichas', f.id, { status: 'recebida', dataReceb: today() })
    await addDocument('lancamentos', {
      desc: `Ficha recebida${f.clienteNome ? ' – ' + f.clienteNome : ''}`,
      val: f.total, tipo: 'entrada', cat: 'Vendas', data: today(), origem: 'Ficha',
    })
    toast('Recebimento confirmado e lançado no financeiro! ✅')
  }

  if (fichas === null) return <Loading />

  const pendentes = fichas.filter(f => f.status === 'pendente')
  const recebidas = fichas.filter(f => f.status === 'recebida')
  const valPend   = pendentes.reduce((a, f) => a + f.total, 0)
  const valRec    = recebidas.reduce((a, f) => a + f.total, 0)

  return (
    <div>
      <PageTitle>📋 Fichas</PageTitle>

      <MetricsGrid>
        <Metric label="Fichas pendentes" value={pendentes.length} color="amber" />
        <Metric label="Valor a receber"  value={fmt(valPend)}     color="amber" />
        <Metric label="Fichas recebidas" value={recebidas.length} color="green" />
        <Metric label="Total recebido"   value={fmt(valRec)}      color="green" />
      </MetricsGrid>

      <Card>
        <CardTitle>⏳ Fichas pendentes — aguardando recebimento</CardTitle>
        {!pendentes.length
          ? <EmptyState>Nenhuma ficha pendente 🎉</EmptyState>
          : <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr>
                <TH>Data</TH><TH>Cliente</TH><TH>Tabela</TH><TH>Itens</TH><TH right>Valor</TH><TH />
              </tr></thead>
              <tbody>
                {pendentes.map(f => (
                  <tr key={f.id}>
                    <TD secondary>{f.data}</TD>
                    <TD bold>{f.clienteNome || '—'}</TD>
                    <TD>{f.tabela === '2' ? <Badge label="T2 — Revenda" color="tab2" /> : <Badge label="T1 — Final" color="tab1" />}</TD>
                    <TD><span style={{ fontSize:12,color:'var(--text2)' }}>{f.itensTxt || '—'}</span></TD>
                    <TD right bold color="#854F0B">{fmt(f.total)}</TD>
                    <TD>
                      <Btn primary sm onClick={() => confirmar(f)}>✅ Confirmar recebimento</Btn>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>

      <Card>
        <CardTitle>✅ Fichas recebidas</CardTitle>
        {!recebidas.length
          ? <EmptyState>Nenhuma ficha recebida ainda</EmptyState>
          : <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr>
                <TH>Data venda</TH><TH>Recebido em</TH><TH>Cliente</TH><TH right>Valor</TH>
              </tr></thead>
              <tbody>
                {[...recebidas].reverse().map(f => (
                  <tr key={f.id}>
                    <TD secondary>{f.data}</TD>
                    <TD secondary>{f.dataReceb}</TD>
                    <TD bold>{f.clienteNome || '—'}</TD>
                    <TD right bold color="#0F6E56">{fmt(f.total)}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  )
}
