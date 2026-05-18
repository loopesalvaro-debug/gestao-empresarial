import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument } from '../../lib/firestore'
import { fmt, today, todayISO, parseDate, isSameDay } from '../../lib/utils'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, MetricsGrid, Metric,
  FormRow, FG, Input, Btn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit', width:'100%' }

export default function Caixa() {
  const toast = useToast()
  const [caixas,      setCaixas]      = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  const [dataSel,     setDataSel]     = useState(todayISO())
  const [valorAbertura, setValorAbertura] = useState('')
  const [sangria,     setSangria]     = useState('')
  const [motSangria,  setMotSangria]  = useState('')

  useEffect(() => {
    const u1 = subscribeCollection('caixas',      setCaixas)
    const u2 = subscribeCollection('lancamentos', setLancamentos)
    return () => { u1(); u2() }
  }, [])

  const dataSelecionada = new Date(dataSel + 'T00:00:00')

  // Caixa do dia selecionado
  const caixaDia = caixas?.find(c => {
    const d = parseDate(c.data)
    return d && isSameDay(d, dataSelecionada)
  })

  // Lançamentos do dia
  const lancsDia = lancamentos.filter(l => isSameDay(parseDate(l.data), dataSelecionada))
  const entDia   = lancsDia.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.val, 0)
  const saiDia   = lancsDia.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.val, 0)

  const saldoEsperado = (caixaDia?.valorAbertura || 0) + entDia - saiDia -
    (caixaDia?.sangrias?.reduce((a, s) => a + s.valor, 0) || 0)

  async function abrirCaixa() {
    const v = parseFloat(valorAbertura)
    if (isNaN(v) || v < 0) { toast('Informe o valor de abertura', 'err'); return }
    if (caixaDia) { toast('Caixa já aberto para este dia', 'warn'); return }
    await addDocument('caixas', {
      data: dataSelecionada.toLocaleDateString('pt-BR'),
      valorAbertura: v, status: 'aberto', sangrias: [],
    })
    setValorAbertura('')
    toast('Caixa aberto! ✅')
  }

  async function fecharCaixa() {
    if (!caixaDia) return
    await updateDocument('caixas', caixaDia.id, {
      status: 'fechado', valorFechamento: saldoEsperado, horaFechamento: new Date().toLocaleTimeString('pt-BR'),
    })
    toast('Caixa fechado! ✅')
  }

  async function registrarSangria() {
    const v = parseFloat(sangria)
    if (isNaN(v) || v <= 0) { toast('Informe o valor da sangria', 'err'); return }
    if (!caixaDia) { toast('Abra o caixa primeiro', 'err'); return }
    const novasSangrias = [...(caixaDia.sangrias || []), { valor: v, motivo: motSangria, hora: new Date().toLocaleTimeString('pt-BR') }]
    await updateDocument('caixas', caixaDia.id, { sangrias: novasSangrias })
    // Lança como saída no financeiro
    await addDocument('lancamentos', {
      desc: `Sangria de caixa${motSangria ? ' — ' + motSangria : ''}`,
      val: v, tipo: 'saida', cat: 'Operacional',
      data: dataSelecionada.toLocaleDateString('pt-BR'), origem: 'Caixa',
    })
    setSangria(''); setMotSangria('')
    toast('Sangria registrada!')
  }

  if (caixas === null) return <Loading />

  const isHoje   = isSameDay(dataSelecionada, new Date())
  const aberto   = caixaDia?.status === 'aberto'
  const fechado  = caixaDia?.status === 'fechado'
  const totalSangrias = (caixaDia?.sangrias || []).reduce((a, s) => a + s.valor, 0)

  // Histórico de caixas fechados
  const caixasFechados = (caixas || []).filter(c => c.status === 'fechado')
    .sort((a, b) => {
      const da = (a.data||'').split('/').reverse().join('')
      const db = (b.data||'').split('/').reverse().join('')
      return db.localeCompare(da)
    })

  return (
    <div>
      <PageTitle>🏧 Controle de Caixa</PageTitle>

      {/* Seletor de data */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <FG label="Data do caixa" style={{ maxWidth:180 }}>
          <input type="date" value={dataSel} onChange={e => setDataSel(e.target.value)} style={SEL} />
        </FG>
        {isHoje && <Badge label="HOJE" color="green" />}
      </div>

      {/* Status do caixa */}
      {!caixaDia && (
        <Card style={{ border:'2px dashed var(--border2)' }}>
          <CardTitle>Abrir Caixa — {dataSelecionada.toLocaleDateString('pt-BR')}</CardTitle>
          <InfoBox color="blue">
            ℹ️ Informe o valor em dinheiro disponível no caixa ao abrir o dia.
          </InfoBox>
          <FormRow>
            <Input label="Valor de abertura (R$)" value={valorAbertura}
              onChange={e => setValorAbertura(e.target.value)}
              type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth:200 }} />
            <Btn primary onClick={abrirCaixa} style={{ alignSelf:'flex-end' }}>🔓 Abrir caixa</Btn>
          </FormRow>
        </Card>
      )}

      {caixaDia && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <Badge label={aberto ? '🔓 Caixa Aberto' : '🔒 Caixa Fechado'} color={aberto ? 'green' : 'gray'} />
            {fechado && <span style={{ fontSize:13, color:'var(--text2)' }}>Fechado às {caixaDia.horaFechamento}</span>}
          </div>

          <MetricsGrid>
            <Metric icon="💵" label="Abertura"      value={fmt(caixaDia.valorAbertura)} />
            <Metric icon="⬆️" label="Entradas"      value={fmt(entDia)}  color="green" />
            <Metric icon="⬇️" label="Saídas"        value={fmt(saiDia)}  color="red"   />
            <Metric icon="✂️" label="Sangrias"      value={fmt(totalSangrias)} color="amber" />
            <Metric icon="💰" label="Saldo esperado" value={fmt(saldoEsperado)} color={saldoEsperado >= 0 ? 'green' : 'red'} />
            {fechado && <Metric icon="🔒" label="Valor fechamento" value={fmt(caixaDia.valorFechamento)} color="blue" />}
          </MetricsGrid>

          {/* Lançamentos do dia */}
          <Card>
            <CardTitle>📋 Movimentações do dia</CardTitle>
            {!lancsDia.length
              ? <EmptyState>Nenhuma movimentação registrada neste dia</EmptyState>
              : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead><tr>
                    <TH>Descrição</TH><TH>Origem</TH><TH>Tipo</TH><TH right>Valor</TH>
                  </tr></thead>
                  <tbody>
                    {lancsDia.map(l => (
                      <tr key={l.id}>
                        <TD>{l.desc}</TD>
                        <TD><Badge label={l.origem || 'Manual'} color={l.origem==='Venda'?'blue':l.origem==='Compra'?'purple':l.origem==='Boleto'?'red':l.origem==='Caixa'?'amber':'gray'} /></TD>
                        <TD><Badge label={l.tipo==='entrada'?'Entrada':'Saída'} color={l.tipo==='entrada'?'green':'red'} /></TD>
                        <TD right bold color={l.tipo==='entrada'?'#0F6E56':'#993C1D'}>{fmt(l.val)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Card>

          {/* Sangrias */}
          {aberto && (
            <Card>
              <CardTitle>✂️ Sangria de caixa</CardTitle>
              <InfoBox color="amber">
                Sangria é a retirada de dinheiro do caixa (ex: para pagar fornecedor em dinheiro, levar ao banco). O valor é lançado como saída no financeiro.
              </InfoBox>
              <FormRow>
                <Input label="Valor da sangria (R$)" value={sangria}
                  onChange={e => setSangria(e.target.value)}
                  type="number" min="0" step="0.01" placeholder="0,00" fg={{ maxWidth:180 }} />
                <Input label="Motivo (opcional)" value={motSangria}
                  onChange={e => setMotSangria(e.target.value)} placeholder="Ex: Pagamento fornecedor" />
                <Btn primary onClick={registrarSangria} style={{ alignSelf:'flex-end' }}>✂️ Registrar sangria</Btn>
              </FormRow>
              {(caixaDia.sangrias || []).length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginTop:12 }}>
                  <thead><tr><TH>Hora</TH><TH>Motivo</TH><TH right>Valor</TH></tr></thead>
                  <tbody>
                    {caixaDia.sangrias.map((s, i) => (
                      <tr key={i}>
                        <TD secondary>{s.hora}</TD>
                        <TD>{s.motivo || '—'}</TD>
                        <TD right bold color="#993C1D">{fmt(s.valor)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Fechar caixa */}
          {aberto && (
            <Card style={{ border:'2px solid #A5D6A7' }}>
              <CardTitle>🔒 Fechar caixa</CardTitle>
              <InfoBox color="green">
                Saldo esperado no caixa: <strong>{fmt(saldoEsperado)}</strong>
                <br/>= Abertura ({fmt(caixaDia.valorAbertura)}) + Entradas ({fmt(entDia)}) − Saídas ({fmt(saiDia)}) − Sangrias ({fmt(totalSangrias)})
              </InfoBox>
              <Btn primary onClick={fecharCaixa}>🔒 Fechar caixa do dia</Btn>
            </Card>
          )}
        </>
      )}

      {/* Histórico */}
      {caixasFechados.length > 0 && (
        <Card>
          <CardTitle>📅 Histórico de caixas fechados</CardTitle>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr>
              <TH>Data</TH><TH right>Abertura</TH><TH right>Fechamento</TH><TH>Status</TH>
            </tr></thead>
            <tbody>
              {caixasFechados.slice(0,10).map(c => (
                <tr key={c.id}>
                  <TD secondary>{c.data}</TD>
                  <TD right>{fmt(c.valorAbertura)}</TD>
                  <TD right bold color="#0F6E56">{fmt(c.valorFechamento)}</TD>
                  <TD><Badge label="Fechado" color="gray" /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
