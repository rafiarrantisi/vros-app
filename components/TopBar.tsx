'use client'

import { usePathname } from 'next/navigation'

import { ROLE_COLORS, TODAY } from '@/lib/constants'
import { titleFor } from '@/lib/nav'

const ROLE_LABEL: Record<'manager' | 'admin', string> = {
  manager: 'Operational Manager',
  admin: 'System Administrator',
}

// Frozen date shown in TopBar — matches v3 narrative "22 Apr 2026".
// Derives from lib/constants.TODAY so changing TODAY updates both.
function formattedToday(): string {
  const d = new Date(TODAY + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

interface TopBarProps {
  role: 'manager' | 'admin'
}

export function TopBar({ role }: TopBarProps) {
  const pathname = usePathname()
  const title = titleFor(pathname)
  const roleColor = ROLE_COLORS[role]

  return (
    <div
      style={{
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #e8ecf4',
        display: 'flex',
        alignItems: 'center',
        padding: '0 22px',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2035', letterSpacing: '-0.3px' }}>
          {title}
        </div>
        <div style={{ fontSize: 10, color: '#8896b3' }}>
          PT. Pindad International Logistic · VROS
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#8896b3', fontFamily: 'DM Mono' }}>
          {formattedToday()}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '4px 11px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e8ecf4',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: roleColor,
            }}
          />
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
            {ROLE_LABEL[role]}
          </span>
        </div>
      </div>
    </div>
  )
}
