import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument, deleteDocument } from '../../lib/firestore'
import { fmt, fmtQ, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const UNIDADES = [
  { v:'unid',  l:'Unidade (unid)' }, { v:'kg',   l:'Quilo (kg)'     },
  { v:'g',     l:'Grama (g)'      }, { v:'L',    l:'Litro (L)'       },
  { v:'ml',    l:'Mililitro (ml)' }, { v:'saco', l:'Saco'            },
  { v:'caixa', l:'Caixa'          }, { v:'m',    l:'Metro (m)'       },
  { v:'outro', l:'Outro'          },
]
const FRAC_UNITS = ['kg','g','L','ml','m']
const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit' }
const emptyForm = { nome:'', qtd:'', unidade:'unid', frac:'nao', preco1:'', preco2:'', cat:'Produto' }

// Modo ativo no painel superior: 'novo' | 'editar' | 'entrada'
export default function Estoque() {
  const toast = useToast()
  const [produtos, setProdutos] = useState(null)
  const [modo,     setModo]     = useState('novo')   // 'novo' | 'editar' | 'entrada'
  const [selId,    setSelId]    = useState(null)      // produto selecionado para editar/entrada

  // Form novo/editar
  const [form, setForm] = useState(emptyForm)

  // Entrada em produto existente
  const [entradaProdId,  setEntradaProdId]  = useState('')  // produto selecionado no select
  const [entradaQtd,     setEntradaQtd]     = useState('')
  const [entradaObs,     setEntradaObs]     = useState('')

  useEffect(() => subscribeCollection('produtos', setProdutos), [])

  // ── helpers de form ────────────────────────────────────────────────────
  const setF = k => e => {
    const v = e.target.value
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'unidade') next.frac = FRAC_UNITS.includes(v) ? 'sim' : 'nao'
      return next
    })
  }

  function abrirNovo() {
    setModo('novo'); setSelId(null); setForm(emptyForm)
    setEntradaProdId(''); setEntradaQtd(''); setEntradaObs('')
  }

  function abrirEditar(p) {
    setModo('editar'); setSelId(p.id)
    setForm({ nome:p.nome, qtd:p.qtd.toString(), unidade:p.unidade||'unid',
      frac:p.fracionavel||'nao', preco1:p.preco1.toString(), preco2:p.preco2.toString(), cat:p.cat||'Produto' })
    window.scrollTo({ top:0, behavior:'smooth' })
    toast('Editando produto — altere e salve', 'warn')
  }

  function abrirEntrada(p) {
    setModo('entrada'); setSelId(null)
    setEntradaProdId(p ? p.id : '')
    setEntradaQtd(''); setEntradaObs('')
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  function cancelar() { setModo('novo'); setSelId(null); setForm(emptyForm); setEntradaProdId(''); setEntradaQtd(''); setEntradaObs('') }

  // ── Salvar novo / editar ───────────────────────────────────────────────
  async function salvar() {
    const q=parseFloat(form.qtd), p1=parseFloat(form.preco1), p2=parseFloat(form.preco2)
    if (!form.nome.trim()||isNaN(q)||q<0||isNaN(p1)||p1<0||isNaN(p2)||p2<0) {
      toast('Preencha nome, quantidade e os dois preços','err'); return
    }
    const data = { nome:form.nome.trim(), qtd:q, preco1:p1, preco2:p2, cat:form.cat, unidade:form.unidade, fracionavel:form.frac }
    if (modo==='editar' && selId) {
      await updateDocument('produtos', selId, data); toast('Produto atualizado! ✅')
    } else {
      await addDocument('produtos', data); toast('Produto cadastrado!')
    }
    cancelar()
  }

  // ── Confirmar entrada de mercadoria ───────────────────────────────────
  async function confirmarEntrada() {
    const p = produtos?.find(x => x.id === entradaProdId)
    if (!p) { toast('Selecione um produto','err'); return }
    const qtd = parseFloat(entradaQtd)
    if (isNaN(qtd)||qtd<=0) { toast('Informe uma quantidade válida','err'); return }
    const novaQtd = parseFloat((p.qtd + qtd).toFixed(6))
    await updateDocument('produtos', p.id, { qtd: novaQtd })
    // Também registra no histórico de compras como entrada manual
    await addDocument('lancamentos', {
      desc: `Entrada de estoque — ${p.nome}${entradaObs?' ('+entradaObs+')':''}`,
      val: 0, tipo:'entrada', cat:'Estoque', data:today(), origem:'Estoque',
    })
    toast(`✅ +${fmtQ(qtd,p.unidade)} adicionados ao estoque de ${p.nome}`)
    cancelar()
  }

  async function delProd(id) {
    await deleteDocument('produtos', id)
    if (selId===id) cancelar()
  }

  if (produtos===null) return <Loading />

  const totalEstoque = produtos.reduce((a,p)=>a+p.qtd*p.preco1,0)
  const baixo        = produtos.filter(p=>p.qtd>0&&p.qtd<=5).length
  const zero         = produtos.filter(p=>p.qtd<=0).length
  const prodEntrada  = produtos.find(p=>p.id===entradaProdId)

  return (
    <div>
      <PageTitle>📦 Estoque</PageTitle>

      <MetricsGrid>
        <Metric label="Produtos"           value={produtos.length} />
        <Metric label="Valor estoque (T1)" value={fmt(totalEstoque)} />
        <Metric label="Estoque baixo (≤5)" value={baixo} color={baixo?'amber':undefined} />
        <Metric label="Sem estoque"        value={zero}  color={zero?'red':undefined} />
      </MetricsGrid>

      {/* ── Botões de modo ── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <Btn primary={modo!=='entrada'&&modo!=='editar'} onClick={abrirNovo}>+ Cadastrar produto</Btn>
        <Btn primary={modo==='entrada'} onClick={()=>abrirEntrada(null)}
          style={{ background: modo==='entrada'?'#0F6E56':'var(--bg2)', color: modo==='entrada'?'#fff':'var(--text)', border:'1px solid var(--border2)' }}>
          📥 Entrada de mercadoria
        </Btn>
      </div>

      {/* ══ PAINEL: ENTRADA DE MERCADORIA ══ */}
      {modo==='entrada' && (
        <Card style={{ border:'2px solid #A5D6A7' }}>
          <CardTitle>📥 Entrada de mercadoria</CardTitle>
          <InfoBox color="green" style={{ marginBottom:14 }}>
            Selecione um produto da base de dados e informe a quantidade que chegou. O estoque será somado automaticamente.
          </InfoBox>

          <FormRow style={{ marginBottom:10 }}>
            <FG label="Produto existente" style={{ flex:2, minWidth:220 }}>
              <select value={entradaProdId} onChange={e=>setEntradaProdId(e.target.value)} style={{...SEL,width:'100%'}}>
                <option value="">— Selecione o produto —</option>
                {[...produtos].sort((a,b)=>a.nome.localeCompare(b.nome)).map(p=>(
                  <option key={p.id} value={p.id}>
                    {p.nome} — estoque atual: {fmtQ(p.qtd,p.unidade)}
                  </option>
                ))}
              </select>
            </FG>

            {prodEntrada && (
              <Input
                label={`Quantidade a adicionar (${prodEntrada.unidade})`}
                value={entradaQtd}
                onChange={e=>setEntradaQtd(e.target.value)}
                type="number" min="0.001" step="any" placeholder="0"
                fg={{ maxWidth:200 }}
              />
            )}

            <Input label="Observação (opcional)" value={entradaObs}
              onChange={e=>setEntradaObs(e.target.value)}
              placeholder="Ex: NF 1234, fornecedor X" />
          </FormRow>

          {/* Preview */}
          {prodEntrada && entradaQtd && parseFloat(entradaQtd)>0 && (
            <div style={{ background:'#E1F5EE', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontSize:13, color:'#0F6E56' }}>
                <strong>{prodEntrada.nome}</strong><br/>
                Estoque atual: <strong>{fmtQ(prodEntrada.qtd,prodEntrada.unidade)}</strong>
                {' '}+ entrada: <strong>{fmtQ(parseFloat(entradaQtd),prodEntrada.unidade)}</strong>
                {' '}= <strong style={{ fontSize:15 }}>{fmtQ(prodEntrada.qtd+parseFloat(entradaQtd),prodEntrada.unidade)}</strong>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={cancelar}>Cancelar</Btn>
            <Btn primary onClick={confirmarEntrada} disabled={!entradaProdId||!entradaQtd}>
              ✅ Confirmar entrada
            </Btn>
          </div>
        </Card>
      )}

      {/* ══ PAINEL: CADASTRAR / EDITAR PRODUTO ══ */}
      {(modo==='novo'||modo==='editar') && (
        <Card>
          <CardTitle>{modo==='editar'?'✏️ Editando produto':'Cadastrar produto'}</CardTitle>

          {modo==='editar' && (
            <InfoBox color="amber" style={{ marginBottom:12 }}>
              ✏️ Editando dados do produto. Para adicionar estoque use o botão <strong>📥 Entrada de mercadoria</strong>.
            </InfoBox>
          )}

          <FormRow>
            <Input label="Nome do produto" value={form.nome} onChange={setF('nome')}
              placeholder="Ex: Farelo de Trigo" fg={{ flex:2, minWidth:160 }} />
            <Input label={modo==='editar'?'Qtd atual':'Qtd inicial'} value={form.qtd}
              onChange={setF('qtd')} type="number" min="0" step="any" placeholder="0" fg={{ maxWidth:100 }} />
            <FG label="Unidade" style={{ maxWidth:150 }}>
              <select value={form.unidade} onChange={setF('unidade')} style={SEL}>
                {UNIDADES.map(u=><option key={u.v} value={u.v}>{u.l}</option>)}
              </select>
            </FG>
            <FG label="Fracionável?" style={{ maxWidth:110 }}>
              <select value={form.frac} onChange={setF('frac')} style={SEL}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </FG>
            <FG label="Categoria" style={{ maxWidth:140 }}>
              <select value={form.cat} onChange={setF('cat')} style={SEL}>
                {['Produto','Matéria-prima','Embalagem','Outros'].map(c=><option key={c}>{c}</option>)}
              </select>
            </FG>
          </FormRow>

          <InfoBox color="orange" style={{ marginBottom:10 }}>
            🏷️ <strong>Tabela 1</strong> = Cliente Final (varejo) &nbsp;|&nbsp; <strong>Tabela 2</strong> = Revenda (mais barato)
          </InfoBox>

          <FormRow>
            <Input label="💰 Preço T1 — Cliente Final (R$)" value={form.preco1}
              onChange={setF('preco1')} type="number" min="0" step="0.01" placeholder="0,00"
              note="Preço de varejo" fg={{ maxWidth:220 }}
              style={{ borderColor:'#FFCC80', background:'#FFF9F0' }} />
            <Input label="💚 Preço T2 — Revenda (R$)" value={form.preco2}
              onChange={setF('preco2')} type="number" min="0" step="0.01" placeholder="0,00"
              note="Preço de atacado" fg={{ maxWidth:220 }}
              style={{ borderColor:'#A5D6A7', background:'#F0FFF1' }} />
            <div style={{ display:'flex', gap:8, alignSelf:'flex-end' }}>
              {modo==='editar' && <Btn onClick={cancelar}>Cancelar</Btn>}
              <Btn primary onClick={salvar}>{modo==='editar'?'💾 Salvar':'+ Cadastrar produto'}</Btn>
            </div>
          </FormRow>

          {form.frac==='sim' && (
            <InfoBox color="green" style={{ marginBottom:0 }}>
              ✂️ Produto fracionável: pode ser vendido em quantidades decimais.
            </InfoBox>
          )}
        </Card>
      )}

      {/* ── Tabela de produtos ── */}
      <Card>
        <CardTitle>Produtos em estoque</CardTitle>
        {!produtos.length
          ? <EmptyState>Nenhum produto cadastrado</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  <TH>Produto</TH><TH>Cat.</TH><TH>Unid.</TH>
                  <TH right>Estoque</TH>
                  <TH right>Preço T1</TH><TH right>Preço T2</TH>
                  <TH>Status</TH><TH>Ações</TH>
                </tr></thead>
                <tbody>
                  {[...produtos].sort((a,b)=>a.nome.localeCompare(b.nome)).map(p=>(
                    <tr key={p.id} style={{ background: selId===p.id?'#FAEEDA':'transparent' }}>
                      <TD bold>{p.nome}</TD>
                      <TD secondary>{p.cat}</TD>
                      <TD><Badge label={p.unidade} /></TD>
                      <TD right bold>{fmtQ(p.qtd,p.unidade)}</TD>
                      <TD right color="#E65100">{fmt(p.preco1)}</TD>
                      <TD right color="#2E7D32">{fmt(p.preco2)}</TD>
                      <TD>
                        {p.qtd<=0 ?<Badge label="Sem estoque" color="red"/>
                         :p.qtd<=5?<Badge label="Baixo"       color="amber"/>
                                  :<Badge label="Ok"           color="green"/>}
                      </TD>
                      <TD>
                        <div style={{ display:'flex', gap:4' }}>
                          <button onClick={()=>abrirEntrada(p)} title="Entrada de mercadoria"
                            style={{ background:'#E1F5EE', border:'1px solid #A5D6A7', borderRadius:6,
                              cursor:'pointer', fontSize:12, padding:'3px 8px', color:'#0F6E56',
                              fontWeight:600, fontFamily:'inherit' }}>
                            📥 Entrada
                          </button>
                          <button onClick={()=>abrirEditar(p)} title="Editar"
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, opacity:.6, padding:'2px 4px' }}>
                            ✏️
                          </button>
                          <DelBtn onClick={()=>delProd(p.id)} />
                        </div>
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
