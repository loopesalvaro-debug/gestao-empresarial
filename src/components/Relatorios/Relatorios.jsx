import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, fmtQ, isSameMonth, parseDate } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit', width:'100%' }

// ── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#0F6E56' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ background:'var(--bg2)', borderRadius:99, height:12, overflow:'hidden', margin:'8px 0' }}>
      <div style={{ width:`${pct}%`, background: pct >= 100 ? '#0F6E56' : pct >= 70 ? '#185FA5' : pct >= 40 ? '#854F0B' : '#993C1D', height:'100%', borderRadius:99, transition:'width .4s' }} />
    </div>
  )
}

// ── Export to CSV (opens as Excel) ────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const bom   = '\uFEFF'
  const lines = [headers.join(';'), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';'))]
  const blob  = new Blob([bom + lines.join('\n')], { type:'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Relatorios() {
  const toast = useToast()
  const [vendas,    setVendas]    = useState(null)
  const [produtos,  setProdutos]  = useState([])
  const [compras,   setCompras]   = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [metas,     setMetas]     = useState([])
  const [novaMeta,  setNovaMeta]  = useState('')
  const [mesSel,    setMesSel]    = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    const u1 = subscribeCollection('vendas',      setVendas)
    const u2 = subscribeCollection('produtos',    setProdutos)
    const u3 = subscribeCollection('compras',     setCompras)
    const u4 = subscribeCollection('lancamentos', setLancamentos)
    const u5 = subscribeCollection('metas',       setMetas)
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [])

  if (vendas === null) return <Loading />

  // Mês selecionado como Date
  const [anoSel, mesSel2] = mesSel.split('-').map(Number)
  const dataRefMes = new Date(anoSel, mesSel2 - 1, 1)

  // Meta do mês
  const metaMes = metas.find(m => m.mes === mesSel)
  const metaValor = metaMes?.valor || 0

  async function salvarMeta() {
    const v = parseFloat(novaMeta)
    if (isNaN(v) || v <= 0) { toast('Informe um valor válido', 'err'); return }
    if (metaMes) {
      await updateDocument('metas', metaMes.id, { valor: v })
      toast('Meta atualizada!')
    } else {
      await addDocument('metas', { mes: mesSel, valor: v })
      toast('Meta definida!')
    }
    setNovaMeta('')
  }

  // Vendas do mês
  const vendasMes   = vendas.filter(v => isSameMonth(parseDate(v.data), dataRefMes))
  const receitaMes  = vendasMes.filter(v => v.pgto !== 'Ficha').reduce((a, v) => a + v.total, 0)
  const metaPct     = metaValor > 0 ? (receitaMes / metaValor) * 100 : 0

  // ── Ranking produtos mais vendidos ──────────────────────────────────────
  const rankingMap = {}
  vendas.forEach(venda => {
    if (!isSameMonth(parseDate(venda.data), dataRefMes)) return
    ;(venda.itens || []).forEach(item => {
      if (!rankingMap[item.prodId]) rankingMap[item.prodId] = { nome: item.nome, unidade: item.unidade, qtd: 0, receita: 0, vendas: 0 }
      rankingMap[item.prodId].qtd     += item.qtd
      rankingMap[item.prodId].receita += item.subtotal
      rankingMap[item.prodId].vendas  += 1
    })
  })
  const ranking = Object.values(rankingMap).sort((a, b) => b.receita - a.receita)

  // ── Margem de lucro por produto ──────────────────────────────────────────
  const comprasPorProd = {}
  compras.forEach(c => {
    if (!comprasPorProd[c.prodId]) comprasPorProd[c.prodId] = { totalGasto: 0, totalQtd: 0 }
    comprasPorProd[c.prodId].totalGasto += c.total
    comprasPorProd[c.prodId].totalQtd  += c.qtd
  })

  const margens = produtos.map(p => {
    const cp = comprasPorProd[p.id]
    const custoUnd  = cp && cp.totalQtd > 0 ? cp.totalGasto / cp.totalQtd : null
    const margemT1  = custoUnd !== null ? ((p.preco1 - custoUnd) / p.preco1) * 100 : null
    const margemT2  = custoUnd !== null ? ((p.preco2 - custoUnd) / p.preco2) * 100 : null
    return { ...p, custoUnd, margemT1, margemT2 }
  }).sort((a, b) => (b.margemT1 || -999) - (a.margemT1 || -999))

  // ── Financeiro do mês ────────────────────────────────────────────────────
  const lancsMes   = lancamentos.filter(l => isSameMonth(parseDate(l.data), dataRefMes))
  const entMes     = lancsMes.filter(l => l.tipo==='entrada').reduce((a,l)=>a+l.val,0)
  const saiMes     = lancsMes.filter(l => l.tipo==='saida').reduce((a,l)=>a+l.val,0)
  const lucroMes   = entMes - saiMes

  // ── Exports ───────────────────────────────────────────────────────────────
  function exportVendas() {
    exportCSV(`vendas_${mesSel}.csv`,
      ['Data','Cliente','Itens','Tabela','Pagamento','Total (R$)'],
      vendasMes.map(v => [
        v.data, v.clienteNome||'—',
        v.itens?.map(i=>`${i.nome} (${fmtQ(i.qtd,i.unidade)})`).join('; ')||'',
        v.tabela==='2'?'Revenda':'Final', v.pgto,
        v.total.toFixed(2).replace('.',','),
      ])
    )
    toast('Exportado com sucesso!')
  }

  function exportProdutos() {
    exportCSV('produtos_estoque.csv',
      ['Produto','Categoria','Unidade','Qtd em estoque','Preço T1 (R$)','Preço T2 (R$)'],
      produtos.map(p => [
        p.nome, p.cat, p.unidade, p.qtd,
        p.preco1.toFixed(2).replace('.',','),
        p.preco2.toFixed(2).replace('.',','),
      ])
    )
    toast('Exportado com sucesso!')
  }

  function exportFinanceiro() {
    exportCSV(`financeiro_${mesSel}.csv`,
      ['Data','Descrição','Categoria','Tipo','Valor (R$)'],
      lancsMes.map(l => [
        l.data, l.desc, l.cat, l.tipo==='entrada'?'Entrada':'Saída',
        l.val.toFixed(2).replace('.',','),
      ])
    )
    toast('Exportado com sucesso!')
  }

  function exportRanking() {
    exportCSV(`ranking_produtos_${mesSel}.csv`,
      ['Produto','Qtd Vendida','Receita (R$)','Nº Vendas'],
      ranking.map(r => [
        r.nome, fmtQ(r.qtd, r.unidade),
        r.receita.toFixed(2).replace('.',','), r.vendas,
      ])
    )
    toast('Exportado com sucesso!')
  }

  const nomeMes = dataRefMes.toLocaleDateString('pt-BR', { month:'long', year:'numeric' })

  return (
    <div>
      <PageTitle>📈 Relatórios & Análises</PageTitle>

      {/* Seletor de mês */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <FG label="Mês de referência" style={{ maxWidth:200 }}>
          <input type="month" value={mesSel} onChange={e => setMesSel(e.target.value)} style={SEL} />
        </FG>
        <span style={{ fontSize:14, color:'var(--text2)', textTransform:'capitalize', alignSelf:'flex-end', paddingBottom:6 }}>
          {nomeMes}
        </span>
      </div>

      {/* ── META DE VENDAS ── */}
      <Card>
        <CardTitle>🎯 Meta de Vendas — {nomeMes}</CardTitle>
        <FormRow style={{ marginBottom: 12 }}>
          <Input label="Definir meta mensal (R$)" value={novaMeta}
            onChange={e => setNovaMeta(e.target.value)}
            type="number" min="0" step="0.01"
            placeholder={metaValor > 0 ? `Atual: ${fmt(metaValor)}` : 'Ex: 10000,00'}
            fg={{ maxWidth: 220 }} />
          <Btn primary onClick={salvarMeta} style={{ alignSelf:'flex-end' }}>
            {metaMes ? '💾 Atualizar meta' : '+ Definir meta'}
          </Btn>
        </FormRow>

        {metaValor > 0 ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span>Receita do mês: <strong style={{ color:'#0F6E56' }}>{fmt(receitaMes)}</strong></span>
              <span>Meta: <strong>{fmt(metaValor)}</strong></span>
              <span style={{ fontWeight:600, color: metaPct >= 100 ? '#0F6E56' : metaPct >= 70 ? '#185FA5' : '#993C1D' }}>
                {metaPct.toFixed(1)}% atingido
              </span>
            </div>
            <ProgressBar value={receitaMes} max={metaValor} />
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>
              {metaPct >= 100
                ? '🎉 Meta atingida! Parabéns!'
                : `Faltam ${fmt(metaValor - receitaMes)} para atingir a meta`}
            </div>
          </>
        ) : (
          <InfoBox color="blue" style={{ marginBottom:0 }}>
            ℹ️ Defina uma meta mensal para acompanhar o progresso das vendas.
          </InfoBox>
        )}
      </Card>

      {/* ── RESUMO FINANCEIRO DO MÊS ── */}
      <Card>
        <CardTitle>💰 Resumo Financeiro — {nomeMes}</CardTitle>
        <MetricsGrid>
          <Metric label="Entradas"      value={fmt(entMes)}    color="green" />
          <Metric label="Saídas"        value={fmt(saiMes)}    color="red"   />
          <Metric label="Resultado"     value={fmt(lucroMes)}  color={lucroMes >= 0 ? 'green' : 'red'} />
          <Metric label="Vendas no mês" value={vendasMes.length} />
          <Metric label="Receita vendas"value={fmt(receitaMes)} color="blue" />
        </MetricsGrid>
      </Card>

      {/* ── RANKING PRODUTOS MAIS VENDIDOS ── */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
          <CardTitle style={{ marginBottom:0 }}>🏆 Produtos Mais Vendidos — {nomeMes}</CardTitle>
          {ranking.length > 0 && (
            <Btn sm onClick={exportRanking}>📥 Exportar CSV</Btn>
          )}
        </div>
        {!ranking.length
          ? <EmptyState>Nenhuma venda registrada neste mês</EmptyState>
          : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr>
                <TH>#</TH><TH>Produto</TH><TH right>Qtd vendida</TH>
                <TH right>Nº vendas</TH><TH right>Receita</TH><TH>Participação</TH>
              </tr></thead>
              <tbody>
                {ranking.map((r, i) => {
                  const pct = receitaMes > 0 ? (r.receita / receitaMes) * 100 : 0
                  return (
                    <tr key={i}>
                      <TD>
                        <span style={{ fontWeight:700, color: i===0?'#E65100':i===1?'#6b6860':i===2?'#854F0B':'var(--text)' }}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                        </span>
                      </TD>
                      <TD bold>{r.nome}</TD>
                      <TD right>{fmtQ(r.qtd, r.unidade)}</TD>
                      <TD right>{r.vendas}</TD>
                      <TD right bold color="#0F6E56">{fmt(r.receita)}</TD>
                      <TD>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ flex:1, background:'var(--bg2)', borderRadius:99, height:8, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${pct}%`, background:'#185FA5', height:'100%', borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:11, color:'var(--text2)', minWidth:32 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        }
      </Card>

      {/* ── MARGEM DE LUCRO ── */}
      <Card>
        <CardTitle>📊 Margem de Lucro por Produto</CardTitle>
        <InfoBox color="blue">
          ℹ️ Calculado com base no preço médio de compra registrado na aba Compras. Produtos sem compra registrada aparecem como "—".
        </InfoBox>
        {!margens.length
          ? <EmptyState>Nenhum produto cadastrado</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  <TH>Produto</TH><TH right>Custo médio</TH>
                  <TH right>Preço T1</TH><TH right>Margem T1</TH>
                  <TH right>Preço T2</TH><TH right>Margem T2</TH>
                </tr></thead>
                <tbody>
                  {margens.map(p => {
                    const m1color = p.margemT1 === null ? 'gray' : p.margemT1 >= 30 ? 'green' : p.margemT1 >= 10 ? 'amber' : 'red'
                    const m2color = p.margemT2 === null ? 'gray' : p.margemT2 >= 20 ? 'green' : p.margemT2 >= 5  ? 'amber' : 'red'
                    return (
                      <tr key={p.id}>
                        <TD bold>{p.nome}</TD>
                        <TD right secondary>{p.custoUnd !== null ? fmt(p.custoUnd) : '—'}</TD>
                        <TD right color="#E65100">{fmt(p.preco1)}</TD>
                        <TD right>
                          {p.margemT1 !== null
                            ? <Badge label={`${p.margemT1.toFixed(1)}%`} color={m1color} />
                            : <span style={{ color:'var(--text3)' }}>—</span>}
                        </TD>
                        <TD right color="#2E7D32">{fmt(p.preco2)}</TD>
                        <TD right>
                          {p.margemT2 !== null
                            ? <Badge label={`${p.margemT2.toFixed(1)}%`} color={m2color} />
                            : <span style={{ color:'var(--text3)' }}>—</span>}
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>

      {/* ── EXPORTAR DADOS ── */}
      <Card>
        <CardTitle>📥 Exportar Dados para Excel</CardTitle>
        <InfoBox color="blue">
          ℹ️ Os arquivos são exportados em formato CSV que abre diretamente no Excel ou Google Planilhas.
        </InfoBox>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn onClick={exportVendas}  >📊 Vendas do mês</Btn>
          <Btn onClick={exportFinanceiro}>💰 Financeiro do mês</Btn>
          <Btn onClick={exportRanking} >🏆 Ranking de produtos</Btn>
          <Btn onClick={exportProdutos}>📦 Estoque atual</Btn>
        </div>
      </Card>
    </div>
  )
}
