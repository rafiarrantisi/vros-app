// Wipe demo data — siap untuk klien input data real PT. PIL.
//
// Yang DI-CLEAR:
//   - orders (semua purchase order demo)
//   - route_plans (semua rute hasil CVRP demo)
//   - driver_locations (semua posisi supir demo)
//   - customers (semua master pelanggan demo)
//   - 5 auth account customer demo (cv.majubersama, pt.sinarabadi, dst)
//
// Yang DI-KEEP:
//   - vehicles (4 armada Isuzu, dari spec proposal PT. PIL)
//   - checkpoints (18 titik singgah, fakta geografis)
//   - distances_matrix (12 jarak antar kota, gak berubah)
//   - users: 2 manager, 1 admin, 3 driver (klien edit/rename via Admin > User Accounts)
//
// Run: npx tsx supabase/wipe.ts

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(process.cwd(), '.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } })

async function countRows(table: string): Promise<number> {
  const { count } = await sb.from(table).select('*', { count: 'exact', head: true })
  return count ?? 0
}

async function main() {
  console.log(`▶ Wiping demo data at ${URL}\n`)

  console.log('Sebelum wipe:')
  for (const t of [
    'orders',
    'route_plans',
    'driver_locations',
    'customers',
    'vehicles',
    'checkpoints',
    'users',
  ]) {
    console.log(`  ${t.padEnd(20)} ${await countRows(t)} rows`)
  }

  console.log('\n▶ 1. Driver locations…')
  // No FK ke tabel lain dalam scope wipe, hapus duluan biar aman.
  const { error: dlocErr } = await sb
    .from('driver_locations')
    .delete()
    .not('driver_id', 'is', null)
  if (dlocErr) throw dlocErr

  console.log('▶ 2. Orders…')
  // Orders punya FK ke customers + route_plans, jadi hapus orders dulu sebelum
  // tabel-tabel itu.
  const { error: ordErr } = await sb.from('orders').delete().not('id', 'is', null)
  if (ordErr) throw ordErr

  console.log('▶ 3. Route plans…')
  // Sekarang gak ada orders yang refer route_plans, aman dihapus.
  // Sebelum delete, perlu null-kan users.assigned_plan_id supaya FK gak protest.
  const { error: clearAssignErr } = await sb
    .from('users')
    .update({ assigned_plan_id: null })
    .not('assigned_plan_id', 'is', null)
  if (clearAssignErr) throw clearAssignErr
  const { error: planErr } = await sb.from('route_plans').delete().not('id', 'is', null)
  if (planErr) throw planErr

  console.log('▶ 4. Customer auth accounts (5 akun demo)…')
  // Ambil semua user dengan role customer, hapus auth.users-nya. Cascade
  // akan otomatis hapus row di public.users (FK on delete cascade).
  const { data: customerUsers, error: custUserErr } = await sb
    .from('users')
    .select('id, username')
    .eq('role', 'customer')
  if (custUserErr) throw custUserErr
  for (const u of customerUsers ?? []) {
    const { error: delAuthErr } = await sb.auth.admin.deleteUser(u.id)
    if (delAuthErr) throw new Error(`Delete auth user ${u.username}: ${delAuthErr.message}`)
    console.log(`  ✓ deleted auth user: ${u.username}`)
  }

  console.log('▶ 5. Customers master…')
  // Setelah auth customer accounts gone, users.customer_id FK gak nge-block lagi
  // (semua customer auth udah ke-hapus, sisa user role lain customer_id null).
  // Tapi safety: nullify any remaining customer_id reference.
  const { error: clearCustIdErr } = await sb
    .from('users')
    .update({ customer_id: null })
    .not('customer_id', 'is', null)
  if (clearCustIdErr) throw clearCustIdErr
  const { error: custErr } = await sb.from('customers').delete().not('id', 'is', null)
  if (custErr) throw custErr

  console.log('\nSesudah wipe:')
  for (const t of [
    'orders',
    'route_plans',
    'driver_locations',
    'customers',
    'vehicles',
    'checkpoints',
    'users',
  ]) {
    console.log(`  ${t.padEnd(20)} ${await countRows(t)} rows`)
  }

  console.log('\n✅ Wipe complete.\n')
  console.log('Akun yang masih bisa login:')
  const { data: remainingUsers } = await sb
    .from('users')
    .select('username, role, name')
    .order('role', { ascending: true })
    .order('username', { ascending: true })
  for (const u of remainingUsers ?? []) {
    console.log(`  ${u.role.padEnd(10)} ${u.username.padEnd(20)} (${u.name})`)
  }
  console.log('\nKlien bisa langsung login dan mulai input data real.')
}

main().catch((e) => {
  console.error('\n❌ Wipe FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})
