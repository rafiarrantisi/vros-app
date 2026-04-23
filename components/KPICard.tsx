import { Card } from './Card'
import { Icon, type IconName } from './Icon'

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon: IconName
}

export function KPICard({ label, value, sub, accent = '#2563eb', icon }: KPICardProps) {
  return (
    <Card style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 14, right: 14, opacity: 0.07 }}>
        <Icon name={icon} size={44} color={accent} />
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#8896b3',
          textTransform: 'uppercase',
          letterSpacing: '0.9px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#1a2035',
          letterSpacing: '-0.8px',
          fontFamily: 'DM Mono',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#8896b3', marginTop: 3 }}>{sub}</div>}
    </Card>
  )
}
