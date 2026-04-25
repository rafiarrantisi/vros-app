-- VROS Revision Round 1 — orders table per-product + per-packaging breakdown
-- Adds 6 columns so the Create Delivery Order form matches PT. PIL workflow:
--   weight_per_product_kg × quantity         = total weight (stored as weight_ton)
--   length × width × height × total_packaging = total volume (stored as vol_m3)
-- Existing rows are backfilled with quantity = 1 + total_packaging = 1 (one
-- product per order, dimensions equal per-package = stored).

-- ═══════════════════════════════════════════════════════════════════
-- Add per-unit columns (nullable initially, backfill, then enforce NOT NULL)
-- ═══════════════════════════════════════════════════════════════════
alter table orders add column if not exists weight_per_product_kg numeric;
alter table orders add column if not exists quantity int default 1;
alter table orders add column if not exists length_per_pkg_m numeric;
alter table orders add column if not exists width_per_pkg_m numeric;
alter table orders add column if not exists height_per_pkg_m numeric;
alter table orders add column if not exists total_packaging int default 1;

-- ═══════════════════════════════════════════════════════════════════
-- Backfill 16 existing orders: assume 1 product + 1 package per order,
-- per-unit dimension equals stored total dimension.
-- ═══════════════════════════════════════════════════════════════════
update orders set
  weight_per_product_kg = round(weight_ton * 1000),
  quantity = 1,
  length_per_pkg_m = length_m,
  width_per_pkg_m = width_m,
  height_per_pkg_m = height_m,
  total_packaging = 1
where weight_per_product_kg is null;

-- ═══════════════════════════════════════════════════════════════════
-- Enforce NOT NULL on the new columns now that backfill is complete.
-- ═══════════════════════════════════════════════════════════════════
alter table orders alter column weight_per_product_kg set not null;
alter table orders alter column quantity set not null;
alter table orders alter column length_per_pkg_m set not null;
alter table orders alter column width_per_pkg_m set not null;
alter table orders alter column height_per_pkg_m set not null;
alter table orders alter column total_packaging set not null;

-- weight_ton + vol_m3 remain regular columns (NOT generated). The Create
-- Delivery Order form is the single source of truth — it computes both the
-- per-unit values and the totals in one submit. CVRP keeps reading
-- weight_ton/vol_m3 unchanged.
