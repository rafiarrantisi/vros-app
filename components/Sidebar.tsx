'use client'

// Sidebar — ported 1:1 from Telkom/VROS v3.html Sidebar.
// v3 used page state; here active state comes from usePathname().

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { ROLE_COLORS } from '@/lib/constants'
import { navFor } from '@/lib/nav'
import { signOut } from '@/lib/auth'

import { Icon } from './Icon'

interface SidebarProps {
  userName: string
  role: 'manager' | 'admin'
}

const ROLE_LABEL: Record<'manager' | 'admin', string> = {
  manager: 'Operational Manager',
  admin: 'System Administrator',
}

export function Sidebar({ userName, role }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const nav = navFor(role)
  const roleColor = ROLE_COLORS[role]
  const sections = Array.from(new Set(nav.map((n) => n.section)))

  async function handleLogout() {
    await signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: '#0c1426',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg,${roleColor},${roleColor}cc)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="truck" size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>VROS</div>
            <div
              style={{
                fontSize: 9,
                color: '#94a3b8',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              PT. PIL · Bandung
            </div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: `${roleColor}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: roleColor,
              flexShrink: 0,
            }}
          >
            {userName.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#c5d0e6',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>{ROLE_LABEL[role]}</div>
          </div>
        </div>
      </div>

      {/* Nav by section */}
      <nav style={{ flex: 1, padding: '10px 7px', overflowY: 'auto' }}>
        {sections.map((section) => (
          <div key={section}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.9px',
                padding: '8px 9px 4px',
              }}
            >
              {section}
            </div>
            {nav
              .filter((n) => n.section === section)
              .map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 9px',
                      borderRadius: 7,
                      background: active ? `${roleColor}22` : 'transparent',
                      color: active ? roleColor : '#cbd5e1',
                      fontSize: 12,
                      fontWeight: active ? 700 : 400,
                      marginBottom: 1,
                      textAlign: 'left',
                      fontFamily: 'DM Sans',
                      transition: 'all 0.12s',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name={item.icon} size={13} color={active ? roleColor : '#cbd5e1'} />
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <div
                        style={{
                          width: 3,
                          height: 13,
                          borderRadius: 2,
                          background: roleColor,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </Link>
                )
              })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px 7px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 9px',
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: '#cbd5e1',
            fontSize: 12,
            fontFamily: 'DM Sans',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#cbd5e1'
          }}
        >
          <Icon name="logout" size={13} color="currentColor" />
          Sign Out
        </button>
        <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
          Technova · Telkom Univ 2026
        </div>
      </div>
    </aside>
  )
}
