import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
}

export function Card({ children, style = {} }: CardProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e8ecf4',
        padding: '20px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
