import { useState, useEffect } from 'react'
import {
  subscribeCollection, addDocument, updateDocument,
} from '../../lib/firestore'
import { fmt, fmtQ, today, uid } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Select, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

export default function Vendas() {
  const toast = useToast()
  const [produtos, setProdutos]   = useState(null)
  const [clientes, setClientes]   = useState([])
  const [vendas, setVendas]       = useState(null)

  // Cabeçalho da venda
  const [cliId, setCliId]     = useState('')
  const [tabela, setTabela]   = useState('1')
  const [pgto, setPgto]       = useState('Dinheiro')
  const [obs, setObs]         = useState('')

  // Item sendo adicionado ao carrinho
  const [cartProdId, setCartProdId]   = useState('')
  const [cartQtd, setCartQtd]         = useState('1')
  const [cartPreco, setCartPreco]     = useState('')
  const [descTipo, setDescTipo]       = useState('nenhum')
  const [descVal, setDescVal]         = useState('')

  // Carrinho local (itens confirmados)
  const [cart, setCart] = useState([])

  useEffect(() => {
    const u1 = subscribeCollection('produtos', setProdutos)
    const u2 = subscribeCollection('clientes', setClientes)
    const u3 = subscribeCollection('vendas',   setVendas)
    return () => { u1(); u2(); u3() }
  }, [])

  // Quando cliente muda, ajusta tabela
  function onClienteChange(id) {
    setCliId(id)
    const c = clientes.find(x => x.id === id)
    if (c) setTabela(c.tabela || '1')
    setCartProdId(''); setCartPreco(''); setCartQtd('1')
  }

  function onTabelaChange(t) {
    setTabela(t)
    setCartProdId(''); setCartPreco('')
  }

  // Quando produto selecionado, preenche preço conforme tabela
  function onProdChange(id) {
    setCartProdId(id)
    setDescTipo('nenhum'); setDescVal('')
    const p = produtos?.find(x => x.id === id)
    if (p) setCartPreco((tabela === '2' ? p.preco2 : p.preco1).toFixed(2))
    setCartQtd('1')
  }

  // Calcula subtotal do item atual
  function calcSubtotal() {
    const q  = parseFloat(cartQtd)  || 0
    const pr = parseFloat(cartPreco) || 0
    const dv = parseFloat(descVal)   || 0
    const bruto = q * pr
    if (descTipo === 'pct' && dv > 0)   return Math.max(0, bruto - bruto * (dv / 100))
    if (descTipo === 'reais' && dv > 0) return Math.max(0, bruto - dv)
    return bruto
  }

  const subtotalAtual = calcSubtotal()

  function addCartItem() {
    const p = produtos?.find(x => x.id === cartProdId)
    if (!p)                    { toast('Selecione um produto', 'err'); return }
    const qtd   = parseFloat(cartQtd)
    const preco = parseFloat(cartPreco)
    if (!qtd || qtd <= 0)      { toast('Quantidade inválida', 'err'); return }
    if (!preco || preco <= 0)  { toast('Informe o preço', 'err'); return }

    const jaCart = cart.filter(i => i.prodId === p.id).reduce((a, i) => a + i.qtd, 0)
    if (qtd + jaCart > p.qtd) { toast(`Estoque insuficiente! Disponível: ${fmtQ(p.qtd - jaCart, p.unidade)}`, 'err'); return }

    const dv      = parseFloat(descVal) || 0
    const bruto   = qtd * preco
    let desconto  = 0, descontoLabel = ''
    if (descTipo === 'pct'   && dv > 0) { desconto = bruto * (dv / 100); descontoLabel = `${dv}%` }
    if (descTipo === 'reais' && dv > 0) { desconto = dv;                  descontoLabel = fmt(dv) }
    const subtotal = bruto - desconto

    setCart(prev => [...prev, {
      id: uid(), prodId: p.id, nome: p.nome, qtd, preco,
      unidade: p.unidade, fracionavel: p.fracionavel,
      desconto, descontoLabel, subtotal,
    }])

    setCartProdId(''); setCartQtd('1'); setCartPreco('')
    setDescTipo('nenhum'); setDescVal('')
    toast(`${p.nome} adicionado ✔`)
  }

  const cartTotal = cart.reduce((a, i) => a + i.subtotal, 0)

  async function confirmarVenda() {
    if (!cart.length) { toast('Adicione pelo menos um produto', 'err'); return }

    const cli      = clientes.find(c => c.id === cliId)
    const cliNome  = cli?.nome || ''
    const total    = cartTotal
    const itensTxt = cart.map(i => `${i.nome} (${fmtQ(i.qtd, i.unidade)})`).join(', ')

    // Deduz estoque no Firestore
    for (const item of cart) {
      const p = produtos.find(x => x.id === item.prodId)
      if (p) {
        const novaQtd = Math.max(0, parseFloat((p.qtd - item.qtd).toFixed(6)))
        await updateDocument('produtos', p.id, { qtd: novaQtd })
      }
    }

    // Salva a venda
    const vendaData = { data: today(), itens: cart, total, pgto, tabela, clienteId: cliId, clienteNome: cliNome, obs }
    const vendaRef  = await addDocument('vendas', vendaData)

    if (pgto === 'Ficha') {
      await addDocument('fichas', {
        vendaId: vendaRef.id, data: today(), total, tabela,
        clienteId: cliId, clienteNome: cliNome, itensTxt, status: 'pendente',
      })
      toast('Venda registrada na ficha! Aguardando recebimento.', 'warn')
    } else {
      await addDocument('lancamentos', {
        desc: `Venda – ${itensTxt}${cliNome ? ' (' + cliNome + ')' : ''}`,
        val: total, tipo: 'entrada', cat: 'Vendas', data: today(), origem: 'Venda',
      })
      toast('Venda confirmada e lançada no financeiro! ✅')
    }

    // Limpa
    setCart([]); setCliId(''); setPgto('Dinheiro'); setObs(''); setTabela('1')
    setCartProdId(''); setCartQtd('1'); setCartPreco('')
    setDescTipo('nenhum'); setDescVal('')
  }

  if (produtos === null || vendas === null) return <Loading />

  const disponiveis   = produtos.filter(p => p.qtd > 0)
  const totalVendas   = vendas.reduce((a, v) => a + v.total, 0)
  const ticket        = vendas.length ? totalVendas / vendas.length : 0
  const totalT1       = vendas.filter(v => v.tabela === '1').reduce((a, v) => a + v.total, 0)
  const totalT2       = vendas.filter(v => v.tabela === '2').reduce((a, v) => a + v.total, 0)

  const prodSelecionado = produtos.find(x => x.id === cartProdId)
  const isFrac          = prodSelecionado?.fracionavel === 'sim'
  const jaCart          = prodSelecionado ? cart.filter(i => i.prodId === prodSelecionado.id).reduce((a, i) => a + i.qtd, 0) : 0

  return (
    <div>
      <PageTitle>🛒 Vendas</PageTitle>

      <MetricsGrid>
        <Metric label="Vendas"           value={vendas.length} />
        <Metric label="Receita total"    value={fmt(totalVendas)} color="green" />
        <Metric label="Ticket médio"     value={fmt(ticket)}      color="blue" />
        <Metric label="T1 — Final"       value={fmt(totalT1)}     color="orange" />
        <Metric label="T2 — Revenda"     value={fmt(totalT2)}     color="teal" />
      </MetricsGrid>

      <Card>
        <CardTitle>Nova venda</CardTitle>

        {/* Cabeçalho */}
        <FormRow>
          <FG label="Cliente (opcional)">
            <select value={cliId} onChange={e => onClienteChange(e.target.value)}
              style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
              <option value="">— Sem cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} (T{c.tabela || '1'})</option>)}
            </select>
          </FG>
          <FG label="Tabela de preço" style={{ maxWidth: 180 }}>
            <select value={tabela} onChange={e => onTabelaChange(e.target.value)}
              style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
              <option value="1">Tabela 1 — Final</option>
              <option value="2">Tabela 2 — Revenda</option>
            </select>
          </FG>
          <FG label="Forma de pagamento" style={{ maxWidth: 200 }}>
            <select value={pgto} onChange={e => setPgto(e.target.value)}
              style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
              {['Dinheiro','Pix','Cartão de crédito','Cartão de débito','Boleto','Ficha'].map(f => <option key={f}>{f}</option>)}
            </select>
          </FG>
          <Input label="Observação" value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Entrega em domicílio" />
        </FormRow>

        <InfoBox color={tabela === '2' ? 'green' : 'blue'} style={{ marginBottom: 10 }}>
          🏷️ {tabela === '2' ? 'Tabela 2 — Preço de Revenda (atacado / mais barato)' : 'Tabela 1 — Preço de Cliente Final (varejo)'}
        </InfoBox>

        {pgto === 'Ficha' && (
          <InfoBox color="amber">
            ⚠️ <strong>Ficha:</strong> a venda não será lançada no financeiro até você confirmar o recebimento na aba Fichas.
          </InfoBox>
        )}

        {/* Adicionar item */}
        <div style={{ background:'var(--bg2)',borderRadius:10,padding:14,marginBottom:12 }}>
          <div style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>➕ Adicionar produto ao carrinho</div>

          {!disponiveis.length
            ? <InfoBox color="blue" style={{ marginBottom: 0 }}>ℹ️ Nenhum produto disponível em estoque. Cadastre produtos na aba Estoque primeiro.</InfoBox>
            : <>
                <FormRow style={{ marginBottom: 6 }}>
                  <FG label="Produto" style={{ minWidth: 200, flex: 2 }}>
                    <select value={cartProdId} onChange={e => onProdChange(e.target.value)}
                      style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
                      <option value="">— Selecione o produto —</option>
                      {disponiveis.map(p => {
                        const jc = cart.filter(i => i.prodId === p.id).reduce((a,i) => a+i.qtd, 0)
                        return <option key={p.id} value={p.id}>{p.nome} — estoque: {fmtQ(p.qtd - jc, p.unidade)}</option>
                      })}
                    </select>
                  </FG>
                  <Input label={isFrac ? `Quantidade (${prodSelecionado?.unidade})` : `Quantidade`}
                    value={cartQtd} onChange={e => setCartQtd(e.target.value)}
                    type="number" min={isFrac ? '0.001' : '1'} step={isFrac ? 'any' : '1'}
                    fg={{ maxWidth: 120 }} />
                  <Input label="Preço unitário (R$)" value={cartPreco}
                    onChange={e => setCartPreco(e.target.value)}
                    type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth: 150 }} />
                </FormRow>

                {isFrac && cartProdId && (
                  <div style={{ background:'#E0F2F1',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#00695C',marginBottom:8 }}>
                    ✂️ Produto fracionável — Disponível: <strong>{fmtQ(prodSelecionado.qtd - jaCart, prodSelecionado.unidade)}</strong>. Informe qualquer quantidade decimal.
                  </div>
                )}

                {/* Desconto */}
                <div style={{ background:'#F9F0FF',border:'1px solid #CE93D8',borderRadius:10,padding:'12px 14px',marginBottom:8 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'#6A1B9A',marginBottom:10 }}>🏷️ Desconto (opcional)</div>
                  <FormRow style={{ marginBottom: 0 }}>
                    <FG label="Tipo de desconto" style={{ maxWidth: 160 }}>
                      <select value={descTipo} onChange={e => { setDescTipo(e.target.value); setDescVal('') }}
                        style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
                        <option value="nenhum">Sem desconto</option>
                        <option value="pct">Percentual (%)</option>
                        <option value="reais">Valor fixo (R$)</option>
                      </select>
                    </FG>
                    <Input label={descTipo === 'pct' ? 'Percentual (%)' : 'Valor (R$)'}
                      value={descVal} onChange={e => setDescVal(e.target.value)}
                      type="number" min="0" step="any" placeholder="0"
                      disabled={descTipo === 'nenhum'} fg={{ maxWidth: 130 }} />
                    <FG label="Subtotal c/ desconto" style={{ maxWidth: 160 }}>
                      <input readOnly value={cartProdId && subtotalAtual > 0 ? fmt(subtotalAtual) : ''}
                        placeholder="R$ 0,00"
                        style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg2)',color:'#0F6E56',fontSize:14,fontFamily:'inherit',fontWeight:700,width:'100%' }} />
                    </FG>
                    <Btn primary onClick={addCartItem} style={{ alignSelf: 'flex-end' }}>+ Adicionar</Btn>
                  </FormRow>
                </div>
              </>
          }
        </div>

        {/* Carrinho */}
        {cart.length > 0 && (
          <div style={{ border:'1px solid var(--border)',borderRadius:10,overflow:'hidden',marginBottom:14 }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
              <thead><tr>
                <TH>Produto</TH><TH>Qtd</TH><TH>Unid.</TH>
                <TH right>Preço unit.</TH><TH right>Desconto</TH>
                <TH right>Subtotal</TH><TH />
              </tr></thead>
              <tbody>
                {cart.map(it => (
                  <tr key={it.id}>
                    <TD bold>{it.nome}</TD>
                    <TD>{fmtQ(it.qtd, it.unidade)}</TD>
                    <TD><Badge label={it.unidade} /></TD>
                    <TD right>{fmt(it.preco)}</TD>
                    <TD right>
                      {it.desconto > 0
                        ? <><span style={{ textDecoration:'line-through',color:'var(--text3)',fontSize:12 }}>{fmt(it.qtd*it.preco)}</span>{' '}<span style={{ color:'#993C1D',fontSize:12 }}>-{it.descontoLabel}</span></>
                        : <span style={{ color:'var(--text3)' }}>—</span>}
                    </TD>
                    <TD right bold color="#0F6E56">{fmt(it.subtotal)}</TD>
                    <TD><DelBtn onClick={() => setCart(prev => prev.filter(i => i.id !== it.id))} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex',justifyContent:'flex-end',alignItems:'center',gap:16,padding:'12px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)' }}>
              <span style={{ fontSize:14,fontWeight:500 }}>Total da venda:</span>
              <span style={{ fontSize:22,fontWeight:700,color:'#0F6E56' }}>{fmt(cartTotal)}</span>
            </div>
          </div>
        )}

        <div style={{ display:'flex',justifyContent:'flex-end' }}>
          <Btn primary lg onClick={confirmarVenda} disabled={!cart.length}>✅ Confirmar venda</Btn>
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
                  <TH>Tabela</TH><TH>Pagamento</TH><TH right>Total</TH>
                </tr></thead>
                <tbody>
                  {[...vendas].reverse().map(v => (
                    <tr key={v.id}>
                      <TD secondary>{v.data}</TD>
                      <TD><span style={{ fontSize:12 }}>{v.itens?.map(i => `${i.nome} (${fmtQ(i.qtd,i.unidade)})`).join(', ')}</span></TD>
                      <TD>{v.clienteNome || <span style={{ color:'var(--text3)' }}>—</span>}</TD>
                      <TD>{v.tabela === '2' ? <Badge label="T2 — Revenda" color="tab2" /> : <Badge label="T1 — Final" color="tab1" />}</TD>
                      <TD>{v.pgto === 'Ficha' ? <Badge label="Ficha" color="amber" /> : <Badge label={v.pgto} color="blue" />}</TD>
                      <TD right bold color="#0F6E56">{fmt(v.total)}</TD>
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
