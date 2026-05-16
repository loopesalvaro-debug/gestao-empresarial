import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, fmtQ, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit', width:'100%' }

export default function Compras() {
  const toast = useToast()
  const [compras,  setCompras]  = useState(null)
  const [produtos, setProdutos] = useState([])

  // Formulário
  const [data,        setData]        = useState(today())
  const [fornecedor,  setFornecedor]  = useState('')
  const [prodId,      setProdId]      = useState('')
  const [qtd,         setQtd]         = useState('')
  const [valorUnit,   setValorUnit]   = useState('')
  const [obs,         setObs]         = useState('')

  useEffect(() => {
    const u1 = subscribeCollection('compras',  setCompras)
    const u2 = subscribeCollection('produtos', setProdutos)
    return () => { u1(); u2() }
  }, [])

  const prodSelecionado = produtos.find(p => p.id === prodId)
  const qtdNum   = parseFloat(qtd)      || 0
  const unitNum  = parseFloat(valorUnit) || 0
  const totalCompra = qtdNum * unitNum

  async function registrarCompra() {
    if (!prodId)              { toast('Selecione um produto', 'err'); return }
    if (!qtdNum || qtdNum<=0) { toast('Informe a quantidade', 'err'); return }
    if (!unitNum || unitNum<=0){ toast('Informe o valor unitário', 'err'); return }

    const p = produtos.find(x => x.id === prodId)

    // 1. Registra a compra
    await addDocument('compras', {
      data, fornecedor: fornecedor.trim(), prodId, prodNome: p.nome,
      unidade: p.unidade, qtd: qtdNum, valorUnit: unitNum,
      total: totalCompra, obs: obs.trim(),
    })

    // 2. Dá entrada no estoque
    const novaQtd = parseFloat((p.qtd + qtdNum).toFixed(6))
    await updateDocument('produtos', p.id, { qtd: novaQtd })

    // 3. Lança no financeiro como saída
    await addDocument('lancamentos', {
      desc: `Compra — ${p.nome}${fornecedor ? ' / ' + fornecedor : ''}`,
      val: totalCompra, tipo: 'saida', cat: 'Fornecedor',
      data, origem: 'Compra',
    })

    toast(`Compra registrada! +${fmtQ(qtdNum, p.unidade)} adicionados ao estoque ✅`)
    setProdId(''); setQtd(''); setValorUnit(''); setFornecedor(''); setObs(''); setData(today())
  }

  if (compras === null) return <Loading />

  const totalGasto     = compras.reduce((a, c) => a + c.total, 0)
  const totalItens     = compras.length
  const mesAtual       = new Date().toLocaleDateString('pt-BR', { month:'2-digit', year:'numeric' })
  const comprasMes     = compras.filter(c => {
    const partes = (c.data || '').split('/')
    if (partes.length === 3) return `${partes[1]}/${partes[2]}` === mesAtual.split('/').slice(1).join('/')
    // formato ISO
    const d = new Date(c.data)
    return !isNaN(d) && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()
  })
  const gastoMes = comprasMes.reduce((a, c) => a + c.total, 0)

  const comprasOrdenadas = [...compras].sort((a, b) => {
    const da = (a.data || '').split('/').reverse().join('')
    const db = (b.data || '').split('/').reverse().join('')
    return db.localeCompare(da)
  })

  return (
    <div>
      <PageTitle>🛍️ Compras</PageTitle>

      <MetricsGrid>
        <Metric label="Total de compras"   value={totalItens} />
        <Metric label="Total investido"    value={fmt(totalGasto)}  color="red"   />
        <Metric label="Gasto este mês"     value={fmt(gastoMes)}    color="amber" />
        <Metric label="Produtos comprados" value={new Set(compras.map(c => c.prodId)).size} color="blue" />
      </MetricsGrid>

      <InfoBox color="blue">
        ℹ️ Ao registrar uma compra, a quantidade entra automaticamente no estoque e o valor é lançado como <strong>saída no financeiro</strong>.
      </InfoBox>

      <Card>
        <CardTitle>Registrar compra</CardTitle>
        <FormRow>
          <FG label="📅 Data da compra" style={{ maxWidth: 150 }}>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={SEL} />
          </FG>
          <Input label="Fornecedor (opcional)" value={fornecedor}
            onChange={e => setFornecedor(e.target.value)} placeholder="Ex: Distribuidora ABC" />
          <Input label="Observação (opcional)" value={obs}
            onChange={e => setObs(e.target.value)} placeholder="Ex: NF 1234" />
        </FormRow>

        <FormRow>
          <FG label="Produto" style={{ flex: 2, minWidth: 200 }}>
            <select value={prodId} onChange={e => setProdId(e.target.value)} style={SEL}>
              <option value="">— Selecione o produto —</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} — estoque atual: {fmtQ(p.qtd, p.unidade)}
                </option>
              ))}
            </select>
          </FG>
          <Input label={prodSelecionado ? `Quantidade (${prodSelecionado.unidade})` : 'Quantidade'}
            value={qtd} onChange={e => setQtd(e.target.value)}
            type="number" min="0.001" step="any" placeholder="0"
            fg={{ maxWidth: 130 }} />
          <Input label="Valor unitário (R$)" value={valorUnit}
            onChange={e => setValorUnit(e.target.value)}
            type="number" min="0" step="0.01" placeholder="0,00"
            fg={{ maxWidth: 150 }} />
          <FG label="Total da compra" style={{ maxWidth: 160 }}>
            <input readOnly value={totalCompra > 0 ? fmt(totalCompra) : ''}
              placeholder="R$ 0,00"
              style={{ ...SEL, background:'var(--bg2)', color:'#993C1D', fontWeight:700 }} />
          </FG>
          <Btn primary onClick={registrarCompra} style={{ alignSelf:'flex-end' }}>✅ Registrar compra</Btn>
        </FormRow>

        {prodSelecionado && qtdNum > 0 && (
          <InfoBox color="green" style={{ marginBottom: 0 }}>
            📦 Estoque atual: <strong>{fmtQ(prodSelecionado.qtd, prodSelecionado.unidade)}</strong>
            {' '}→ após compra: <strong>{fmtQ(prodSelecionado.qtd + qtdNum, prodSelecionado.unidade)}</strong>
          </InfoBox>
        )}
      </Card>

      <Card>
        <CardTitle>Histórico de compras</CardTitle>
        {!compras.length
          ? <EmptyState>Nenhuma compra registrada</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  <TH>Data</TH><TH>Produto</TH><TH>Fornecedor</TH>
                  <TH right>Qtd</TH><TH right>Vlr. unit.</TH><TH right>Total</TH><TH>Obs.</TH>
                </tr></thead>
                <tbody>
                  {comprasOrdenadas.map(c => (
                    <tr key={c.id}>
                      <TD secondary>{c.data}</TD>
                      <TD bold>{c.prodNome}</TD>
                      <TD secondary>{c.fornecedor || '—'}</TD>
                      <TD right>{fmtQ(c.qtd, c.unidade)}</TD>
                      <TD right>{fmt(c.valorUnit)}</TD>
                      <TD right bold color="#993C1D">{fmt(c.total)}</TD>
                      <TD secondary>{c.obs || '—'}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  )
}
