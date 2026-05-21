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

export default function GerenciarUsuarios() {
  const { criarUsuario, profile: myProfile } = useAuth()
  const toast = useToast()
  const [usuarios,  setUsuarios]  = useState(null)

  // Criar usuário
  const [nome,    setNome]    = useState('')
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [perfil,  setPerfil]  = useState('vendedor')
  const [loading, setLoading] = useState(false)

  // Alterar senha
  const [senhaModal,    setSenhaModal]    = useState(null)  // usuário sendo editado
  const [novaSenha,     setNovaSenha]     = useState('')
  const [loadingSenha,  setLoadingSenha]  = useState(false)

  useEffect(() => {
    return onSnapshot(collection(db, 'usuarios'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  // ── Criar usuário ──────────────────────────────────────────────────────
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
        'EMAIL_EXISTS':         'Este e-mail já está cadastrado.',
        'INVALID_EMAIL':        'E-mail inválido.',
        'WEAK_PASSWORD : Password should be at least 6 characters': 'Senha fraca. Use pelo menos 6 caracteres.',
      }
      toast(msgs[err.message] || `Erro: ${err.message}`, 'err')
    } finally {
      setLoading(false)
    }
  }

  // ── Alterar senha via Firebase REST API ───────────────────────────────
  async function alterarSenha() {
    if (!novaSenha || novaSenha.length < 6) { toast('A nova senha deve ter pelo menos 6 caracteres', 'err'); return }
    setLoadingSenha(true)
    try {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY

      // 1. Busca o idToken de um login admin temporário — não é possível via REST sem o token do usuário
      // Usamos a Admin SDK via Cloud Function — alternativa: atualizar senha via REST com o UID
      // Firebase REST API: update password requires user's idToken, not UID
      // Solução: salvar nova senha no Firestore com flag, e o usuário redefine no próximo login
      // OU: usar a endpoint "accounts:update" com idToken do próprio usuário

      // Como não temos o idToken do outro usuário, usamos a abordagem de:
      // Gerar um link de redefinição de senha (password reset) via REST
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: senhaModal.email }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      toast(`E-mail de redefinição enviado para ${senhaModal.email} ✅`)
      setSenhaModal(null); setNovaSenha('')
    } catch (err) {
      toast(`Erro: ${err.message}`, 'err')
    } finally {
      setLoadingSenha(false)
    }
  }

  // ── Alterar senha diretamente (via API com nova senha sem email) ───────
  async function alterarSenhaDireta() {
    if (!novaSenha || novaSenha.length < 6) { toast('Mínimo 6 caracteres', 'err'); return }
    setLoadingSenha(true)
    try {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
      // Cria novo token para o usuário via signInWithEmailAndPassword não é possível sem a senha atual
      // Alternativa segura: usar Firebase Admin SDK via Cloud Function
      // Solução prática sem backend: deletar e recriar o usuário com nova senha
      // Para manter simples, vamos usar o reset de senha por e-mail
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: senhaModal.email }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      toast(`Link de redefinição enviado para ${senhaModal.email}! O vendedor receberá um e-mail para criar a nova senha. ✅`)
      setSenhaModal(null); setNovaSenha('')
    } catch (err) {
      toast(`Erro ao enviar e-mail: ${err.message}`, 'err')
    } finally {
      setLoadingSenha(false)
    }
  }

  // ── Toggle ativo/inativo ───────────────────────────────────────────────
  async function toggleAtivo(u) {
    if (u.uid === myProfile?.uid) { toast('Você não pode desativar sua própria conta', 'err'); return }
    await updateDoc(doc(db, 'usuarios', u.id), { ativo: !u.ativo })
    toast(u.ativo ? `${u.nome} desativado` : `${u.nome} reativado`)
  }

  // ── Alterar perfil ─────────────────────────────────────────────────────
  async function alterarPerfil(u, novoPerfil) {
    if (u.uid === myProfile?.uid) { toast('Você não pode alterar seu próprio perfil', 'err'); return }
    await updateDoc(doc(db, 'usuarios', u.id), { perfil: novoPerfil })
    toast(`Perfil de ${u.nome} alterado!`)
  }

  if (usuarios === null) return <Loading />

  return (
    <div>
      <PageTitle>👥 Gerenciar Usuários</PageTitle>

      <InfoBox color="blue">
        ℹ️ <strong>Administrador</strong> — acesso completo ao sistema. &nbsp;|&nbsp;
        <strong>Vendedor</strong> — acessa apenas Vendas, Clientes, Fichas, Estoque, Compras e Boletos.
      </InfoBox>

      {/* ── Criar usuário ── */}
      <Card>
        <CardTitle>➕ Criar novo usuário</CardTitle>
        <FormRow>
          <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Silva" />
          <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="joao@email.com" fg={{ maxWidth:220 }} />
          <Input label="Senha (mín. 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} type="password" placeholder="••••••••" fg={{ maxWidth:200 }} />
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxWidth:170 }}>
            <label style={{ fontSize:12, color:'var(--text2)' }}>Perfil</label>
            <select value={perfil} onChange={e => setPerfil(e.target.value)} style={SEL}>
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Btn primary onClick={criar} disabled={loading} style={{ alignSelf:'flex-end' }}>
            {loading ? 'Criando...' : '+ Criar usuário'}
          </Btn>
        </FormRow>
      </Card>

      {/* ── Lista de usuários ── */}
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
                      <select value={u.perfil} onChange={e => alterarPerfil(u, e.target.value)}
                        disabled={u.uid === myProfile?.uid} style={{
                          ...SEL, maxWidth:150, height:30, fontSize:12,
                          background: u.perfil==='admin'?'#F0EAFB':'#E6F1FB',
                          color: u.perfil==='admin'?'#5B35B5':'#185FA5',
                          borderColor: u.perfil==='admin'?'#CE93D8':'#90CAF9',
                          cursor: u.uid===myProfile?.uid?'not-allowed':'pointer',
                        }}>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </TD>
                    <TD><Badge label={u.ativo===false?'Inativo':'Ativo'} color={u.ativo===false?'red':'green'} /></TD>
                    <TD secondary>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</TD>
                    <TD>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {/* Alterar senha */}
                        {u.uid !== myProfile?.uid && (
                          <button onClick={() => { setSenhaModal(u); setNovaSenha('') }} style={{
                            padding:'4px 10px', borderRadius:6, border:'1px solid #90CAF9',
                            background:'#E6F1FB', cursor:'pointer', fontSize:12,
                            color:'#185FA5', fontFamily:'inherit',
                          }}>🔑 Alterar senha</button>
                        )}
                        {/* Ativar/desativar */}
                        {u.uid !== myProfile?.uid && (
                          <button onClick={() => toggleAtivo(u)} style={{
                            padding:'4px 10px', borderRadius:6, border:'1px solid var(--border2)',
                            background:'transparent', cursor:'pointer', fontSize:12,
                            color: u.ativo===false?'#0F6E56':'#993C1D', fontFamily:'inherit',
                          }}>
                            {u.ativo===false ? '✅ Reativar' : '🚫 Desativar'}
                          </button>
                        )}
                        {u.uid === myProfile?.uid && (
                          <span style={{ fontSize:11, color:'var(--text3)' }}>Você</span>
                        )}
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>

      {/* ── Modal alterar senha ── */}
      {senhaModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:24,
        }} onClick={e => { if(e.target===e.currentTarget){ setSenhaModal(null); setNovaSenha('') }}}>
          <div style={{
            background:'var(--bg)', borderRadius:16, padding:'28px 28px',
            width:'100%', maxWidth:400, boxShadow:'0 8px 40px rgba(0,0,0,.2)',
          }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>🔑 Alterar senha</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              Usuário: <strong>{senhaModal.nome}</strong> ({senhaModal.email})
            </div>

            <InfoBox color="blue" style={{ marginBottom:16 }}>
              ℹ️ Por segurança, será enviado um <strong>link de redefinição de senha</strong> para o e-mail do usuário. Ele clica no link e cria a nova senha.
            </InfoBox>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn onClick={() => { setSenhaModal(null); setNovaSenha('') }}>Cancelar</Btn>
              <Btn primary onClick={alterarSenhaDireta} disabled={loadingSenha}>
                {loadingSenha ? 'Enviando...' : '📧 Enviar link de redefinição'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
