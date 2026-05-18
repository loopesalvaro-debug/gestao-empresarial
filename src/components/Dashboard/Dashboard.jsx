import { useState, useEffect } from 'react'
import { subscribeCollection } from '../../lib/firestore'
import { fmt, fmtQ, parseDate, isSameDay, isSameMonth, diffDays, fmtDate } from '../../lib/utils'
import { Loading } from '../shared/UI'

// ── Mini KPI card ─────────────────────────────────────────────────────────
function KPI({ label, value, sub, color, icon }) {
  const cores = { green:'#0F6E56', red:'#993C1D', amber:'#854F0B', blue:'#185FA5', purple:'#5B35B5', teal:'#00695C', gray:'#6b6860' }
  return (
    <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        {icon && <span style={{ fontSize:16 }}>{icon}</span>}
        <span style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:20, fontWeight:700, color: cores[color] || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function Grid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:12 }}>{children}</div>
}

function Section({ title, icon, color, children }) {
  const bdr = { green:'#A5D6A7', amber:'#FFCC80', red:'#EF9A9A', blue:'#90CAF9', purple:'#CE93D8', gray:'var(--border2)' }
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${bdr[color]||bdr.gray}` }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <span style={{ fontSize:16, fontWeight:600 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

const BADGE_COLORS = {
  green:  { bg:'#E1F5EE', fg:'#0F6E56' },
  red:    { bg:'#FAECE7', fg:'#993C1D' },
  amber:  { bg:'#FAEEDA', fg:'#854F0B' },
  blue:   { bg:'#E6F1FB', fg:'#185FA5' },
  gray:   { bg:'#f5f5f4', fg:'#6b6860' },
  purple: { bg:'#F0EAFB', fg:'#5B35B5' },
  tab1:   { bg:'#FFF3E0', fg:'#E65100' },
  tab2:   { bg:'#E8F5E9', fg:'#2E7D32' },
}

function Bdg({ label, color = 'gray' }) {
  const c = BADGE_COLORS[color] || BADGE_COLORS.gray
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600, background:c.bg, color:c.fg }}>{label}</span>
}

function SimpleTable({ headers, rows, emptyMsg = 'Nenhum registro' }) {
  if (!rows.length) return <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:'12px 0' }}>{emptyMsg}</div>
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {headers.map((h, i) => <th key={i} style={{ textAlign:h.right?'right':'left', padding:'6px 8px', fontSize:12, fontWeight:600, color:'var(--text2)' }}>{h.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom:'1px solid var(--border)', background: row.bg || 'transparent' }}>
              {row.cells.map((cell, ci) => (
                <td key={ci} style={{ padding:'8px 8px', textAlign:headers[ci]?.right?'right':'left', color:cell.color||'var(--text)', fontWeight:cell.bold?600:400, fontSize:13 }}>
                  {cell.badge ? <Bdg label={cell.v} color={cell.badge} /> : cell.v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const [lancamentos, setLancamentos] = useState(null)
  const [produtos,    setProdutos]    = useState(null)
  const [vendas,      setVendas]      = useState(null)
  const [fichas,      setFichas]      = useState(null)
  const [boletos,     setBoletos]     = useState(null)
  const [compras,     setCompras]     = useState(null)
  const [dataSel,     setDataSel]     = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const u1 = subscribeCollection('lancamentos', setLancamentos)
    const u2 = subscribeCollection('produtos',    setProdutos)
    const u3 = subscribeCollection('vendas',      setVendas)
    const u4 = subscribeCollection('fichas',      setFichas)
    const u5 = subscribeCollection('boletos',     setBoletos, 'vencimento')
    const u6 = subscribeCollection('compras',     setCompras)
    return () => { u1(); u2(); u3(); u4(); u5(); u6() }
  }, [])

  if ([lancamentos, produtos, vendas, fichas, boletos, compras].some(x => x === null)) return <Loading />

  const dataSelecionada = new Date(dataSel + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const ehHoje = isSameDay(dataSelecionada, hoje)

  // Vendas
  const vendasDia  = vendas.filter(v => isSameDay(parseDate(v.data), dataSelecionada))
  const vendasMes  = vendas.filter(v => isSameMonth(parseDate(v.data), dataSelecionada))
  const recDia     = vendasDia.filter(v => v.pgto !== 'Ficha').reduce((a,v)=>a+v.total,0)
  const recMes     = vendasMes.filter(v => v.pgto !== 'Ficha').reduce((a,v)=>a+v.total,0)
  const fichasDia  = vendasDia.filter(v => v.pgto === 'Ficha').reduce((a,v)=>a+v.total,0)

  // Compras
  const comprasDia = compras.filter(c => isSameDay(parseDate(c.data), dataSelecionada))
  const comprasMes = compras.filter(c => isSameMonth(parseDate(c.data), dataSelecionada))
  const gastoDia   = comprasDia.reduce((a,c)=>a+c.total,0)
  const gastoMes   = comprasMes.reduce((a,c)=>a+c.total,0)

  // Fichas
  const fichasPend   = fichas.filter(f => f.status === 'pendente')
  const totalFichas  = fichasPend.reduce((a,f)=>a+f.total,0)
  const fichasRecDia = fichas.filter(f => f.status==='recebida' && isSameDay(parseDate(f.dataReceb), dataSelecionada))
  const recFichasDia = fichasRecDia.reduce((a,f)=>a+f.total,0)

  // Financeiro
  const entTotal = lancamentos.filter(l=>l.tipo==='entrada').reduce((a,l)=>a+l.val,0)
  const saiTotal = lancamentos.filter(l=>l.tipo==='saida').reduce((a,l)=>a+l.val,0)
  const saldo    = entTotal - saiTotal
  const entDia   = lancamentos.filter(l=>l.tipo==='entrada'&&isSameDay(parseDate(l.data),dataSelecionada)).reduce((a,l)=>a+l.val,0)
  const saiDia   = lancamentos.filter(l=>l.tipo==='saida'  &&isSameDay(parseDate(l.data),dataSelecionada)).reduce((a,l)=>a+l.val,0)

  // Boletos
  const boletosPend  = boletos.filter(b=>b.status!=='pago')
  const boletosVenc  = boletosPend.filter(b=>{ const d=parseDate(b.vencimento); return d&&diffDays(d)<0 })
  const boletosHoje  = boletosPend.filter(b=>{ const d=parseDate(b.vencimento); return d&&isSameDay(d,hoje) })
  const boletos7d    = boletosPend.filter(b=>{ const d=parseDate(b.vencimento); if(!d)return false; const df=diffDays(d); return df>=0&&df<=7 })
  const totalBolPend = boletosPend.reduce((a,b)=>a+b.valor,0)
  const totalBolVenc = boletosVenc.reduce((a,b)=>a+b.valor,0)
  const bolPagosDia  = boletos.filter(b=>b.status==='pago'&&isSameDay(parseDate(b.dataPagamento),dataSelecionada))
  const pagoBolDia   = bolPagosDia.reduce((a,b)=>a+b.valor,0)

  // Estoque
  const estoqueValor = produtos.reduce((a,p)=>a+p.qtd*p.preco1,0)
  const semEstoque   = produtos.filter(p=>p.qtd<=0)
  const estBaixo     = produtos.filter(p=>p.qtd>0&&p.qtd<=5)

  // Fichas por cliente
  const fichasPorCli = fichasPend.reduce((acc,f)=>{
    const k = f.clienteNome||'Sem cliente'
    acc[k] = (acc[k]||0)+f.total
    return acc
  }, {})

  const lucroBruto  = recDia - gastoDia
  const resultLiq   = recDia + recFichasDia - gastoDia - pagoBolDia

  const fmtBR = (date) => date.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700 }}>📊 Relatório Diário</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:2, textTransform:'capitalize' }}>
            {fmtBR(dataSelecionada)}
            {ehHoje && <span style={{ marginLeft:8, background:'#E1F5EE', color:'#0F6E56', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>HOJE</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, color:'var(--text2)' }}>Selecionar data</label>
            <input type="date" value={dataSel} onChange={e=>setDataSel(e.target.value)}
              style={{ height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit' }}/>
          </div>
          <button onClick={()=>window.print()}
            style={{ height:36, padding:'0 16px', borderRadius:8, border:'none', background:'var(--text)', color:'var(--bg)', fontSize:14, cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>

      {/* RESUMO */}
      <Section title="Resumo do Dia" icon="⚡" color="blue">
        <Grid>
          <KPI icon="💰" label="Entradas do dia"    value={fmt(entDia)}      color="green" sub={`Mês: ${fmt(recMes)}`} />
          <KPI icon="💸" label="Saídas do dia"      value={fmt(saiDia)}      color="red"   sub={`Compras: ${fmt(gastoDia)}`} />
          <KPI icon="📈" label="Lucro bruto do dia" value={fmt(lucroBruto)}  color={lucroBruto>=0?'green':'red'} />
          <KPI icon="🏦" label="Saldo geral"        value={fmt(saldo)}       color={saldo>=0?'green':'red'} sub="Acumulado total" />
        </Grid>
      </Section>

      {/* VENDAS */}
      <Section title="Vendas" icon="🛒" color="green">
        <Grid>
          <KPI icon="🛒" label="Vendas hoje"    value={vendasDia.length} />
          <KPI icon="💵" label="Receita hoje"   value={fmt(recDia)}     color="green" />
          <KPI icon="📋" label="Em ficha hoje"  value={fmt(fichasDia)}  color="amber" />
          <KPI icon="📅" label="Receita do mês" value={fmt(recMes)}     color="blue"  />
        </Grid>
        <SimpleTable
          headers={[{label:'Cliente'},{label:'Itens'},{label:'Pagamento'},{label:'Tabela'},{label:'Total',right:true}]}
          rows={vendasDia.map(v=>({ cells:[
            {v:v.clienteNome||'—'},
            {v:(v.itens||[]).map(i=>`${i.nome} (${fmtQ(i.qtd,i.unidade)})`).join(', ')},
            {v:v.pgto, badge:v.pgto==='Ficha'?'amber':'blue'},
            {v:v.tabela==='2'?'T2 — Revenda':'T1 — Final', badge:v.tabela==='2'?'tab2':'tab1'},
            {v:fmt(v.total), color:'#0F6E56', bold:true},
          ]}))}
          emptyMsg="Nenhuma venda neste dia"
        />
      </Section>

      {/* FICHAS */}
      <Section title="Fichas Pendentes" icon="📋" color="amber">
        <Grid>
          <KPI icon="📋" label="Fichas em aberto"   value={fichasPend.length}              color={fichasPend.length?'amber':undefined} />
          <KPI icon="💰" label="Total a receber"    value={fmt(totalFichas)}               color={totalFichas>0?'amber':undefined} />
          <KPI icon="✅" label="Recebido hoje"      value={fmt(recFichasDia)}              color={recFichasDia>0?'green':undefined} />
          <KPI icon="👥" label="Clientes c/ ficha"  value={Object.keys(fichasPorCli).length} color="blue" />
        </Grid>
        {Object.keys(fichasPorCli).length > 0
          ? <SimpleTable
              headers={[{label:'Cliente'},{label:'Total em aberto',right:true}]}
              rows={Object.entries(fichasPorCli).sort((a,b)=>b[1]-a[1]).map(([nome,total])=>({ cells:[
                {v:nome,bold:true},
                {v:fmt(total),color:'#854F0B',bold:true},
              ]}))}
            />
          : <div style={{ textAlign:'center', color:'#0F6E56', fontSize:13, padding:'10px 0', fontWeight:500 }}>🎉 Nenhuma ficha pendente!</div>
        }
      </Section>

      {/* COMPRAS */}
      <Section title="Compras" icon="🛍️" color="purple">
        <Grid>
          <KPI icon="🛍️" label="Compras hoje"  value={comprasDia.length} />
          <KPI icon="💸" label="Gasto hoje"    value={fmt(gastoDia)}     color="red"   />
          <KPI icon="📅" label="Gasto no mês"  value={fmt(gastoMes)}     color="amber" />
        </Grid>
        <SimpleTable
          headers={[{label:'Produto'},{label:'Fornecedor'},{label:'Qtd',right:true},{label:'Unit.',right:true},{label:'Total',right:true}]}
          rows={comprasDia.map(c=>({ cells:[
            {v:c.prodNome,bold:true},
            {v:c.fornecedor||'—'},
            {v:fmtQ(c.qtd,c.unidade),right:true},
            {v:fmt(c.valorUnit)},
            {v:fmt(c.total),color:'#993C1D',bold:true},
          ]}))}
          emptyMsg="Nenhuma compra neste dia"
        />
      </Section>

      {/* BOLETOS */}
      <Section title="Boletos" icon="📄" color="red">
        <Grid>
          <KPI icon="⚠️" label="Vencidos"         value={boletosVenc.length} color={boletosVenc.length?'red':undefined}   sub={fmt(totalBolVenc)} />
          <KPI icon="📅" label="Vencem hoje"       value={boletosHoje.length} color={boletosHoje.length?'amber':undefined} />
          <KPI icon="🗓️" label="Vencem em 7 dias" value={boletos7d.length}   color={boletos7d.length?'amber':undefined}   />
          <KPI icon="💰" label="Total pendente"    value={fmt(totalBolPend)}  color={totalBolPend>0?'red':undefined}       />
          <KPI icon="✅" label="Pago hoje"         value={fmt(pagoBolDia)}    color={pagoBolDia>0?'green':undefined}       />
        </Grid>
        {(boletosVenc.length>0||boletosHoje.length>0||boletos7d.length>0) ? (
          <SimpleTable
            headers={[{label:'Descrição'},{label:'Fornecedor'},{label:'Vencimento'},{label:'Status'},{label:'Valor',right:true}]}
            rows={[...boletosVenc,...boletosHoje,...boletos7d.filter(b=>!boletosHoje.includes(b)&&!boletosVenc.includes(b))].map(b=>{
              const d  = parseDate(b.vencimento)
              const df = d ? diffDays(d) : null
              const st = df===null?{l:'—',c:'gray'}:df<0?{l:`Vencido há ${Math.abs(df)}d`,c:'red'}:df===0?{l:'Hoje',c:'amber'}:{l:`Em ${df}d`,c:'amber'}
              return {
                bg: st.c==='red'?'#FFF5F5':st.c==='amber'?'#FFFBF0':'transparent',
                cells:[
                  {v:b.descricao,bold:true},
                  {v:b.fornecedor||'—'},
                  {v:fmtDate(b.vencimento)},
                  {v:st.l,badge:st.c},
                  {v:fmt(b.valor),color:'#993C1D',bold:true},
                ]
              }
            })}
          />
        ) : (
          <div style={{ textAlign:'center', color:'#0F6E56', fontSize:13, padding:'10px 0', fontWeight:500 }}>🎉 Nenhum boleto vencido ou a vencer em breve!</div>
        )}
      </Section>

      {/* ESTOQUE */}
      <Section title="Estoque" icon="📦" color="green">
        <Grid>
          <KPI icon="📦" label="Produtos"          value={produtos.length} />
          <KPI icon="💰" label="Valor em estoque"  value={fmt(estoqueValor)}  color="blue" />
          <KPI icon="⚠️" label="Estoque baixo (≤5)"value={estBaixo.length}   color={estBaixo.length?'amber':undefined} />
          <KPI icon="❌" label="Sem estoque"        value={semEstoque.length} color={semEstoque.length?'red':undefined}  />
        </Grid>
        {(semEstoque.length>0||estBaixo.length>0) ? (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:8 }}>⚠️ Requer atenção:</div>
            <SimpleTable
              headers={[{label:'Produto'},{label:'Categoria'},{label:'Estoque',right:true},{label:'Status'}]}
              rows={[...semEstoque,...estBaixo].map(p=>({
                bg: p.qtd<=0?'#FFF5F5':'#FFFBF0',
                cells:[
                  {v:p.nome,bold:true},
                  {v:p.cat},
                  {v:fmtQ(p.qtd,p.unidade),color:p.qtd<=0?'#993C1D':'#854F0B',bold:true},
                  {v:p.qtd<=0?'Sem estoque':'Baixo', badge:p.qtd<=0?'red':'amber'},
                ]
              }))}
            />
          </>
        ) : (
          <div style={{ textAlign:'center', color:'#0F6E56', fontSize:13, padding:'10px 0', fontWeight:500 }}>🎉 Todos os produtos com estoque adequado!</div>
        )}
      </Section>

      {/* RESULTADO DO DIA */}
      <div style={{
        background: resultLiq>=0?'#E1F5EE':'#FAECE7',
        border: `1px solid ${resultLiq>=0?'#A5D6A7':'#EF9A9A'}`,
        borderRadius:14, padding:'20px 24px', marginBottom:8,
      }}>
        <div style={{ fontSize:15, fontWeight:600, color:resultLiq>=0?'#0F6E56':'#993C1D', marginBottom:14 }}>
          {resultLiq>=0?'📈 Resultado positivo no dia!':'📉 Resultado negativo no dia'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
          {[
            { l:'Receita de vendas',   v:fmt(recDia),      c:'#0F6E56' },
            { l:'Recebido de fichas',  v:fmt(recFichasDia),c:'#0F6E56' },
            { l:'Compras realizadas',  v:fmt(gastoDia),    c:'#993C1D' },
            { l:'Boletos pagos',       v:fmt(pagoBolDia),  c:'#993C1D' },
            { l:'Resultado líquido',   v:fmt(resultLiq),   c:resultLiq>=0?'#0F6E56':'#993C1D' },
          ].map((item,i) => (
            <div key={i}>
              <div style={{ fontSize:11, color:resultLiq>=0?'#0F6E56':'#993C1D', opacity:.8, marginBottom:3 }}>{item.l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:item.c }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@media print{nav,header,button,input[type=date]{display:none!important}main{padding:0!important}}`}</style>
    </div>
  )
}
