import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, fmtQ, today, uid } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit',width:'100%' }

export default function Vendas() {
  const toast = useToast()
  const [produtos, setProdutos] = useState(null)
  const [clientes, setClientes] = useState([])
  const [vendas,   setVendas]   = useState(null)

  const [editId,  setEditId]  = useState(null)
  const [dataVnd, setDataVnd] = useState(today())
  const [cliId,   setCliId]   = useState('')
  const [tabela,  setTabela]  = useState('1')
  const [pgto,    setPgto]    = useState('Dinheiro')
  const [obs,     setObs]     = useState('')

  const [cartProdId, setCartProdId] = useState('')
  const [cartQtd,    setCartQtd]    = useState('1')
  const [cartPreco,  setCartPreco]  = useState('')
  const [descTipo,   setDescTipo]   = useState('nenhum')
  const [descVal,    setDescVal]    = useState('')
  const [cart, setCart] = useState([])

  useEffect(() => {
    const u1 = subscribeCollection('produtos', setProdutos)
    const u2 = subscribeCollection('clientes', setClientes)
    const u3 = subscribeCollection('vendas',   setVendas)
    return () => { u1(); u2(); u3() }
  }, [])

  function onClienteChange(id) {
    setCliId(id)
    const c = clientes.find(x => x.id === id)
    if (c) setTabela(c.tabela || '1')
    setCartProdId(''); setCartPreco(''); setCartQtd('1')
  }

  function onProdChange(id) {
    setCartProdId(id)
    setDescTipo('nenhum'); setDescVal(''); setCartQtd('1')
    const p = produtos?.find(x => x.id === id)
    if (p) setCartPreco((tabela === '2' ? p.preco2 : p.preco1).toFixed(2))
  }

  function calcSubtotal() {
    const q = parseFloat(cartQtd) || 0
    const pr = parseFloat(cartPreco) || 0
    const dv = parseFloat(descVal) || 0
    const bruto = q * pr
    if (descTipo === 'pct'   && dv > 0) return Math.max(0, bruto - bruto * (dv / 100))
    if (descTipo === 'reais' && dv > 0) return Math.max(0, bruto - dv)
    return bruto
  }

  function addCartItem() {
    const p = produtos?.find(x => x.id === cartProdId)
    if (!p) { toast('Selecione um produto', 'err'); return }
    const qtd = parseFloat(cartQtd), preco = parseFloat(cartPreco)
    if (!qtd || qtd <= 0) { toast('Quantidade inválida', 'err'); return }
    if (!preco || preco <= 0) { toast('Informe o preço', 'err'); return }

    if (!editId) {
      const jaCart = cart.filter(i => i.prodId === p.id).reduce((a, i) => a + i.qtd, 0)
      if (qtd + jaCart > p.qtd) {
        toast(`Estoque insuficiente! Disponível: ${fmtQ(p.qtd - jaCart, p.unidade)}`, 'err'); return
      }
    }

    const dv = parseFloat(descVal) || 0
    const bruto = qtd * preco
    let desconto = 0, descontoLabel = ''
    if (descTipo === 'pct'   && dv > 0) { desconto = bruto * (dv / 100); descontoLabel = `${dv}%` }
    if (descTipo === 'reais' && dv > 0) { desconto = dv;                  descontoLabel = fmt(dv) }

    setCart(prev => [...prev, {
      id: uid(), prodId: p.id, nome: p.nome, qtd, preco,
      unidade: p.unidade, fracionavel: p.fracionavel,
      desconto, descontoLabel, subtotal: bruto - desconto,
    }])
    setCartProdId(''); setCartQtd('1'); setCartPreco('')
    setDescTipo('nenhum'); setDescVal('')
    toast(`${p.nome} adicionado ✔`)
  }

  const cartTotal = cart.reduce((a, i) => a + i.subtotal, 0)

  function limparForm() {
    setEditId(null); setDataVnd(today()); setCliId(''); setTabela('1')
    setPgto('Dinheiro'); setObs(''); setCart([])
    setCartProdId(''); setCartQtd('1'); setCartPreco('')
    setDescTipo('nenhum'); setDescVal('')
  }

  function iniciarEdicao(v) {
    setEditId(v.id)
    setDataVnd(v.data || today())
    setCliId(v.clienteId || '')
    setTabela(v.tabela || '1')
    setPgto(v.pgto || 'Dinheiro')
    setObs(v.obs || '')
    setCart((v.itens || []).map(i => ({ ...i, id: i.id || uid() })))
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast('Editando venda — altere e confirme', 'warn')
  }

  async function confirmarVenda() {
    if (!cart.length) { toast('Adicione pelo menos um produto', 'err'); return }
    const cli      = clientes.find(c => c.id === cliId)
    const cliNome  = cli?.nome || ''
    const total    = cartTotal
    const itensTxt = cart.map(i => `${i.nome} (${fmtQ(i.qtd, i.unidade)})`).join(', ')

    if (editId) {
      const vendaAntiga = vendas.find(v => v.id === editId)
      // Devolve estoque antigo
      if (vendaAntiga?.itens) {
        for (const item of vendaAntiga.itens) {
          const p = produtos.find(x => x.id === item.prodId)
          if (p) await updateDocument('produtos', p.id, { qtd: parseFloat((p.qtd + item.qtd).toFixed(6)) })
        }
      }
      // Deduz estoque novo
      for (const item of cart) {
        const p = produtos.find(x => x.id === item.prodId)
        if (p) await updateDocument('produtos', p.id, { qtd: Math.max(0, parseFloat((p.qtd - item.qtd).toFixed(6))) })
      }
      await updateDocument('vendas', editId, {
        data: dataVnd, itens: cart, total, pgto, tabela,
        clienteId: cliId, clienteNome: cliNome, obs,
      })
      toast('Venda atualizada! ✅')
    } else {
      for (const item of cart) {
        const p = produtos.find(x => x.id === item.prodId)
        if (p) await updateDocument('produtos', p.id, { qtd: Math.max(0, parseFloat((p.qtd - item.qtd).toFixed(6))) })
      }
      const vendaRef = await addDocument('vendas', {
        data: dataVnd, itens: cart, total, pgto, tabela,
        clienteId: cliId, clienteNome: cliNome, obs,
      })
      if (pgto === 'Ficha') {
        await addDocument('fichas', {
          vendaId: vendaRef.id, data: dataVnd, total, tabela,
          clienteId: cliId, clienteNome: cliNome, itensTxt, status: 'pendente',
        })
        toast('Venda na ficha registrada! ⏳', 'warn')
      } else {
        await addDocument('lancamentos', {
          desc: `Venda – ${itensTxt}${cliNome ? ' (' + cliNome + ')' : ''}`,
          val: total, tipo: 'entrada', cat: 'Vendas', data: dataVnd, origem: 'Venda',
        })
        toast('Venda confirmada! ✅')
      }
    }
    limparForm()
  }

  if (produtos === null || vendas === null) return <Loading />

  const totalVendas     = vendas.reduce((a, v) => a + v.total, 0)
  const ticket          = vendas.length ? totalVendas / vendas.length : 0
  const totalT1         = vendas.filter(v => v.tabela === '1').reduce((a, v) => a + v.total, 0)
  const totalT2         = vendas.filter(v => v.tabela === '2').reduce((a, v) => a + v.total, 0)
  const prodSelecionado = produtos.find(x => x.id === cartProdId)
  const isFrac          = prodSelecionado?.fracionavel === 'sim'
  const jaCart          = prodSelecionado
    ? cart.filter(i => i.prodId === prodSelecionado.id).reduce((a, i) => a + i.qtd, 0) : 0

  const vendasOrdenadas = [...vendas].sort((a, b) => {
    const da = (a.data || '').split('/').reverse().join('')
    const db = (b.data || '').split('/').reverse().join('')
    return db.localeCompare(da)
  })

  return (
    <div>
      <PageTitle>🛒 Vendas</PageTitle>

      <MetricsGrid>
        <Metric label="Vendas"        value={vendas.length} />
        <Metric label="Receita total" value={fmt(totalVendas)} color="green" />
        <Metric label="Ticket médio"  value={fmt(ticket)}      color="blue" />
        <Metric label="T1 — Final"    value={fmt(totalT1)}     color="orange" />
        <Metric label="T2 — Revenda"  value={fmt(totalT2)}     color="teal" />
      </MetricsGrid>

      <Card>
        <CardTitle>{editId ? '✏️ Editando venda' : '➕ Nova venda'}</CardTitle>

        {editId && (
          <InfoBox color="amber" style={{ marginBottom: 12 }}>
            ✏️ Você está <strong>editando uma venda</strong>. Altere o que precisar e clique em "Salvar alterações".
          </InfoBox>
        )}

        <FormRow>
          <FG label="📅 Data da venda" style={{ maxWidth: 150 }}>
            <input type="date" value={dataVnd} onChange={e => setDataVnd(e.target.value)} style={SEL} />
          </FG>
          <FG label="Cliente (opcional)">
            <select value={cliId} onChange={e => onClienteChange(e.target.value)} style={SEL}>
              <option value="">— Sem cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} (T{c.tabela || '1'})</option>)}
            </select>
          </FG>
          <FG label="Tabela" style={{ maxWidth: 170 }}>
            <select value={tabela} onChange={e => { setTabela(e.target.value); setCartProdId(''); setCartPreco('') }} style={SEL}>
              <option value="1">T1 — Cliente Final</option>
              <option value="2">T2 — Revenda</option>
            </select>
          </FG>
          <FG label="Pagamento" style={{ maxWidth: 185 }}>
            <select value={pgto} onChange={e => setPgto(e.target.value)} style={SEL}>
              {['Dinheiro','Pix','Cartão de crédito','Cartão de débito','Boleto','Ficha'].map(f => <option key={f}>{f}</option>)}
            </select>
          </FG>
          <Input label="Observação" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" />
        </FormRow>

        {pgto === 'Ficha' && !editId && (
          <InfoBox color="amber">
            ⚠️ Pagamento em <strong>Ficha</strong>: só entra no financeiro ao confirmar recebimento na aba Fichas.
          </InfoBox>
        )}

        {/* Adicionar item */}
        <div style={{ background:'var(--bg2)',borderRadius:10,padding:14,marginBottom:12 }}>
          <div style={{ fontSize:14,fontWeight:600,marginBottom:10 }}>➕ Adicionar produto</div>
          {!produtos.length
            ? <InfoBox color="blue" style={{ marginBottom:0 }}>Cadastre produtos na aba Estoque primeiro.</InfoBox>
            : <>
                <FormRow style={{ marginBottom: 6 }}>
                  <FG label="Produto" style={{ minWidth: 200, flex: 2 }}>
                    <select value={cartProdId} onChange={e => onProdChange(e.target.value)} style={SEL}>
                      <option value="">— Selecione —</option>
                      {produtos.map(p => {
                        const jc = cart.filter(i => i.prodId === p.id).reduce((a,i)=>a+i.qtd,0)
                        const disp = p.qtd - jc
                        return <option key={p.id} value={p.id}>{p.nome} — {disp > 0 ? `estoque: ${fmtQ(disp,p.unidade)}` : '⚠️ sem estoque'}</option>
                      })}
                    </select>
                  </FG>
                  <Input label={isFrac ? `Qtd (${prodSelecionado?.unidade})` : 'Qtd'}
                    value={cartQtd} onChange={e => setCartQtd(e.target.value)}
                    type="number" min={isFrac ? '0.001' : '1'} step={isFrac ? 'any' : '1'}
                    fg={{ maxWidth: 110 }} />
                  <Input label="Preço unit. (R$)" value={cartPreco}
                    onChange={e => setCartPreco(e.target.value)}
                    type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth: 140 }} />
                </FormRow>

                {isFrac && cartProdId && (
                  <div style={{ background:'#E0F2F1',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#00695C',marginBottom:8 }}>
                    ✂️ Fracionável — Disponível: <strong>{fmtQ(prodSelecionado.qtd - jaCart, prodSelecionado.unidade)}</strong>
                  </div>
                )}

                <div style={{ background:'#F9F0FF',border:'1px solid #CE93D8',borderRadius:10,padding:'10px 14px' }}>
                  <div style={{ fontSize:12,fontWeight:600,color:'#6A1B9A',marginBottom:8 }}>🏷️ Desconto (opcional)</div>
                  <FormRow style={{ marginBottom: 0 }}>
                    <FG label="Tipo" style={{ maxWidth: 150 }}>
                      <select value={descTipo} onChange={e => { setDescTipo(e.target.value); setDescVal('') }} style={SEL}>
                        <option value="nenhum">Sem desconto</option>
                        <option value="pct">Percentual (%)</option>
                        <option value="reais">Valor fixo (R$)</option>
                      </select>
                    </FG>
                    <Input label={descTipo === 'pct' ? '%' : 'R$'} value={descVal}
                      onChange={e => setDescVal(e.target.value)}
                      type="number" min="0" step="any" placeholder="0"
                      disabled={descTipo === 'nenhum'} fg={{ maxWidth: 110 }} />
                    <FG label="Subtotal" style={{ maxWidth: 150 }}>
                      <input readOnly value={cartProdId && calcSubtotal() > 0 ? fmt(calcSubtotal()) : ''}
                        placeholder="R$ 0,00"
                        style={{ ...SEL, background:'var(--bg2)', color:'#0F6E56', fontWeight:700 }} />
                    </FG>
                    <Btn primary onClick={addCartItem} style={{ alignSelf: 'flex-end' }}>+ Add</Btn>
                  </FormRow>
                </div>
              </>
          }
        </div>

        {cart.length > 0 && (
          <div style={{ border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:14 }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr>
                <TH>Produto</TH><TH>Qtd</TH>
                <TH right>Preço</TH><TH right>Desconto</TH><TH right>Subtotal</TH><TH />
              </tr></thead>
              <tbody>
                {cart.map(it => (
                  <tr key={it.id}>
                    <TD bold>{it.nome} <span style={{ fontWeight:400,color:'var(--text3)',fontSize:11 }}>{it.unidade}</span></TD>
                    <TD>{fmtQ(it.qtd, it.unidade)}</TD>
                    <TD right>{fmt(it.preco)}</TD>
                    <TD right>
                      {it.desconto > 0
                        ? <span style={{ color:'#993C1D',fontSize:12 }}>-{it.descontoLabel}</span>
                        : <span style={{ color:'var(--text3)' }}>—</span>}
                    </TD>
                    <TD right bold color="#0F6E56">{fmt(it.subtotal)}</TD>
                    <TD><DelBtn onClick={() => setCart(prev => prev.filter(i => i.id !== it.id))} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex',justifyContent:'flex-end',alignItems:'center',gap:16,padding:'12px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:14,fontWeight:500 }}>Total:</span>
              <span style={{ fontSize:22,fontWeight:700,color:'#0F6E56' }}>{fmt(cartTotal)}</span>
            </div>
          </div>
        )}

        <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
          {editId && <Btn onClick={limparForm}>Cancelar edição</Btn>}
          <Btn primary lg onClick={confirmarVenda} disabled={!cart.length}>
            {editId ? '💾 Salvar alterações' : '✅ Confirmar venda'}
          </Btn>
        </div>
      </Card>

      {/* Histórico */}
      <Card>
        <CardTitle>Histórico de vendas</CardTitle>
        {!vendas.length
          ? <EmptyState>Nenhuma venda ainda</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead><tr>
                  <TH>Data</TH><TH>Itens</TH><TH>Cliente</TH>
                  <TH>Tabela</TH><TH>Pagamento</TH><TH right>Total</TH><TH />
                </tr></thead>
                <tbody>
                  {vendasOrdenadas.map(v => (
                    <tr key={v.id} style={{ background: editId === v.id ? '#FAEEDA' : 'transparent' }}>
                      <TD secondary>{v.data}</TD>
                      <TD><span style={{ fontSize:12 }}>{v.itens?.map(i=>`${i.nome} (${fmtQ(i.qtd,i.unidade)})`).join(', ')}</span></TD>
                      <TD>{v.clienteNome || <span style={{ color:'var(--text3)' }}>—</span>}</TD>
                      <TD>{v.tabela==='2'?<Badge label="T2 — Revenda" color="tab2"/>:<Badge label="T1 — Final" color="tab1"/>}</TD>
                      <TD>{v.pgto==='Ficha'?<Badge label="Ficha" color="amber"/>:<Badge label={v.pgto} color="blue"/>}</TD>
                      <TD right bold color="#0F6E56">{fmt(v.total)}</TD>
                      <TD>
                        <button onClick={() => iniciarEdicao(v)} title="Editar venda"
                          style={{ background:'none',border:'none',cursor:'pointer',fontSize:15,opacity:.6,padding:'2px 4px' }}>✏️</button>
                      </TD>
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
