import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)      // { nome, perfil, email }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        return
      }
      setUser(firebaseUser)
      // Listen to user profile in Firestore
      const ref = doc(db, 'usuarios', firebaseUser.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [])

  // Listen profile changes in real time (role update etc)
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'usuarios', user.uid)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setProfile(snap.data())
    })
    return unsub
  }, [user])

  async function login(email, senha) {
    await signInWithEmailAndPassword(auth, email, senha)
  }

  async function logout() {
    await signOut(auth)
  }

  // Called by admin to create a new user
  // Uses a secondary auth instance trick via REST API to avoid signing out admin
  async function criarUsuario(nome, email, senha, perfil) {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
    // Create user via Firebase REST API (doesn't affect current session)
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
      }
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    const uid = data.localId
    // Save profile in Firestore
    await setDoc(doc(db, 'usuarios', uid), {
      nome, email, perfil, uid, ativo: true, createdAt: new Date().toISOString(),
    })
    return uid
  }

  const isAdmin   = profile?.perfil === 'admin'
  const isVendedor = profile?.perfil === 'vendedor'
  const loading   = user === undefined

  return (
    <AuthCtx.Provider value={{ user, profile, isAdmin, isVendedor, loading, login, logout, criarUsuario }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
