import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, deleteDocument } from '../../lib/firestore'
import { fmt, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Select, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading,
} from '../shared/UI'

export default function Financas() {
  const toast = useToast()
  const [lancamentos, setLancamentos] = useState(null)
  const [fichas, setFichas] = useState([])
  const [desc, setDesc] = useState('')
  const [val, setVal] = useState('')
  const [tipo, setTipo] = useState('entrada')
  const [cat, setCat] = useState('Vendas')

  useEffect(() => {
    const unsub1 = subscribeCollection('lancamentos', setLancamentos)
    const unsub2 = subscribeCollection('fichas', setFichas)
    return () => { unsub1(); unsub2() }
  }, [])

  async function addLanc() {
    const v = parseFloat(val)
    if (!desc.trim() || isNaN(v) || v <= 0) { toast('Preencha todos os campos', 'err'); return }
    await addDocument('lancamentos', { desc: desc.trim(), val: v, tipo, cat, data: today(), origem: 'Manual' })
    setDesc(''); setVal('')
    toast('Lançamento adicionado!')
  }

  async function delLanc(id) {
    await deleteDocument('lancamentos', id)
  }

  if (lancamentos === null) return <Loading />

  const ent  = lancamentos.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.val, 0)
  const sai  = lancamentos.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.val, 0)
  const recV = lancamentos.filter(l => l.origem === 'Venda').reduce((a, l) => a + l.val, 0)
  const ficP = fichas.filter(f => f.status === 'pendente').reduce((a, f) => a + f.total, 0)

  return (
    <div>
      <PageTitle>💰 Finanças</PageTitle>

      <MetricsGrid>
        <Metric label="Entradas"          value={fmt(ent)}       color="green" />
        <Metric label="Saídas"            value={fmt(sai)}       color="red" />
        <Metric label="Saldo atual"       value={fmt(ent - sai)} color={ent - sai >= 0 ? 'green' : 'red'} />
        <Metric label="Receita de vendas" value={fmt(recV)}      color="blue" />
        <Metric label="Fichas a receber"  value={fmt(ficP)}      color="amber" />
      </MetricsGrid>

      <Card>
        <CardTitle>Novo lançamento manual</CardTitle>
        <FormRow>
          <Input label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Aluguel" />
          <Input label="Valor (R$)" value={val} onChange={e => setVal(e.target.value)}
            type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth: 130 }} />
          <Select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} fg={{ maxWidth: 110 }}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </Select>
          <Select label="Categoria" value={cat} onChange={e => setCat(e.target.value)} fg={{ maxWidth: 150 }}>
            {['Vendas','Serviços','Fornecedor','Operacional','Outros'].map(c => <option key={c}>{c}</option>)}
          </Select>
          <Btn primary onClick={addLanc} style={{ alignSelf: 'flex-end' }}>+ Adicionar</Btn>
        </FormRow>
      </Card>

      <Card>
        <CardTitle>Fluxo de caixa</CardTitle>
        {!lancamentos.length
          ? <EmptyState>Nenhum lançamento ainda</EmptyState>
          : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <TH>Data</TH><TH>Descrição</TH><TH>Categoria</TH>
                <TH>Origem</TH><TH>Tipo</TH><TH right>Valor</TH><TH />
              </tr></thead>
              <tbody>
                {[...lancamentos].reverse().map(l => (
                  <tr key={l.id}>
                    <TD secondary>{l.data}</TD>
                    <TD>{l.desc}</TD>
                    <TD>{l.cat}</TD>
                    <TD>
                      {l.origem === 'Venda'  && <Badge label="Venda"  color="blue" />}
                      {l.origem === 'Ficha'  && <Badge label="Ficha"  color="purple" />}
                      {l.origem === 'Manual' && <Badge label="Manual" color="gray" />}
                    </TD>
                    <TD><Badge label={l.tipo === 'entrada' ? 'Entrada' : 'Saída'} color={l.tipo === 'entrada' ? 'green' : 'red'} /></TD>
                    <TD right bold color={l.tipo === 'entrada' ? '#0F6E56' : '#993C1D'}>{fmt(l.val)}</TD>
                    <TD>{l.origem === 'Manual' && <DelBtn onClick={() => delLanc(l.id)} />}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  )
}
