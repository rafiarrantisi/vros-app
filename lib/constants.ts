// Frozen "today" — matches seed data narrative (Feb–Apr 2026).
// Do NOT replace with new Date() — would break baseline KPI math.
export const TODAY = '2026-04-22'

export const DEPOT = 'Bandung'

export const CORRIDORS = ['Jakarta', 'Surabaya', 'Malang'] as const
export type Corridor = (typeof CORRIDORS)[number]

export const ROLE_COLORS = {
  manager: '#2563eb',
  admin: '#ef4444',
  customer: '#8b5cf6',
  driver: '#f59e0b',
} as const

export const ROLE_HOME = {
  manager: '/manager/dashboard',
  admin: '/admin/accounts',
  customer: '/customer',
  driver: '/driver',
} as const
