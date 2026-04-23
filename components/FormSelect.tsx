'use client'

export type SelectOption = string | { value: string; label: string }

interface FormSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<SelectOption>
  required?: boolean
}

function optionValue(o: SelectOption): string {
  return typeof o === 'string' ? o : o.value
}

function optionLabel(o: SelectOption): string {
  return typeof o === 'string' ? o : o.label
}

export function FormSelect({ label, value, onChange, options, required = false }: FormSelectProps) {
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '9px 12px',
          borderRadius: 8,
          border: '1.5px solid #e2e8f0',
          fontSize: 13,
          fontFamily: 'DM Sans',
          color: '#1a2035',
          outline: 'none',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={optionValue(o)} value={optionValue(o)}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    </div>
  )
}
