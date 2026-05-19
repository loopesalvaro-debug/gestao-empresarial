import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro,  setErro]    = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !senha) { setErro('Preencha e-mail e senha'); return }
    setLoading(true); setErro('')
    try {
      await login(email, senha)
    } catch (err) {
      const msgs = {
        'auth/invalid-credential':    'E-mail ou senha incorretos.',
        'auth/user-not-found':        'Usuário não encontrado.',
        'auth/wrong-password':        'Senha incorreta.',
        'auth/too-many-requests':     'Muitas tentativas. Aguarde alguns minutos.',
        'auth/invalid-email':         'E-mail inválido.',
      }
      setErro(msgs[err.code] || 'Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg2)', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16,
        padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Comercial Jardinense</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Sistema de Gestão</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" autoComplete="email"
              style={{
                width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
                border: '1px solid var(--border2)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              style={{
                width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
                border: '1px solid var(--border2)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
              }}
            />
          </div>

          {erro && (
            <div style={{
              background: '#FAECE7', color: '#993C1D', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>
              ⚠️ {erro}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', height: 44, borderRadius: 10, border: 'none',
              background: loading ? 'var(--bg2)' : 'var(--text)',
              color: loading ? 'var(--text2)' : 'var(--bg)',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'opacity .15s',
            }}
          >
            {loading ? 'Entrando...' : '→ Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>
          Não tem acesso? Solicite ao administrador.
        </div>
      </div>
    </div>
  )
}
