/**
 * Seed Supabase with VROS demo data.
 *
 * Usage: `npx tsx supabase/seed.ts`
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.
 * Idempotency: auth users with existing emails are skipped; other tables are
 * truncated then re-inserted. Safe to re-run.
 *
 * Source: ported verbatim from Telkom/vros_data.js (16 orders, 14 route plans,
 * 16 customers, 4 vehicles, 11 users, 3 corridors × 6 checkpoints).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

// Load .env.local explicitly (not loaded by tsx by default)
loadEnv({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ══════════════════════════════════════════════════════════════════════
// SEED DATA (ported from Telkom/vros_data.js)
// ══════════════════════════════════════════════════════════════════════

interface SeedUser {
  legacyId: string
  username: string
  password: string
  role: 'manager' | 'admin' | 'customer' | 'driver'
  name: string
  dept?: string
  customerId?: string
  assignedPlanId?: string | null
}

const USERS: SeedUser[] = [
  { legacyId: 'M01', username: 'manager01', password: 'mgr123', role: 'manager', name: 'Rina Kusuma', dept: 'Operational' },
  { legacyId: 'M02', username: 'manager02', password: 'mgr456', role: 'manager', name: 'Budi Santoso', dept: 'Operational' },
  { legacyId: 'A01', username: 'admin01', password: 'admin123', role: 'admin', name: 'Ahmad Fauzi', dept: 'IT' },
  { legacyId: 'CU01', username: 'cv.majubersama', password: 'cust123', role: 'customer', name: 'CV. Maju Bersama', customerId: 'C01' },
  { legacyId: 'CU02', username: 'pt.sinarabadi', password: 'cust123', role: 'customer', name: 'PT. Sinar Abadi', customerId: 'C02' },
  { legacyId: 'CU03', username: 'cv.mitausaha', password: 'cust123', role: 'customer', name: 'CV. Mitra Usaha', customerId: 'C13' },
  { legacyId: 'CU04', username: 'pt.cakramandiri', password: 'cust123', role: 'customer', name: 'PT. Cakra Mandiri', customerId: 'C14' },
  { legacyId: 'CU05', username: 'ud.terangbenderang', password: 'cust123', role: 'customer', name: 'UD. Terang Benderang', customerId: 'C15' },
  { legacyId: 'D01', username: 'driver01', password: 'drv123', role: 'driver', name: 'Slamet Riyadi', assignedPlanId: 'RP-013' },
  { legacyId: 'D02', username: 'driver02', password: 'drv123', role: 'driver', name: 'Hendra Wijaya', assignedPlanId: 'RP-014' },
  { legacyId: 'D03', username: 'driver03', password: 'drv123', role: 'driver', name: 'Agus Prasetyo', assignedPlanId: null },
]

const CUSTOMERS = [
  { id: 'C01', name: 'CV. Maju Bersama', dest: 'Jakarta', contact: '021-5551234' },
  { id: 'C02', name: 'PT. Sinar Abadi', dest: 'Surabaya', contact: '031-5552345' },
  { id: 'C03', name: 'UD. Karya Mandiri', dest: 'Malang', contact: '0341-553456' },
  { id: 'C04', name: 'PT. Global Nusantara', dest: 'Jakarta', contact: '021-5554567' },
  { id: 'C05', name: 'CV. Pratama Jaya', dest: 'Surabaya', contact: '031-5555678' },
  { id: 'C06', name: 'PT. Mega Logistik', dest: 'Malang', contact: '0341-556789' },
  { id: 'C07', name: 'UD. Sejahtera', dest: 'Jakarta', contact: '021-5557890' },
  { id: 'C08', name: 'CV. Barokah Trans', dest: 'Surabaya', contact: '031-5558901' },
  { id: 'C09', name: 'PT. Indah Kargo', dest: 'Malang', contact: '0341-559012' },
  { id: 'C10', name: 'CV. Rimba Raya', dest: 'Jakarta', contact: '021-5550123' },
  { id: 'C11', name: 'PT. Anugerah Mulia', dest: 'Surabaya', contact: '031-5561234' },
  { id: 'C12', name: 'UD. Harapan Baru', dest: 'Malang', contact: '0341-562345' },
  { id: 'C13', name: 'CV. Mitra Usaha', dest: 'Jakarta', contact: '021-5563456' },
  { id: 'C14', name: 'PT. Cakra Mandiri', dest: 'Surabaya', contact: '031-5564567' },
  { id: 'C15', name: 'UD. Terang Benderang', dest: 'Malang', contact: '0341-565678' },
  { id: 'C16', name: 'CV. Bumi Lestari', dest: 'Jakarta', contact: '021-5566789' },
]

const VEHICLES = [
  { id: 'V01', type: 'Towing', brand: 'Isuzu', year: 2021, units: 1, max_weight: 6, max_vol: 26.266, tire: 6, length: 6, width: 1.92, height: 2.28, available: 1 },
  { id: 'V02', type: 'CDD Box', brand: 'Isuzu', year: 2021, units: 6, max_weight: 6, max_vol: 26.266, tire: 6, length: 6, width: 1.92, height: 2.28, available: 4 },
  { id: 'V03', type: 'Fuso Bak', brand: 'Isuzu', year: 2021, units: 2, max_weight: 16, max_vol: 193.544, tire: 6, length: 9.69, width: 2.564, height: 2.93, available: 1 },
  { id: 'V04', type: 'CDE Box', brand: 'Isuzu', year: 2021, units: 2, max_weight: 4, max_vol: 17.825, tire: 4, length: 4.7, width: 1.85, height: 2.05, available: 1 },
]

const CHECKPOINTS = [
  { corridor: 'Jakarta',  idx: 0, name: 'Bandung HQ',       km: 0,   lat: -6.9175, lng: 107.6191 },
  { corridor: 'Jakarta',  idx: 1, name: 'Padalarang',       km: 28,  lat: -6.8345, lng: 107.4746 },
  { corridor: 'Jakarta',  idx: 2, name: 'Purwakarta',       km: 75,  lat: -6.5563, lng: 107.4402 },
  { corridor: 'Jakarta',  idx: 3, name: 'Karawang',         km: 110, lat: -6.3099, lng: 107.3141 },
  { corridor: 'Jakarta',  idx: 4, name: 'Bekasi',           km: 138, lat: -6.2349, lng: 106.9946 },
  { corridor: 'Jakarta',  idx: 5, name: 'Jakarta (Tujuan)', km: 150, lat: -6.2088, lng: 106.8456 },
  { corridor: 'Surabaya', idx: 0, name: 'Bandung HQ',       km: 0,   lat: -6.9175, lng: 107.6191 },
  { corridor: 'Surabaya', idx: 1, name: 'Cirebon',          km: 130, lat: -6.7320, lng: 108.5523 },
  { corridor: 'Surabaya', idx: 2, name: 'Semarang',         km: 350, lat: -6.9932, lng: 110.4203 },
  { corridor: 'Surabaya', idx: 3, name: 'Solo',             km: 450, lat: -7.5755, lng: 110.8243 },
  { corridor: 'Surabaya', idx: 4, name: 'Ngawi',            km: 550, lat: -7.4038, lng: 111.4502 },
  { corridor: 'Surabaya', idx: 5, name: 'Surabaya (Tujuan)',km: 750, lat: -7.2575, lng: 112.7521 },
  { corridor: 'Malang',   idx: 0, name: 'Bandung HQ',       km: 0,   lat: -6.9175, lng: 107.6191 },
  { corridor: 'Malang',   idx: 1, name: 'Cirebon',          km: 130, lat: -6.7320, lng: 108.5523 },
  { corridor: 'Malang',   idx: 2, name: 'Semarang',         km: 350, lat: -6.9932, lng: 110.4203 },
  { corridor: 'Malang',   idx: 3, name: 'Solo',             km: 450, lat: -7.5755, lng: 110.8243 },
  { corridor: 'Malang',   idx: 4, name: 'Surabaya',         km: 750, lat: -7.2575, lng: 112.7521 },
  { corridor: 'Malang',   idx: 5, name: 'Malang (Tujuan)',  km: 820, lat: -7.9839, lng: 112.6214 },
]

const DISTANCES: { from_node: string; to_node: string; km: number }[] = (() => {
  const m: Record<string, Record<string, number>> = {
    Bandung:  { Jakarta: 150, Surabaya: 750, Malang: 820 },
    Jakarta:  { Bandung: 150, Surabaya: 700, Malang: 780 },
    Surabaya: { Bandung: 750, Jakarta: 700, Malang: 90 },
    Malang:   { Bandung: 820, Jakarta: 780, Surabaya: 90 },
  }
  const out: { from_node: string; to_node: string; km: number }[] = []
  for (const from of Object.keys(m)) {
    for (const to of Object.keys(m[from])) {
      out.push({ from_node: from, to_node: to, km: m[from][to] })
    }
  }
  return out
})()

interface SeedOrder {
  id: string
  customer_id: string
  customer: string
  dest: string
  weight_ton: number
  length_m: number
  width_m: number
  height_m: number
  vol_m3: number
  notes: string
  status: 'pending' | 'confirmed' | 'in-transit' | 'delivered'
  delivery_outcome: 'on-time' | 'late' | null
  date: string
  vehicle: string | null
  route_plan_id: string | null
  legacyDriverId: string | null
}

const ORDERS: SeedOrder[] = [
  { id: 'PO-2026-001', customer_id: 'C01', customer: 'CV. Maju Bersama',     dest: 'Jakarta',  weight_ton: 3.2, length_m: 2.0, width_m: 1.8, height_m: 1.5, vol_m3: 5.40,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-03', vehicle: 'CDD Box',  route_plan_id: 'RP-001', legacyDriverId: 'D01' },
  { id: 'PO-2026-002', customer_id: 'C02', customer: 'PT. Sinar Abadi',      dest: 'Surabaya', weight_ton: 5.8, length_m: 2.5, width_m: 1.9, height_m: 2.1, vol_m3: 9.97,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-05', vehicle: 'CDD Box',  route_plan_id: 'RP-002', legacyDriverId: 'D02' },
  { id: 'PO-2026-003', customer_id: 'C03', customer: 'UD. Karya Mandiri',    dest: 'Malang',   weight_ton: 8.4, length_m: 3.0, width_m: 2.0, height_m: 2.0, vol_m3: 12.00, notes: '',         status: 'delivered',  delivery_outcome: 'late',    date: '2026-02-07', vehicle: 'Fuso Bak', route_plan_id: 'RP-003', legacyDriverId: 'D03' },
  { id: 'PO-2026-004', customer_id: 'C04', customer: 'PT. Global Nusantara', dest: 'Jakarta',  weight_ton: 1.5, length_m: 1.5, width_m: 1.2, height_m: 1.0, vol_m3: 1.80,  notes: 'Fragile',  status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-10', vehicle: 'CDE Box',  route_plan_id: 'RP-004', legacyDriverId: 'D01' },
  { id: 'PO-2026-005', customer_id: 'C05', customer: 'CV. Pratama Jaya',     dest: 'Surabaya', weight_ton: 7.2, length_m: 2.8, width_m: 2.0, height_m: 1.8, vol_m3: 10.08, notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-12', vehicle: 'Fuso Bak', route_plan_id: 'RP-005', legacyDriverId: 'D02' },
  { id: 'PO-2026-006', customer_id: 'C06', customer: 'PT. Mega Logistik',    dest: 'Malang',   weight_ton: 4.1, length_m: 2.2, width_m: 1.7, height_m: 1.6, vol_m3: 5.98,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-14', vehicle: 'CDD Box',  route_plan_id: 'RP-006', legacyDriverId: 'D03' },
  { id: 'PO-2026-007', customer_id: 'C07', customer: 'UD. Sejahtera',        dest: 'Jakarta',  weight_ton: 2.9, length_m: 1.8, width_m: 1.5, height_m: 1.5, vol_m3: 4.05,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-17', vehicle: 'CDD Box',  route_plan_id: 'RP-007', legacyDriverId: 'D01' },
  { id: 'PO-2026-008', customer_id: 'C08', customer: 'CV. Barokah Trans',    dest: 'Surabaya', weight_ton: 6.0, length_m: 2.6, width_m: 1.9, height_m: 2.0, vol_m3: 9.88,  notes: '',         status: 'delivered',  delivery_outcome: 'late',    date: '2026-02-19', vehicle: 'CDD Box',  route_plan_id: 'RP-008', legacyDriverId: 'D02' },
  { id: 'PO-2026-009', customer_id: 'C09', customer: 'PT. Indah Kargo',      dest: 'Malang',   weight_ton: 3.7, length_m: 2.1, width_m: 1.6, height_m: 1.7, vol_m3: 5.71,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-21', vehicle: 'CDD Box',  route_plan_id: 'RP-009', legacyDriverId: 'D03' },
  { id: 'PO-2026-010', customer_id: 'C10', customer: 'CV. Rimba Raya',       dest: 'Jakarta',  weight_ton: 5.5, length_m: 2.4, width_m: 1.8, height_m: 1.9, vol_m3: 8.21,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-24', vehicle: 'Fuso Bak', route_plan_id: 'RP-010', legacyDriverId: 'D01' },
  { id: 'PO-2026-011', customer_id: 'C11', customer: 'PT. Anugerah Mulia',   dest: 'Surabaya', weight_ton: 4.8, length_m: 2.3, width_m: 1.7, height_m: 1.8, vol_m3: 7.04,  notes: '',         status: 'delivered',  delivery_outcome: 'on-time', date: '2026-02-26', vehicle: 'CDD Box',  route_plan_id: 'RP-011', legacyDriverId: 'D02' },
  { id: 'PO-2026-012', customer_id: 'C12', customer: 'UD. Harapan Baru',     dest: 'Malang',   weight_ton: 9.2, length_m: 3.2, width_m: 2.1, height_m: 2.2, vol_m3: 14.78, notes: '',         status: 'delivered',  delivery_outcome: 'late',    date: '2026-02-28', vehicle: 'Fuso Bak', route_plan_id: 'RP-012', legacyDriverId: 'D03' },
  { id: 'PO-2026-013', customer_id: 'C13', customer: 'CV. Mitra Usaha',      dest: 'Jakarta',  weight_ton: 2.1, length_m: 1.6, width_m: 1.3, height_m: 1.2, vol_m3: 2.50,  notes: 'Fragile',  status: 'in-transit', delivery_outcome: null,      date: '2026-04-18', vehicle: 'CDE Box',  route_plan_id: 'RP-013', legacyDriverId: 'D01' },
  { id: 'PO-2026-014', customer_id: 'C14', customer: 'PT. Cakra Mandiri',    dest: 'Surabaya', weight_ton: 5.3, length_m: 2.4, width_m: 1.8, height_m: 1.9, vol_m3: 8.21,  notes: '',         status: 'in-transit', delivery_outcome: null,      date: '2026-04-19', vehicle: 'CDD Box',  route_plan_id: 'RP-014', legacyDriverId: 'D02' },
  { id: 'PO-2026-015', customer_id: 'C15', customer: 'UD. Terang Benderang', dest: 'Malang',   weight_ton: 7.8, length_m: 2.9, width_m: 2.0, height_m: 2.1, vol_m3: 12.18, notes: 'Priority', status: 'pending',    delivery_outcome: null,      date: '2026-04-21', vehicle: null,       route_plan_id: null,     legacyDriverId: null },
  { id: 'PO-2026-016', customer_id: 'C16', customer: 'CV. Bumi Lestari',     dest: 'Jakarta',  weight_ton: 3.6, length_m: 2.0, width_m: 1.6, height_m: 1.5, vol_m3: 4.80,  notes: '',         status: 'pending',    delivery_outcome: null,      date: '2026-04-21', vehicle: null,       route_plan_id: null,     legacyDriverId: null },
]

interface SeedPlan {
  id: string
  order_ids: string[]
  sequence: string[]
  vehicle: string
  total_weight: number
  total_vol: number
  distance: number
  savings: number
  status: 'draft' | 'confirmed' | 'in-transit' | 'delivered'
  confirmed_at: string
  weight_pct: number
  vol_pct: number
  legacyDriverId: string | null
}

const ROUTE_PLANS: SeedPlan[] = [
  { id: 'RP-001', order_ids: ['PO-2026-001'], sequence: ['Jakarta'],  vehicle: 'CDD Box',  total_weight: 3.2, total_vol: 5.40,  distance: 300,  savings: 0, status: 'delivered',  confirmed_at: '2026-02-02', weight_pct: 53,  vol_pct: 21, legacyDriverId: 'D01' },
  { id: 'RP-002', order_ids: ['PO-2026-002'], sequence: ['Surabaya'], vehicle: 'CDD Box',  total_weight: 5.8, total_vol: 9.97,  distance: 1500, savings: 0, status: 'delivered',  confirmed_at: '2026-02-04', weight_pct: 97,  vol_pct: 38, legacyDriverId: 'D02' },
  { id: 'RP-003', order_ids: ['PO-2026-003'], sequence: ['Malang'],   vehicle: 'Fuso Bak', total_weight: 8.4, total_vol: 12.00, distance: 1640, savings: 0, status: 'delivered',  confirmed_at: '2026-02-06', weight_pct: 53,  vol_pct: 6,  legacyDriverId: 'D03' },
  { id: 'RP-004', order_ids: ['PO-2026-004'], sequence: ['Jakarta'],  vehicle: 'CDE Box',  total_weight: 1.5, total_vol: 1.80,  distance: 300,  savings: 0, status: 'delivered',  confirmed_at: '2026-02-09', weight_pct: 38,  vol_pct: 10, legacyDriverId: 'D01' },
  { id: 'RP-005', order_ids: ['PO-2026-005'], sequence: ['Surabaya'], vehicle: 'Fuso Bak', total_weight: 7.2, total_vol: 10.08, distance: 1500, savings: 0, status: 'delivered',  confirmed_at: '2026-02-11', weight_pct: 45,  vol_pct: 5,  legacyDriverId: 'D02' },
  { id: 'RP-006', order_ids: ['PO-2026-006'], sequence: ['Malang'],   vehicle: 'CDD Box',  total_weight: 4.1, total_vol: 5.98,  distance: 1640, savings: 0, status: 'delivered',  confirmed_at: '2026-02-13', weight_pct: 68,  vol_pct: 23, legacyDriverId: 'D03' },
  { id: 'RP-007', order_ids: ['PO-2026-007'], sequence: ['Jakarta'],  vehicle: 'CDD Box',  total_weight: 2.9, total_vol: 4.05,  distance: 300,  savings: 0, status: 'delivered',  confirmed_at: '2026-02-16', weight_pct: 48,  vol_pct: 15, legacyDriverId: 'D01' },
  { id: 'RP-008', order_ids: ['PO-2026-008'], sequence: ['Surabaya'], vehicle: 'CDD Box',  total_weight: 6.0, total_vol: 9.88,  distance: 1500, savings: 0, status: 'delivered',  confirmed_at: '2026-02-18', weight_pct: 100, vol_pct: 38, legacyDriverId: 'D02' },
  { id: 'RP-009', order_ids: ['PO-2026-009'], sequence: ['Malang'],   vehicle: 'CDD Box',  total_weight: 3.7, total_vol: 5.71,  distance: 1640, savings: 0, status: 'delivered',  confirmed_at: '2026-02-20', weight_pct: 62,  vol_pct: 22, legacyDriverId: 'D03' },
  { id: 'RP-010', order_ids: ['PO-2026-010'], sequence: ['Jakarta'],  vehicle: 'Fuso Bak', total_weight: 5.5, total_vol: 8.21,  distance: 300,  savings: 0, status: 'delivered',  confirmed_at: '2026-02-23', weight_pct: 34,  vol_pct: 4,  legacyDriverId: 'D01' },
  { id: 'RP-011', order_ids: ['PO-2026-011'], sequence: ['Surabaya'], vehicle: 'CDD Box',  total_weight: 4.8, total_vol: 7.04,  distance: 1500, savings: 0, status: 'delivered',  confirmed_at: '2026-02-25', weight_pct: 80,  vol_pct: 27, legacyDriverId: 'D02' },
  { id: 'RP-012', order_ids: ['PO-2026-012'], sequence: ['Malang'],   vehicle: 'Fuso Bak', total_weight: 9.2, total_vol: 14.78, distance: 1640, savings: 0, status: 'delivered',  confirmed_at: '2026-02-27', weight_pct: 58,  vol_pct: 8,  legacyDriverId: 'D03' },
  { id: 'RP-013', order_ids: ['PO-2026-013'], sequence: ['Jakarta'],  vehicle: 'CDE Box',  total_weight: 2.1, total_vol: 2.50,  distance: 300,  savings: 0, status: 'in-transit', confirmed_at: '2026-04-17', weight_pct: 53,  vol_pct: 14, legacyDriverId: 'D01' },
  { id: 'RP-014', order_ids: ['PO-2026-014'], sequence: ['Surabaya'], vehicle: 'CDD Box',  total_weight: 5.3, total_vol: 8.21,  distance: 1500, savings: 0, status: 'in-transit', confirmed_at: '2026-04-18', weight_pct: 88,  vol_pct: 31, legacyDriverId: 'D02' },
]

const DRIVER_LOCATIONS: {
  legacyDriverId: string
  checkpoint_idx: number
  dest: string
  timestamp: string
  note: string
}[] = [
  { legacyDriverId: 'D01', checkpoint_idx: 2, dest: 'Jakarta',  timestamp: '2026-04-22 09:45', note: 'Melewati tol' },
  { legacyDriverId: 'D02', checkpoint_idx: 1, dest: 'Surabaya', timestamp: '2026-04-22 08:30', note: 'Berangkat dari Bandung' },
  { legacyDriverId: 'D03', checkpoint_idx: 0, dest: 'Malang',   timestamp: '2026-04-22 07:00', note: 'Belum berangkat' },
]

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

function emailFor(username: string): string {
  return `${username}@vros.local`
}

async function upsertAuthUser(sb: SupabaseClient, u: SeedUser): Promise<string> {
  const email = emailFor(u.username)

  // Lookup existing by email
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) throw listErr

  const existing = list.users.find((x) => x.email === email)
  if (existing) {
    console.log(`  ↺ auth user exists: ${email} (${existing.id})`)
    // Reset password to seed password to keep demo creds consistent
    await sb.auth.admin.updateUserById(existing.id, { password: u.password })
    return existing.id
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: u.password,
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('createUser returned no user')
  console.log(`  + auth user created: ${email} (${data.user.id})`)
  return data.user.id
}

async function truncate(table: string) {
  // Delete rows (respecting FKs via order of calls from caller)
  const { error } = await sb.from(table).delete().not('id', 'is', null).limit(10000)
  if (error && error.code !== 'PGRST116') throw error
}

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('▶ Seeding Supabase at', url)

  // 1. Wipe transactional + profile tables (respect FK order)
  console.log('▶ Clearing existing data…')
  await sb.from('driver_locations').delete().not('driver_id', 'is', null)
  await sb.from('orders').delete().not('id', 'is', null)
  // Null out users.assigned_plan_id first to break cycle with route_plans
  await sb.from('users').update({ assigned_plan_id: null }).not('id', 'is', null)
  await sb.from('route_plans').delete().not('id', 'is', null)
  await sb.from('users').delete().not('id', 'is', null)
  await sb.from('customers').delete().not('id', 'is', null)
  await sb.from('vehicles').delete().not('id', 'is', null)
  await sb.from('checkpoints').delete().not('corridor', 'is', null)
  await sb.from('distances_matrix').delete().not('from_node', 'is', null)

  // 2. Master data (no FKs needed yet)
  console.log('▶ Customers…')
  const { error: custErr } = await sb.from('customers').insert(CUSTOMERS)
  if (custErr) throw custErr

  console.log('▶ Vehicles…')
  const { error: vehErr } = await sb.from('vehicles').insert(VEHICLES)
  if (vehErr) throw vehErr

  console.log('▶ Checkpoints…')
  const { error: cpErr } = await sb.from('checkpoints').insert(CHECKPOINTS)
  if (cpErr) throw cpErr

  console.log('▶ Distances matrix…')
  const { error: dmErr } = await sb.from('distances_matrix').insert(DISTANCES)
  if (dmErr) throw dmErr

  // 3. Users (auth + profile). Build legacy → UUID map.
  console.log('▶ Users (auth + profile)…')
  const legacyToUuid = new Map<string, string>()
  for (const u of USERS) {
    const uid = await upsertAuthUser(sb, u)
    legacyToUuid.set(u.legacyId, uid)
  }

  const usersRows = USERS.map((u) => ({
    id: legacyToUuid.get(u.legacyId)!,
    username: u.username,
    name: u.name,
    role: u.role,
    dept: u.dept ?? null,
    customer_id: u.customerId ?? null,
    vehicle_id: null,                // not meaningfully used
    assigned_plan_id: null,          // set later after route_plans exist
  }))
  const { error: uErr } = await sb.from('users').insert(usersRows)
  if (uErr) throw uErr

  // 4. Route plans (driver_id is UUID)
  console.log('▶ Route plans…')
  const plansRows = ROUTE_PLANS.map((p) => ({
    id: p.id,
    order_ids: p.order_ids,
    sequence: p.sequence,
    vehicle: p.vehicle,
    total_weight: p.total_weight,
    total_vol: p.total_vol,
    distance: p.distance,
    savings: p.savings,
    status: p.status,
    confirmed_at: p.confirmed_at,
    weight_pct: p.weight_pct,
    vol_pct: p.vol_pct,
    driver_id: p.legacyDriverId ? legacyToUuid.get(p.legacyDriverId) ?? null : null,
  }))
  const { error: pErr } = await sb.from('route_plans').insert(plansRows)
  if (pErr) throw pErr

  // 5. Orders (driver_id UUID; also reference route_plan_id)
  console.log('▶ Orders…')
  // Seed assumes single product + single packaging per order — per-unit values
  // mirror the stored totals. Real PT. PIL workflow will populate per-unit
  // breakdown via the Create Delivery Order form.
  const ordersRows = ORDERS.map((o) => ({
    id: o.id,
    customer_id: o.customer_id,
    customer: o.customer,
    dest: o.dest,
    weight_ton: o.weight_ton,
    length_m: o.length_m,
    width_m: o.width_m,
    height_m: o.height_m,
    vol_m3: o.vol_m3,
    weight_per_product_kg: Math.round(o.weight_ton * 1000),
    quantity: 1,
    length_per_pkg_m: o.length_m,
    width_per_pkg_m: o.width_m,
    height_per_pkg_m: o.height_m,
    total_packaging: 1,
    notes: o.notes,
    status: o.status,
    delivery_outcome: o.delivery_outcome,
    date: o.date,
    vehicle: o.vehicle,
    route_plan_id: o.route_plan_id,
    driver_id: o.legacyDriverId ? legacyToUuid.get(o.legacyDriverId) ?? null : null,
  }))
  const { error: oErr } = await sb.from('orders').insert(ordersRows)
  if (oErr) throw oErr

  // 6. Back-fill users.assigned_plan_id now that route_plans exist.
  console.log('▶ Back-filling assigned_plan_id on drivers…')
  for (const u of USERS) {
    if (!u.assignedPlanId) continue
    const uid = legacyToUuid.get(u.legacyId)!
    const { error } = await sb.from('users').update({ assigned_plan_id: u.assignedPlanId }).eq('id', uid)
    if (error) throw error
  }

  // 7. Driver locations
  console.log('▶ Driver locations…')
  const dlocRows = DRIVER_LOCATIONS.map((d) => ({
    driver_id: legacyToUuid.get(d.legacyDriverId)!,
    checkpoint_idx: d.checkpoint_idx,
    dest: d.dest,
    timestamp: d.timestamp,
    note: d.note,
  }))
  const { error: dErr } = await sb.from('driver_locations').insert(dlocRows)
  if (dErr) throw dErr

  console.log('\n✅ Seed complete.')
  console.log('\nDemo credentials:')
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(9)} ${u.username.padEnd(22)} → ${u.password}`)
  }
}

main().catch((e) => {
  console.error('\n❌ Seed failed:', e)
  process.exit(1)
})
