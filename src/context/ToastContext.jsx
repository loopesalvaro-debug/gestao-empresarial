import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed', top: 18, right: 18, zIndex: 9999,
          padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          background: toast.type === 'err' ? '#993C1D' : toast.type === 'warn' ? '#854F0B' : '#0F6E56',
          animation: 'fadeIn .18s',
        }}>
          {toast.msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
