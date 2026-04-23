# VROS — Vehicle Routing Optimization System

Capstone freelance project untuk **PT. Pindad International Logistic (PT. PIL)**. Port dari single-page React + CDN prototype (`Telkom/VROS v3.html`) ke **Next.js 15 + Supabase** stack, di-deploy via Vercel. Scope: capstone demo / sidang — bukan production PT. PIL.

Algoritma utama: **Clarke-Wright Savings + brute-force TSP** untuk vehicle routing dengan 3 koridor (Bandung → Jakarta / Surabaya / Malang).

---

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **Supabase** — Postgres + Auth + Realtime
- **TypeScript** strict
- **No CSS framework** — inline styles (pixel-match dengan v3 design)
- **Deployment**: Vercel + Supabase hosted

---

## Demo Accounts

Auth pakai synthetic email `${username}@vros.local`. Semua password di-seed lewat `supabase/seed.ts`.

| Role     | Username         | Password   | Landing                |
| -------- | ---------------- | ---------- | ---------------------- |
| Manager  | `manager01`      | `mgr123`   | `/manager/dashboard`   |
| Admin    | `admin01`        | `admin123` | `/admin/accounts`      |
| Customer | `cv.mitausaha`   | `cust123`  | `/customer`            |
| Driver   | `driver01`       | `drv123`   | `/driver`              |

Daftar lengkap di `supabase/seed.ts`.

---

## Local Development

```bash
# 1. Install deps
npm install

# 2. Copy env template & isi credentials
cp .env.local.example .env.local
# edit .env.local, isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Apply migrations ke Supabase project
#    (via Supabase dashboard SQL Editor, paste supabase/migrations/0001_init.sql)

# 4. Seed data
npm run seed

# 5. Start dev server
npm run dev
```

Buka http://localhost:3000 — login dengan salah satu demo account.

---

## Route Map

**Manager & Admin** (pakai sidebar + topbar, group `(app)`):
- `/manager/dashboard` — KPI overview
- `/manager/orders` — Order management
- `/manager/optimizer` — Run CVRP, confirm route plans
- `/manager/delivery` — Ongoing deliveries
- `/manager/plans` — Plan history
- `/manager/reports-{performance,utilization,distance}`
- `/admin/{accounts,vehicles,customers,distances}` — Master data CRUD

**Portal** (full-screen, no sidebar, group `(portal)`):
- `/customer` — Tabs: My Orders + Track Driver (Realtime)
- `/driver` — Tabs: My Route + Update Location

**Auth** (group `(auth)`):
- `/login`

---

## Architecture Notes

- **RLS policies** enforce AC-10 (customer sees own orders only) + AC-12 (driver sees own route plan only). See `supabase/migrations/0001_init.sql`.
- **CVRP algorithm** is a pure function in `lib/cvrp.ts`, called server-side by `app/api/optimize/route.ts`.
- **Admin user CRUD** bypasses RLS via service-role client in `app/api/admin/users/route.ts` — required because `auth.users` can only be written via `supabase.auth.admin`.
- **Realtime**: customer portal subscribes ke `driver_locations` via Supabase `postgres_changes` channel — replaces 5s polling yang ada di v3.
- **Frozen `TODAY = '2026-04-22'`** di `lib/constants.ts` biar narrative seed data (Feb–Apr 2026) konsisten.

---

## Manual Smoke Test

Capstone scope — no automated tests. Smoke-test checklist:

| # | Step | Expected |
|---|------|----------|
| 1 | Login `manager01/mgr123` | Landing di `/manager/dashboard`, KPI 81% on-time |
| 2 | Login `admin01/admin123` | Landing di `/admin/accounts` |
| 3 | Login `cv.mitausaha/cust123` | Customer portal, orders cuma yang `customer_id = 'C01'` |
| 4 | Login `driver01/drv123` | Driver portal, plan `RP-013` (milik D01), plan lain blocked |
| 5 | Manager → Optimizer → run CVRP dengan 2 pending orders → Confirm | Row baru di `route_plans`, orders ganti ke `confirmed` |
| 6 | Driver update location di browser A | Customer portal di browser B update realtime (no refresh) |
| 7 | Customer login, browser console `supabase.from('orders').select('*')` | Return rows dengan `customer_id` matching aja (RLS enforce) |
| 8 | Compare CVRP output vs v3 (`Telkom/VROS v3.html`) untuk order set yang sama | Route distance match (±1% deterministic) |

---

## Deployment

- **GitHub**: https://github.com/rafiarrantisi/vros-app
- **Vercel**: import repo, set 3 env vars dari `.env.local.example`, auto-deploy on push ke `master`
- **Supabase**: project di-create manual, migration + seed dijalankan sekali setup

See `docs/deployment.md` (jika ada) atau buka issue kalau ada masalah.

---

## Reference: Original v3 Design

File sumber tersimpan di `../Telkom/` (sibling folder, di-exclude dari repo ini):
- `VROS v3.html` — single-page React app original
- `vros_data.js` — seed data (9 arrays) + 6 algorithms
- `vros_shared.jsx` — 11 UI primitives
- `vros_{staff,manager,customer,driver,admin}.jsx` — page components

Useful buat compare visual pixel-match + algorithm output parity.
