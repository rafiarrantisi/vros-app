import type { ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  sub?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, sub, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: '#f0f2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon ?? 'info'} size={24} color="#94a3b8" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 300 }}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}
