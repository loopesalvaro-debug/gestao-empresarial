import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, deleteDocument } from '../../lib/firestore'
import { fmt, fmtQ } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Select, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const UNIDADES = [
  { v: 'unid', l: 'Unidade (unid)' }, { v: 'kg', l: 'Quilo (kg)' },
  { v: 'g',    l: 'Grama (g)'      }, { v: 'L',  l: 'Litro (L)'  },
  { v: 'ml',   l: 'Mililitro (ml)' }, { v: 'saco',  l: 'Saco'    },
  { v: 'caixa',l: 'Caixa'          }, { v: 'm',  l: 'Metro (m)'  },
  { v: 'outro',l: 'Outro'          },
]
const FRAC_UNITS = ['kg','g','L','ml','m']

export default function Estoque() {
  const toast = useToast()
  const [produtos, setProdutos] = useState(null)
  const [nome, setNome]         = useState('')
  const [qtd, setQtd]           = useState('')
  const [unidade, setUnidade]   = useState('unid')
  const [frac, setFrac]         = useState('nao')
  const [preco1, setPreco1]     = useState('')
  const [preco2, setPreco2]     = useState('')
  const [cat, setCat]           = useState('Produto')

  useEffect(() => subscribeCollection('produtos', setProdutos), [])

  function onUnidadeChange(u) {
    setUnidade(u)
    setFrac(FRAC_UNITS.includes(u) ? 'sim' : 'nao')
  }

  async function addProd() {
    const q = parseFloat(qtd), p1 = parseFloat(preco1), p2 = parseFloat(preco2)
    if (!nome.trim() || isNaN(q) || q < 0 || isNaN(p1) || p1 < 0 || isNaN(p2) || p2 < 0) {
      toast('Preencha nome, quantidade e os dois preços', 'err'); return
    }
    await addDocument('produtos', { nome: nome.trim(), qtd: q, preco1: p1, preco2: p2, cat, unidade, fracionavel: frac })
    setNome(''); setQtd(''); setPreco1(''); setPreco2('')
    toast('Produto adicionado!')
  }

  async function delProd(id) { await deleteDocument('produtos', id) }

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

      <Card>
        <CardTitle>Adicionar produto</CardTitle>
        <FormRow>
          <Input label="Nome do produto" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: Torta de Algodão" fg={{ flex: 2, minWidth: 160 }} />
          <Input label="Quantidade" value={qtd} onChange={e => setQtd(e.target.value)}
            type="number" min="0" step="any" placeholder="0" fg={{ maxWidth: 100 }} />
          <FG label="Unidade" style={{ maxWidth: 150 }}>
            <select value={unidade} onChange={e => onUnidadeChange(e.target.value)}
              style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
              {UNIDADES.map(u => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
          </FG>
          <FG label="Fracionável?" style={{ maxWidth: 110 }}>
            <select value={frac} onChange={e => setFrac(e.target.value)}
              style={{ height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--border2)',background:'var(--bg)',color:'var(--text)',fontSize:14,fontFamily:'inherit' }}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </FG>
          <Select label="Categoria" value={cat} onChange={e => setCat(e.target.value)} fg={{ maxWidth: 140 }}>
            {['Produto','Matéria-prima','Embalagem','Outros'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </FormRow>

        <InfoBox color="orange" style={{ marginBottom: 10 }}>
          🏷️ Cadastre dois preços: <strong>Tabela 1</strong> = Cliente Final (varejo) &nbsp;|&nbsp; <strong>Tabela 2</strong> = Revenda (mais barato)
        </InfoBox>

        <FormRow>
          <Input label="💰 Preço Tabela 1 — Cliente Final (R$)" value={preco1}
            onChange={e => setPreco1(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00"
            note="Preço de varejo / cliente final"
            fg={{ maxWidth: 210 }}
            style={{ borderColor: '#FFCC80', background: '#FFF9F0' }} />
          <Input label="💚 Preço Tabela 2 — Revenda (R$)" value={preco2}
            onChange={e => setPreco2(e.target.value)} type="number" min="0" step="0.01" placeholder="0,00"
            note="Preço de atacado / revenda"
            fg={{ maxWidth: 210 }}
            style={{ borderColor: '#A5D6A7', background: '#F0FFF1' }} />
          <Btn primary onClick={addProd} style={{ alignSelf: 'flex-end' }}>+ Adicionar produto</Btn>
        </FormRow>

        {frac === 'sim' && (
          <InfoBox color="green" style={{ marginBottom: 0 }}>
            ✂️ Produto fracionável: pode ser vendido em quantidades decimais (ex: 0,5 kg). O estoque é descontado proporcionalmente.
          </InfoBox>
        )}
      </Card>

      <Card>
        <CardTitle>Produtos em estoque</CardTitle>
        {!produtos.length
          ? <EmptyState>Nenhum produto cadastrado</EmptyState>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>
                  <TH>Produto</TH><TH>Cat.</TH><TH>Unid.</TH><TH>Frac.</TH>
                  <TH right>Estoque</TH><TH right>Preço T1 (Final)</TH>
                  <TH right>Preço T2 (Revenda)</TH><TH>Status</TH><TH />
                </tr></thead>
                <tbody>
                  {produtos.map(p => (
                    <tr key={p.id}>
                      <TD bold>{p.nome}</TD>
                      <TD secondary>{p.cat}</TD>
                      <TD><Badge label={p.unidade} /></TD>
                      <TD>{p.fracionavel === 'sim' ? <Badge label="✂️ Sim" color="teal" /> : <Badge label="Não" />}</TD>
                      <TD right bold>{fmtQ(p.qtd, p.unidade)}</TD>
                      <TD right color="#E65100">{fmt(p.preco1)}</TD>
                      <TD right color="#2E7D32">{fmt(p.preco2)}</TD>
                      <TD>
                        {p.qtd <= 0    ? <Badge label="Sem estoque" color="red"   /> :
                         p.qtd <= 5   ? <Badge label="Baixo"       color="amber" /> :
                                        <Badge label="Ok"           color="green" />}
                      </TD>
                      <TD><DelBtn onClick={() => delProd(p.id)} /></TD>
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
