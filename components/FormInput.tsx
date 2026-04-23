'use client'

import { useState } from 'react'

interface FormInputProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
  readOnly?: boolean
  required?: boolean
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  mono = false,
  readOnly = false,
  required = false,
}: FormInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6b7fa3',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          {label}
          {required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: '9px 12px',
          borderRadius: 8,
          border: `1.5px solid ${focused ? '#3b82f6' : '#e2e8f0'}`,
          fontSize: 13,
          fontFamily: mono ? 'DM Mono' : 'DM Sans',
          color: '#1a2035',
          outline: 'none',
          background: readOnly ? '#f8fafc' : '#fff',
          transition: 'border 0.15s',
        }}
      />
    </div>
  )
}
