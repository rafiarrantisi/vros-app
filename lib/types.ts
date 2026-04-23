// Database row types — mirror supabase/migrations/0001_init.sql

export type UserRole = 'manager' | 'admin' | 'customer' | 'driver'

export interface UserProfile {
  id: string
  username: string
  name: string
  role: UserRole
  dept: string | null
  customer_id: string | null
  vehicle_id: string | null
  assigned_plan_id: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  dest: string
  contact: string | null
}

export interface Vehicle {
  id: string
  type: string
  brand: string | null
  year: number | null
  units: number
  max_weight: number
  max_vol: number
  tire: number | null
  length: number | null
  width: number | null
  height: number | null
  available: number
}

export interface Checkpoint {
  corridor: string
  idx: number
  name: string
  km: number
  lat: number | null
  lng: number | null
}

export interface DistanceRow {
  from_node: string
  to_node: string
  km: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'in-transit' | 'delivered'
export type DeliveryOutcome = 'on-time' | 'late'

export interface Order {
  id: string
  customer_id: string
  customer: string
  dest: string
  weight_ton: number
  length_m: number | null
  width_m: number | null
  height_m: number | null
  vol_m3: number | null
  notes: string | null
  status: OrderStatus
  delivery_outcome: DeliveryOutcome | null
  date: string
  vehicle: string | null
  route_plan_id: string | null
  driver_id: string | null
  created_at: string
}

export interface RoutePlan {
  id: string
  order_ids: string[]
  sequence: string[]
  vehicle: string
  total_weight: number
  total_vol: number
  distance: number
  savings: number
  status: 'draft' | 'confirmed' | 'in-transit' | 'delivered'
  confirmed_at: string | null
  confirmed_by: string | null
  weight_pct: number | null
  vol_pct: number | null
  driver_id: string | null
  created_at: string
}

export interface DriverLocation {
  driver_id: string
  checkpoint_idx: number
  dest: string
  timestamp: string
  note: string | null
  updated_at: string
}

// ── CVRP domain types (used by lib/cvrp.ts) ─────────────────────────
export type DistMatrix = Record<string, Record<string, number>>

export interface RoutePlanDraft {
  id: string
  orderIds: string[]
  sequence: string[]
  vehicle: string
  totalWeight: number
  totalVol: number
  distance: number
  savings: number
  weightPct: number
  volPct: number
  status: 'draft'
}
