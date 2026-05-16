import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument, deleteDocument } from '../../lib/firestore'
import { fmt, today } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, DelBtn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit', width:'100%' }
const emptyForm = { descricao:'', valor:'', vencimento:'', fornecedor:'', categoria:'Fornecedor', obs:'' }

function statusBoleto(vencimento) {
  if (!vencimento) return { label:'Sem data', color:'gray' }
  // Suporta formato ISO (yyyy-mm-dd) e BR (dd/mm/yyyy)
  let d
  if (vencimento.includes('-')) {
    d = new Date(vencimento + 'T00:00:00')
  } else {
    const [dia, mes, ano] = vencimento.split('/')
    d = new Date(`${ano}-${mes}-${dia}T00:00:00`)
  }
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const diff  = Math.ceil((d - hoje) / (1000*60*60*24))
  if (diff < 0)  return { label:`Vencido há ${Math.abs(diff)}d`,  color:'red'   }
  if (diff === 0)return { label:'Vence hoje',                      color:'amber' }
  if (diff <= 5) return { label:`Vence em ${diff}d`,              color:'amber' }
  return           { label:`${diff} dias`,                         color:'green' }
}

function fmtDate(v) {
  if (!v) return '—'
  if (v.includes('-')) {
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }
  return v
}

export default function Boletos() {
  const toast = useToast()
  const [boletos, setBoletos] = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [editId, setEditId]   = useState(null)

  useEffect(() => subscribeCollection('boletos', setBoletos, 'vencimento'), [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function salvar() {
    if (!form.descricao.trim()) { toast('Informe a descrição', 'err'); return }
    const v = parseFloat(form.valor)
    if (isNaN(v) || v <= 0)     { toast('Informe o valor', 'err'); return }
    if (!form.vencimento)       { toast('Informe o vencimento', 'err'); return }

    const data = { ...form, valor: v, status: editId
      ? boletos.find(b => b.id === editId)?.status || 'pendente'
      : 'pendente'
    }

    if (editId) {
      await updateDocument('boletos', editId, data)
      toast('Boleto atualizado! ✅')
    } else {
      await addDocument('boletos', data)
      toast('Boleto cadastrado!')
    }
    setForm(emptyForm); setEditId(null)
  }

  async function pagar(b) {
    await updateDocument('boletos', b.id, { status: 'pago', dataPagamento: today() })
    await addDocument('lancamentos', {
      desc: `Boleto pago — ${b.descricao}${b.fornecedor ? ' / ' + b.fornecedor : ''}`,
      val: b.valor, tipo: 'saida', cat: b.categoria || 'Fornecedor',
      data: today(), origem: 'Boleto',
    })
    toast('Boleto quitado e lançado no financeiro! ✅')
  }

  async function del(id) {
    await deleteDocument('boletos', id)
    if (editId === id) { setForm(emptyForm); setEditId(null) }
  }

  function editar(b) {
    setEditId(b.id)
    setForm({ descricao: b.descricao, valor: b.valor.toString(), vencimento: b.vencimento,
      fornecedor: b.fornecedor || '', categoria: b.categoria || 'Fornecedor', obs: b.obs || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (boletos === null) return <Loading />

  const pendentes    = boletos.filter(b => b.status !== 'pago')
  const pagos        = boletos.filter(b => b.status === 'pago')
  const totalPend    = pendentes.reduce((a, b) => a + b.valor, 0)
  const totalPago    = pagos.reduce((a, b) => a + b.valor, 0)
  const vencidos     = pendentes.filter(b => statusBoleto(b.vencimento).color === 'red').length
  const venceHoje    = pendentes.filter(b => statusBoleto(b.vencimento).label === 'Vence hoje').length
  const vence5d      = pendentes.filter(b => statusBoleto(b.vencimento).color === 'amber').length

  const pendOrdenados = [...pendentes].sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  return (
    <div>
      <PageTitle>📄 Boletos a Pagar</PageTitle>

      <MetricsGrid>
        <Metric label="Em aberto"       value={pendentes.length} color={pendentes.length ? 'amber' : undefined} />
        <Metric label="Total a pagar"   value={fmt(totalPend)}   color="red"   />
        <Metric label="Vencidos"        value={vencidos}         color={vencidos ? 'red' : undefined} />
        <Metric label="Vencem em 5 dias"value={vence5d}          color={vence5d ? 'amber' : undefined} />
        <Metric label="Total pago"      value={fmt(totalPago)}   color="green" />
      </MetricsGrid>

      {vencidos > 0 && (
        <InfoBox color="amber">
          ⚠️ Você tem <strong>{vencidos} boleto{vencidos > 1 ? 's' : ''} vencido{vencidos > 1 ? 's' : ''}</strong>! Regularize o quanto antes.
        </InfoBox>
      )}

      <Card>
        <CardTitle>{editId ? '✏️ Editando boleto' : 'Cadastrar boleto'}</CardTitle>
        <FormRow>
          <Input label="Descrição *" value={form.descricao} onChange={set('descricao')}
            placeholder="Ex: Aluguel março" fg={{ flex: 2 }} />
          <Input label="Valor (R$) *" value={form.valor} onChange={set('valor')}
            type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth: 140 }} />
          <FG label="Vencimento *" style={{ maxWidth: 160 }}>
            <input type="date" value={form.vencimento} onChange={set('vencimento')} style={SEL} />
          </FG>
        </FormRow>
        <FormRow>
          <Input label="Fornecedor / Credor" value={form.fornecedor} onChange={set('fornecedor')}
            placeholder="Ex: Banco Bradesco" />
          <FG label="Categoria" style={{ maxWidth: 160 }}>
            <select value={form.categoria} onChange={set('categoria')} style={SEL}>
              {['Fornecedor','Aluguel','Energia','Água','Internet','Imposto','Empréstimo','Outros'].map(c => <option key={c}>{c}</option>)}
            </select>
          </FG>
          <Input label="Observação" value={form.obs} onChange={set('obs')} placeholder="Ex: Parcela 2/12" />
          <div style={{ display:'flex', gap:8, alignSelf:'flex-end' }}>
            {editId && <Btn onClick={() => { setForm(emptyForm); setEditId(null) }}>Cancelar</Btn>}
            <Btn primary onClick={salvar}>{editId ? '💾 Salvar' : '+ Cadastrar boleto'}</Btn>
          </div>
        </FormRow>
      </Card>

      {/* ── Pendentes ── */}
      <Card>
        <CardTitle>⏳ Boletos em aberto</CardTitle>
        {!pendentes.length
          ? <EmptyState>Nenhum boleto pendente 🎉</EmptyState>
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  <TH>Descrição</TH><TH>Fornecedor</TH><TH>Categoria</TH>
                  <TH>Vencimento</TH><TH>Status</TH><TH right>Valor</TH><TH>Ações</TH>
                </tr></thead>
                <tbody>
                  {pendOrdenados.map(b => {
                    const st = statusBoleto(b.vencimento)
                    return (
                      <tr key={b.id} style={{ background: st.color==='red' ? '#FFF5F5' : st.color==='amber' ? '#FFFBF0' : 'transparent' }}>
                        <TD bold>{b.descricao}</TD>
                        <TD secondary>{b.fornecedor || '—'}</TD>
                        <TD><Badge label={b.categoria || 'Outros'} /></TD>
                        <TD secondary>{fmtDate(b.vencimento)}</TD>
                        <TD><Badge label={st.label} color={st.color} /></TD>
                        <TD right bold color="#993C1D">{fmt(b.valor)}</TD>
                        <TD>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={() => pagar(b)}
                              style={{ background:'#E1F5EE', border:'1px solid #A5D6A7', borderRadius:6, cursor:'pointer', fontSize:12, padding:'3px 8px', color:'#0F6E56', fontWeight:600 }}>
                              ✅ Pagar
                            </button>
                            <button onClick={() => editar(b)}
                              style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, opacity:.6, padding:'2px 4px' }}>✏️</button>
                            <DelBtn onClick={() => del(b.id)} />
                          </div>
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
        }
      </Card>

      {/* ── Pagos ── */}
      {pagos.length > 0 && (
        <Card>
          <CardTitle>✅ Boletos pagos</CardTitle>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr>
                <TH>Descrição</TH><TH>Fornecedor</TH><TH>Vencimento</TH>
                <TH>Pago em</TH><TH right>Valor</TH><TH />
              </tr></thead>
              <tbody>
                {[...pagos].sort((a,b) => (b.dataPagamento||'').localeCompare(a.dataPagamento||'')).map(b => (
                  <tr key={b.id}>
                    <TD bold>{b.descricao}</TD>
                    <TD secondary>{b.fornecedor || '—'}</TD>
                    <TD secondary>{fmtDate(b.vencimento)}</TD>
                    <TD secondary>{b.dataPagamento || '—'}</TD>
                    <TD right bold color="#0F6E56">{fmt(b.valor)}</TD>
                    <TD><DelBtn onClick={() => del(b.id)} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
