import { useState, useEffect } from 'react'
import { subscribeCollection, addDocument, updateDocument, deleteDocument } from '../../lib/firestore'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, FormRow, Input, Select, FG,
  Btn, DelBtn, EditBtn, Badge, TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const empty = { nome:'', tabela:'1', tel:'', email:'', ender:'', obs:'' }

export default function Clientes() {
  const toast = useToast()
  const [clientes, setClientes] = useState(null)
  const [form, setForm]         = useState(empty)
  const [editId, setEditId]     = useState(null)

  useEffect(() => subscribeCollection('clientes', setClientes), [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.nome.trim()) { toast('Informe o nome do cliente', 'err'); return }
    const data = { ...form, nome: form.nome.trim() }
    if (editId) { await updateDocument('clientes', editId, data); toast('Cliente atualizado!') }
    else        { await addDocument('clientes', data);            toast('Cliente cadastrado!') }
    setForm(empty); setEditId(null)
  }

  function startEdit(c) {
    setEditId(c.id)
    setForm({ nome: c.nome, tabela: c.tabela || '1', tel: c.tel || '', email: c.email || '', ender: c.ender || '', obs: c.obs || '' })
  }

  function cancelEdit() { setForm(empty); setEditId(null) }

  async function del(id) { await deleteDocument('clientes', id) }

  if (clientes === null) return <Loading />

  return (
    <div>
      <PageTitle>👤 Clientes</PageTitle>

      <Card>
        <CardTitle>{editId ? 'Editar cliente' : 'Cadastrar cliente'}</CardTitle>
        <FormRow>
          <Input label="Nome *" value={form.nome} onChange={set('nome')} placeholder="Nome completo" />
          <Select label="Tabela de preço" value={form.tabela} onChange={set('tabela')} fg={{ maxWidth: 180 }}>
            <option value="1">Tabela 1 — Cliente Final</option>
            <option value="2">Tabela 2 — Revenda</option>
          </Select>
          <Input label="Telefone" value={form.tel} onChange={set('tel')} placeholder="(00) 00000-0000" fg={{ maxWidth: 170 }} />
          <Input label="E-mail" value={form.email} onChange={set('email')} type="email" placeholder="email@exemplo.com" fg={{ maxWidth: 210 }} />
        </FormRow>
        <FormRow>
          <Input label="Endereço" value={form.ender} onChange={set('ender')} placeholder="Rua, número, bairro" />
          <Input label="Observações" value={form.obs} onChange={set('obs')} placeholder="Informações adicionais" />
          <Btn primary onClick={save} style={{ alignSelf: 'flex-end' }}>{editId ? '💾 Salvar' : '+ Cadastrar'}</Btn>
          {editId && <Btn onClick={cancelEdit} style={{ alignSelf: 'flex-end' }}>Cancelar</Btn>}
        </FormRow>
        <InfoBox color="blue" style={{ marginBottom: 0 }}>
          ℹ️ <span><strong>Tabela 1</strong> = preço cheio (varejo). <strong>Tabela 2</strong> = preço de revenda (atacado). O preço é aplicado automaticamente na venda.</span>
        </InfoBox>
      </Card>

      <Card>
        <CardTitle>Clientes cadastrados ({clientes.length})</CardTitle>
        {!clientes.length
          ? <EmptyState>Nenhum cliente cadastrado</EmptyState>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>
                  <TH>Nome</TH><TH>Tabela</TH><TH>Telefone</TH>
                  <TH>E-mail</TH><TH>Endereço</TH><TH>Observações</TH><TH />
                </tr></thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id}>
                      <TD bold>{c.nome}</TD>
                      <TD>{c.tabela === '2' ? <Badge label="T2 — Revenda" color="tab2" /> : <Badge label="T1 — Final" color="tab1" />}</TD>
                      <TD secondary>{c.tel   || '—'}</TD>
                      <TD secondary>{c.email || '—'}</TD>
                      <TD secondary>{c.ender || '—'}</TD>
                      <TD secondary>{c.obs   || '—'}</TD>
                      <TD>
                        <EditBtn onClick={() => startEdit(c)} />
                        <DelBtn  onClick={() => del(c.id)} />
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
