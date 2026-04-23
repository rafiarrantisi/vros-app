'use client'

import type { ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

export type BtnVariant = 'primary' | 'danger' | 'ghost' | 'success' | 'warning'
export type BtnSize = 'sm' | 'md' | 'lg'

const VARIANT_BG: Record<BtnVariant, string> = {
  primary: '#2563eb',
  danger: '#ef4444',
  ghost: 'transparent',
  success: '#16a34a',
  warning: '#d97706',
}

const VARIANT_TEXT: Record<BtnVariant, string> = {
  primary: '#fff',
  danger: '#fff',
  ghost: '#475569',
  success: '#fff',
  warning: '#fff',
}

interface BtnProps {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  icon?: IconName
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  type = 'button',
  fullWidth = false,
}: BtnProps) {
  const bg = VARIANT_BG[variant]
  const col = VARIANT_TEXT[variant]
  const pad = size === 'sm' ? '6px 12px' : size === 'lg' ? '11px 24px' : '8px 16px'
  const fs = size === 'sm' ? 12 : 13

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        background: disabled ? '#94a3b8' : bg,
        border: variant === 'ghost' ? '1.5px solid #e2e8f0' : 'none',
        borderRadius: 8,
        color: disabled ? '#fff' : col,
        fontSize: fs,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'DM Sans',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
        justifyContent: 'center',
        transition: 'opacity 0.15s',
        opacity: disabled ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '0.88'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
    >
      {icon && <Icon name={icon} size={13} color={col} />}
      {children}
    </button>
  )
}
