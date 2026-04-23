-- VROS initial schema + RLS policies
-- Run via Supabase SQL Editor (one-shot) or `supabase db push`.

-- ═══════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════

create type user_role as enum ('manager', 'admin', 'customer', 'driver');
create type order_status as enum ('pending', 'confirmed', 'in-transit', 'delivered');
create type delivery_outcome as enum ('on-time', 'late');
create type plan_status as enum ('draft', 'confirmed', 'in-transit', 'delivered');

-- ═══════════════════════════════════════════════════════════════════
-- USERS (profile; 1:1 with auth.users)
-- ═══════════════════════════════════════════════════════════════════

create table users (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  name text not null,
  role user_role not null,
  dept text,
  customer_id text,         -- FK added after customers table
  vehicle_id text,          -- FK added after vehicles table
  assigned_plan_id text,    -- FK added after route_plans table
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- MASTER DATA
-- ═══════════════════════════════════════════════════════════════════

create table customers (
  id text primary key,       -- 'C01'..'C16'
  name text not null,
  dest text not null,        -- 'Jakarta' | 'Surabaya' | 'Malang'
  contact text
);

alter table users
  add constraint users_customer_fk foreign key (customer_id) references customers(id);

create table vehicles (
  id text primary key,       -- 'V01'..'V04'
  type text not null,        -- 'Towing', 'CDD Box', 'Fuso Bak', 'CDE Box'
  brand text,
  year int,
  units int not null,
  max_weight numeric not null,  -- tons
  max_vol numeric not null,     -- m3
  tire int,
  length numeric,
  width numeric,
  height numeric,
  available int not null
);

alter table users
  add constraint users_vehicle_fk foreign key (vehicle_id) references vehicles(id);

create table checkpoints (
  corridor text not null,    -- 'Jakarta' | 'Surabaya' | 'Malang'
  idx int not null,          -- 0..5
  name text not null,
  km numeric not null,
  lat numeric,
  lng numeric,
  primary key (corridor, idx)
);

create table distances_matrix (
  from_node text not null,   -- 'Bandung' | 'Jakarta' | 'Surabaya' | 'Malang'
  to_node text not null,
  km int not null,
  primary key (from_node, to_node)
);

-- ═══════════════════════════════════════════════════════════════════
-- TRANSACTIONAL
-- ═══════════════════════════════════════════════════════════════════

create table route_plans (
  id text primary key,                  -- 'RP-001'
  order_ids text[] not null,
  sequence text[] not null,             -- optimal stop order from brute force
  vehicle text not null,
  total_weight numeric not null,
  total_vol numeric not null,
  distance int not null,
  savings int not null default 0,
  status plan_status not null default 'draft',
  confirmed_at text,
  confirmed_by text,
  weight_pct int,
  vol_pct int,
  driver_id uuid references users(id),
  created_at timestamptz not null default now()
);

alter table users
  add constraint users_plan_fk foreign key (assigned_plan_id) references route_plans(id);

create table orders (
  id text primary key,                  -- 'PO-2026-001'
  customer_id text not null references customers(id),
  customer text not null,               -- denormalized (UI convenience)
  dest text not null,
  weight_ton numeric not null,
  length_m numeric,
  width_m numeric,
  height_m numeric,
  vol_m3 numeric,
  notes text,
  status order_status not null default 'pending',
  delivery_outcome delivery_outcome,
  date text not null,                   -- 'YYYY-MM-DD'
  vehicle text,
  route_plan_id text references route_plans(id),
  driver_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index orders_customer_idx on orders (customer_id);
create index orders_plan_idx on orders (route_plan_id);
create index orders_driver_idx on orders (driver_id);
create index plans_driver_idx on route_plans (driver_id);

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME (driver location push)
-- ═══════════════════════════════════════════════════════════════════

create table driver_locations (
  driver_id uuid primary key references users(id),
  checkpoint_idx int not null,
  dest text not null,
  timestamp text not null,
  note text,
  updated_at timestamptz not null default now()
);

-- Publish to Supabase Realtime
alter publication supabase_realtime add table driver_locations;

-- ═══════════════════════════════════════════════════════════════════
-- RLS HELPERS
-- ═══════════════════════════════════════════════════════════════════

-- Avoid shadowing pg_catalog.current_role — namespace our function.
create or replace function app_role() returns user_role
  language sql stable security definer set search_path = public
as $$
  select role from users where id = auth.uid()
$$;

create or replace function app_customer_id() returns text
  language sql stable security definer set search_path = public
as $$
  select customer_id from users where id = auth.uid()
$$;

-- ═══════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════

alter table users enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table checkpoints enable row level security;
alter table distances_matrix enable row level security;
alter table orders enable row level security;
alter table route_plans enable row level security;
alter table driver_locations enable row level security;

-- ── USERS ─────────────────────────────────────────────────────────
-- Everyone reads their own profile; manager/admin read all.
create policy users_read_self on users for select
  using (id = auth.uid() or app_role() in ('manager', 'admin'));

create policy users_admin_write on users for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ── CUSTOMERS (master data) ───────────────────────────────────────
-- All authenticated users can read; only admin writes.
create policy customers_read on customers for select
  using (auth.uid() is not null);

create policy customers_admin_write on customers for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ── VEHICLES (master data) ────────────────────────────────────────
create policy vehicles_read on vehicles for select
  using (auth.uid() is not null);

create policy vehicles_admin_write on vehicles for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ── CHECKPOINTS (master data, effectively static) ─────────────────
create policy checkpoints_read on checkpoints for select
  using (auth.uid() is not null);

create policy checkpoints_admin_write on checkpoints for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ── DISTANCES MATRIX ──────────────────────────────────────────────
create policy distances_read on distances_matrix for select
  using (auth.uid() is not null);

create policy distances_admin_write on distances_matrix for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- ── ORDERS (AC-10: customer sees only own) ────────────────────────
create policy orders_read on orders for select
  using (
    app_role() in ('manager', 'admin')
    or (app_role() = 'customer' and customer_id = app_customer_id())
    or (app_role() = 'driver' and driver_id = auth.uid())
  );

create policy orders_mgr_write on orders for all
  using (app_role() in ('manager', 'admin'))
  with check (app_role() in ('manager', 'admin'));

-- ── ROUTE PLANS (AC-12: driver sees only own) ─────────────────────
create policy plans_read on route_plans for select
  using (
    app_role() in ('manager', 'admin', 'customer')
    or (app_role() = 'driver' and driver_id = auth.uid())
  );

create policy plans_mgr_write on route_plans for all
  using (app_role() in ('manager', 'admin'))
  with check (app_role() in ('manager', 'admin'));

-- ── DRIVER LOCATIONS ──────────────────────────────────────────────
-- Anyone authenticated reads (needed for customer tracking);
-- Only the driver in question can upsert own row.
create policy dloc_read on driver_locations for select
  using (auth.uid() is not null);

create policy dloc_self_write on driver_locations for all
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());
