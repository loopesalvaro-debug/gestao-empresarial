import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument, deleteDocument } from '../../lib/firestore'
import { fmt, fmtQ } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Select, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const UNIDADES = [
  { v: 'unid',  l: 'Unidade (unid)' },
  { v: 'kg',    l: 'Quilo (kg)'     },
  { v: 'g',     l: 'Grama (g)'      },
  { v: 'L',     l: 'Litro (L)'      },
  { v: 'ml',    l: 'Mililitro (ml)' },
  { v: 'saco',  l: 'Saco'           },
  { v: 'caixa', l: 'Caixa'          },
  { v: 'm',     l: 'Metro (m)'      },
  { v: 'outro', l: 'Outro'          },
]
const FRAC_UNITS = ['kg', 'g', 'L', 'ml', 'm']
const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit' }

const emptyForm = { nome:'', qtd:'', unidade:'unid', frac:'nao', preco1:'', preco2:'', cat:'Produto' }

export default function Estoque() {
  const toast = useToast()
  const [produtos, setProdutos] = useState(null)
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(emptyForm)

  useEffect(() => subscribeCollection('produtos', setProdutos), [])

  const set = k => e => {
    const v = e.target.value
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'unidade') next.frac = FRAC_UNITS.includes(v) ? 'sim' : 'nao'
      return next
    })
  }

  function iniciarEdicao(p) {
    setEditId(p.id)
    setForm({
      nome:    p.nome,
      qtd:     p.qtd.toString(),
      unidade: p.unidade  || 'unid',
      frac:    p.fracionavel || 'nao',
      preco1:  p.preco1.toString(),
      preco2:  p.preco2.toString(),
      cat:     p.cat     || 'Produto',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast('Editando produto — altere e salve', 'warn')
  }

  function cancelar() {
    setEditId(null)
    setForm(emptyForm)
  }

  async function salvar() {
    const q  = parseFloat(form.qtd)
    const p1 = parseFloat(form.preco1)
    const p2 = parseFloat(form.preco2)
    if (!form.nome.trim() || isNaN(q) || q < 0 || isNaN(p1) || p1 < 0 || isNaN(p2) || p2 < 0) {
      toast('Preencha nome, quantidade e os dois preços', 'err'); return
    }

    const data = {
      nome: form.nome.trim(), qtd: q, preco1: p1, preco2: p2,
      cat: form.cat, unidade: form.unidade, fracionavel: form.frac,
    }

    if (editId) {
      await updateDocument('produtos', editId, data)
      toast('Produto atualizado! ✅')
    } else {
      await addDocument('produtos', data)
      toast('Produto adicionado!')
    }

    setEditId(null)
    setForm(emptyForm)
  }

  async function delProd(id) {
    await deleteDocument('produtos', id)
    if (editId === id) cancelar()
  }

  if (produtos === null) return <Loading />

  const totalEstoque = produtos.reduce((a, p) => a + p.qtd * p.preco1, 0)
  const baixo        = produtos.filter(p => p.qtd > 0 && p.qtd <= 5).length
  const zero         = produtos.filter(p => p.qtd <= 0).length

  return (
    <div>
      <PageTitle>📦 Estoque</PageTitle>

      <MetricsGrid>
        <Metric label="Produtos"           value={produtos.length} />
        <Metric label="Valor estoque (T1)" value={fmt(totalEstoque)} />
        <Metric label="Estoque baixo (≤5)" value={baixo} color={baixo ? 'amber' : undefined} />
        <Metric label="Sem estoque"        value={zero}  color={zero  ? 'red'   : undefined} />
      </MetricsGrid>

      {/* ── Formulário (adicionar / editar) ── */}
      <Card>
        <CardTitle>{editId ? '✏️ Editando produto' : 'Adicionar produto'}</CardTitle>

        {editId && (
          <InfoBox color="amber" style={{ marginBottom: 12 }}>
            ✏️ Você está <strong>editando um produto</strong>. Altere os campos e clique em "Salvar alterações".
          </InfoBox>
        )}

        <FormRow>
          <Input label="Nome do produto" value={form.nome} onChange={set('nome')}
            placeholder="Ex: Torta de Algodão" fg={{ flex: 2, minWidth: 160 }} />
          <Input label="Quantidade" value={form.qtd} onChange={set('qtd')}
            type="number" min="0" step="any" placeholder="0" fg={{ maxWidth: 100 }} />
          <FG label="Unidade" style={{ maxWidth: 150 }}>
            <select value={form.unidade} onChange={set('unidade')} style={SEL}>
              {UNIDADES.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
          </FG>
          <FG label="Fracionável?" style={{ maxWidth: 110 }}>
            <select value={form.frac} onChange={set('frac')} style={SEL}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </FG>
          <FG label="Categoria" style={{ maxWidth: 140 }}>
            <select value={form.cat} onChange={set('cat')} style={SEL}>
              {['Produto','Matéria-prima','Embalagem','Outros'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FG>
        </FormRow>

        <InfoBox color="orange" style={{ marginBottom: 10 }}>
          🏷️ <strong>Tabela 1</strong> = Cliente Final (varejo) &nbsp;|&nbsp; <strong>Tabela 2</strong> = Revenda (mais barato)
        </InfoBox>

        <FormRow>
          <Input label="💰 Preço Tabela 1 — Cliente Final (R$)" value={form.preco1}
            onChange={set('preco1')} type="number" min="0" step="0.01" placeholder="0,00"
            note="Preço de varejo / cliente final" fg={{ maxWidth: 220 }}
            style={{ borderColor: '#FFCC80', background: '#FFF9F0' }} />
          <Input label="💚 Preço Tabela 2 — Revenda (R$)" value={form.preco2}
            onChange={set('preco2')} type="number" min="0" step="0.01" placeholder="0,00"
            note="Preço de atacado / revenda" fg={{ maxWidth: 220 }}
            style={{ borderColor: '#A5D6A7', background: '#F0FFF1' }} />
          <div style={{ display:'flex', gap:8, alignSelf:'flex-end' }}>
            {editId && <Btn onClick={cancelar}>Cancelar</Btn>}
            <Btn primary onClick={salvar}>
              {editId ? '💾 Salvar alterações' : '+ Adicionar produto'}
            </Btn>
          </div>
        </FormRow>

        {form.frac === 'sim' && (
          <InfoBox color="green" style={{ marginBottom: 0 }}>
            ✂️ Produto fracionável: pode ser vendido em quantidades decimais (ex: 0,5 kg).
          </InfoBox>
        )}
      </Card>

      {/* ── Tabela de produtos ── */}
      <Card>
        <CardTitle>Produtos em estoque</CardTitle>
        {!produtos.length
          ? <EmptyState>Nenhum produto cadastrado</EmptyState>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    <TH>Produto</TH><TH>Cat.</TH><TH>Unid.</TH><TH>Frac.</TH>
                    <TH right>Estoque</TH>
                    <TH right>Preço T1 (Final)</TH>
                    <TH right>Preço T2 (Revenda)</TH>
                    <TH>Status</TH><TH />
                  </tr>
                </thead>
                <tbody>
                  {produtos.map(p => (
                    <tr key={p.id} style={{ background: editId === p.id ? '#FAEEDA' : 'transparent' }}>
                      <TD bold>{p.nome}</TD>
                      <TD secondary>{p.cat}</TD>
                      <TD><Badge label={p.unidade} /></TD>
                      <TD>{p.fracionavel === 'sim' ? <Badge label="✂️ Sim" color="teal" /> : <Badge label="Não" />}</TD>
                      <TD right bold>{fmtQ(p.qtd, p.unidade)}</TD>
                      <TD right color="#E65100">{fmt(p.preco1)}</TD>
                      <TD right color="#2E7D32">{fmt(p.preco2)}</TD>
                      <TD>
                        {p.qtd <= 0  ? <Badge label="Sem estoque" color="red"   /> :
                         p.qtd <= 5  ? <Badge label="Baixo"       color="amber" /> :
                                       <Badge label="Ok"           color="green" />}
                      </TD>
                      <TD>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => iniciarEdicao(p)} title="Editar produto"
                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, opacity:.6, padding:'2px 4px' }}>
                            ✏️
                          </button>
                          <DelBtn onClick={() => delProd(p.id)} />
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
