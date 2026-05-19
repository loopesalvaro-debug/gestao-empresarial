import { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  Card, CardTitle, PageTitle, FormRow, Input, Btn, Badge,
  TH, TD, EmptyState, Loading, InfoBox,
} from '../shared/UI'

const SEL = { height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:14, fontFamily:'inherit', width:'100%' }

const PERFIL_TABS = {
  admin:    { label: 'Administrador', desc: 'Acesso total ao sistema', color: 'purple' },
  vendedor: { label: 'Vendedor',      desc: 'Vendas, Clientes, Fichas, Estoque, Compras, Boletos', color: 'blue' },
}

export default function GerenciarUsuarios() {
  const { criarUsuario, profile: myProfile } = useAuth()
  const toast = useToast()
  const [usuarios,  setUsuarios]  = useState(null)
  const [nome,      setNome]      = useState('')
  const [email,     setEmail]     = useState('')
  const [senha,     setSenha]     = useState('')
  const [perfil,    setPerfil]    = useState('vendedor')
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'usuarios'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function criar() {
    if (!nome.trim() || !email.trim() || !senha) { toast('Preencha todos os campos', 'err'); return }
    if (senha.length < 6) { toast('A senha deve ter pelo menos 6 caracteres', 'err'); return }
    setLoading(true)
    try {
      await criarUsuario(nome.trim(), email.trim(), senha, perfil)
      setNome(''); setEmail(''); setSenha(''); setPerfil('vendedor')
      toast(`Usuário ${nome} criado com sucesso! ✅`)
    } catch (err) {
      const msgs = {
        'EMAIL_EXISTS': 'Este e-mail já está cadastrado.',
        'WEAK_PASSWORD : Password should be at least 6 characters': 'Senha muito fraca. Use pelo menos 6 caracteres.',
        'INVALID_EMAIL': 'E-mail inválido.',
      }
      toast(msgs[err.message] || `Erro: ${err.message}`, 'err')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAtivo(u) {
    if (u.uid === myProfile?.uid) { toast('Você não pode desativar sua própria conta', 'err'); return }
    await updateDoc(doc(db, 'usuarios', u.id), { ativo: !u.ativo })
    toast(u.ativo ? `${u.nome} desativado` : `${u.nome} reativado`)
  }

  async function alterarPerfil(u, novoPerfil) {
    if (u.uid === myProfile?.uid) { toast('Você não pode alterar seu próprio perfil', 'err'); return }
    await updateDoc(doc(db, 'usuarios', u.id), { perfil: novoPerfil })
    toast(`Perfil de ${u.nome} alterado para ${PERFIL_TABS[novoPerfil].label}`)
  }

  if (usuarios === null) return <Loading />

  return (
    <div>
      <PageTitle>👥 Gerenciar Usuários</PageTitle>

      <InfoBox color="blue">
        ℹ️ Cadastre os usuários do sistema aqui. O <strong>Administrador</strong> tem acesso completo. O <strong>Vendedor</strong> acessa apenas Vendas, Clientes, Fichas, Estoque, Compras e Boletos.
      </InfoBox>

      <Card>
        <CardTitle>➕ Criar novo usuário</CardTitle>
        <FormRow>
          <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Ex: João Silva" />
          <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="joao@email.com" fg={{ maxWidth: 220 }} />
          <Input label="Senha (mín. 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)}
            type="password" placeholder="••••••••" fg={{ maxWidth: 200 }} />
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxWidth:170 }}>
            <label style={{ fontSize:12, color:'var(--text2)' }}>Perfil de acesso</label>
            <select value={perfil} onChange={e => setPerfil(e.target.value)} style={SEL}>
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Btn primary onClick={criar} disabled={loading} style={{ alignSelf:'flex-end' }}>
            {loading ? 'Criando...' : '+ Criar usuário'}
          </Btn>
        </FormRow>

        <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
          {Object.entries(PERFIL_TABS).map(([k, v]) => (
            <div key={k} style={{
              background: perfil===k?'var(--bg3)':'var(--bg2)',
              border: `1px solid ${perfil===k?'var(--border)':'var(--border)'}`,
              borderRadius:8, padding:'8px 12px', fontSize:13,
              cursor:'pointer', transition:'background .12s',
            }} onClick={() => setPerfil(k)}>
              <div style={{ fontWeight:600 }}>{v.label} {perfil===k?'✓':''}</div>
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Usuários cadastrados ({usuarios.length})</CardTitle>
        {!usuarios.length
          ? <EmptyState>Nenhum usuário cadastrado</EmptyState>
          : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead><tr>
                <TH>Nome</TH><TH>E-mail</TH><TH>Perfil</TH>
                <TH>Status</TH><TH>Cadastrado em</TH><TH>Ações</TH>
              </tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ opacity: u.ativo===false ? 0.5 : 1 }}>
                    <TD bold>{u.nome}</TD>
                    <TD secondary>{u.email}</TD>
                    <TD>
                      <select
                        value={u.perfil}
                        onChange={e => alterarPerfil(u, e.target.value)}
                        disabled={u.uid === myProfile?.uid}
                        style={{ ...SEL, maxWidth:150, height:30, fontSize:12,
                          background: u.perfil==='admin'?'#F0EAFB':'#E6F1FB',
                          color: u.perfil==='admin'?'#5B35B5':'#185FA5',
                          borderColor: u.perfil==='admin'?'#CE93D8':'#90CAF9',
                          cursor: u.uid===myProfile?.uid?'not-allowed':'pointer',
                        }}>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </TD>
                    <TD>
                      <Badge
                        label={u.ativo===false?'Inativo':'Ativo'}
                        color={u.ativo===false?'red':'green'}
                      />
                    </TD>
                    <TD secondary>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </TD>
                    <TD>
                      {u.uid !== myProfile?.uid && (
                        <button onClick={() => toggleAtivo(u)} style={{
                          padding:'4px 10px', borderRadius:6, border:'1px solid var(--border2)',
                          background:'transparent', cursor:'pointer', fontSize:12,
                          color: u.ativo===false?'#0F6E56':'#993C1D',
                          fontFamily:'inherit',
                        }}>
                          {u.ativo===false ? '✅ Reativar' : '🚫 Desativar'}
                        </button>
                      )}
                      {u.uid === myProfile?.uid && (
                        <span style={{ fontSize:11, color:'var(--text3)' }}>Você</span>
                      )}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  )
}
