interface CapBarProps {
  label: string
  pct: number
  text: string
}

export function CapBar({ label, pct, text }: CapBarProps) {
  const col = pct > 90 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e'
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#8896b3',
          marginBottom: 3,
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: 'DM Mono', color: col, fontWeight: 600 }}>{text}</span>
      </div>
      <div style={{ height: 5, background: '#f0f2f7', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: col,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}
