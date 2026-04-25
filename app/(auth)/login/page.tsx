'use client'

// Login page — ported 1:1 from Telkom/VROS v3.html LoginPage.
// Only change vs v3: handleLogin now calls Supabase via lib/auth.signIn(),
// and on success redirects via App Router instead of calling onLogin(user).

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Icon } from '@/components/Icon'
import { ROLE_HOME } from '@/lib/constants'
import { signIn } from '@/lib/auth'

interface DemoAccount {
  label: string
  u: string
  p: string
  color: string
}

const DEMO: DemoAccount[] = [
  { label: 'Operational Manager', u: 'manager01', p: 'mgr123', color: '#2563eb' },
  { label: 'Administrator', u: 'admin01', p: 'admin123', color: '#ef4444' },
  { label: 'Customer', u: 'cv.mitausaha', p: 'cust123', color: '#8b5cf6' },
  { label: 'Driver', u: 'driver01', p: 'drv123', color: '#f59e0b' },
]

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn(username, password)

    if (!result.success || !result.role) {
      setError(result.error ?? 'Login gagal.')
      setLoading(false)
      return
    }

    router.replace(ROLE_HOME[result.role])
    router.refresh()
  }

  const disabled = loading || !username || !password

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0c1426',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* Brand */}
      <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease both' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Icon name="truck" size={32} color="#fff" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>VROS</div>
        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>Vehicle Routing Optimization System</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          PT. Pindad International Logistic · Bandung
        </div>
      </div>

      {/* Login card */}
      <div
        style={{
          width: 400,
          background: '#111c30',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '28px',
          animation: 'slideUp 0.5s 0.08s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          Masuk ke Sistem
        </div>
        <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 20 }}>
          Masukkan kredensial Anda untuk melanjutkan
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #1e2f4a',
                  background: '#0c1426',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontFamily: 'DM Mono',
                  outline: 'none',
                  transition: 'border 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2f4a')}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #1e2f4a',
                  background: '#0c1426',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontFamily: 'DM Sans',
                  outline: 'none',
                  transition: 'border 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#1e2f4a')}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: '#f87171',
                marginBottom: 12,
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={disabled}
            style={{
              width: '100%',
              padding: '11px',
              background: disabled ? '#1e3a6e' : '#2563eb',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'DM Sans',
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Authenticating…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 20, borderTop: '1px solid #1e2f4a', paddingTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: 10,
            }}
          >
            Demo Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {DEMO.map((d) => (
              <button
                key={d.u}
                type="button"
                onClick={() => {
                  setUsername(d.u)
                  setPassword(d.p)
                }}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid #1e2f4a',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'DM Sans',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.borderColor = '#2d4070'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = '#1e2f4a'
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: d.color, marginBottom: 3 }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono', color: '#cbd5e1' }}>{d.u}</div>
                <div style={{ fontSize: 9, fontFamily: 'DM Mono', color: '#94a3b8' }}>{d.p}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          color: '#94a3b8',
          animation: 'slideUp 0.5s 0.16s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        Technova Team · Telkom University · Capstone 2026
      </div>
    </div>
  )
}
