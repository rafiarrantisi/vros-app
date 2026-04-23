import type { DeliveryOutcome, OrderStatus } from '@/lib/types'

export type BadgeColor = 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'

const PALETTE: Record<BadgeColor, { bg: string; text: string; dot: string }> = {
  blue: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  green: { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
  red: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  yellow: { bg: '#fefce8', text: '#854d0e', dot: '#eab308' },
  gray: { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
  purple: { bg: '#faf5ff', text: '#6b21a8', dot: '#a855f7' },
}

interface BadgeProps {
  label: string
  color?: BadgeColor
}

export function Badge({ label, color = 'blue' }: BadgeProps) {
  const c = PALETTE[color]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: c.bg,
        color: c.text,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 20,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
      {label}
    </span>
  )
}

interface StatusBadgeProps {
  status: OrderStatus | string
  outcome?: DeliveryOutcome | null
}

export function StatusBadge({ status, outcome }: StatusBadgeProps) {
  if (status === 'delivered') {
    return <Badge label={outcome === 'on-time' ? 'On-Time' : 'Late'} color={outcome === 'on-time' ? 'green' : 'red'} />
  }
  if (status === 'in-transit') return <Badge label="In Transit" color="blue" />
  if (status === 'pending') return <Badge label="Pending" color="yellow" />
  if (status === 'confirmed') return <Badge label="Confirmed" color="purple" />
  return <Badge label={status} color="gray" />
}
