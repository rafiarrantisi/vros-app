// Capacitated Vehicle Routing Problem — Clarke-Wright Savings + brute-force TSP
//
// Ported verbatim from Telkom/vros_data.js window.VROS.* into pure functions.
// All dependencies (distance matrix, vehicle fleet) are injected — zero I/O,
// zero globals. Deterministic output for a given input.
//
// Pipeline:
//   runCVRP(orders, vehicles, matrix)
//     ├─ build initial 1-order routes, assign smallest fitting vehicle
//     ├─ compute pairwise savings s(i,j) = d(0,i) + d(0,j) − d(i,j)
//     ├─ greedily merge by highest savings (capacity-feasible only)
//     └─ for each merged route → brute-force optimal stop sequence
//
// Brute-force is tractable because merged routes have ≤ 3 unique destinations
// (Jakarta / Surabaya / Malang). Worst case 3! = 6 permutations per route.

import { DEPOT } from './constants'
import type { DistMatrix, Order, RoutePlanDraft, Vehicle } from './types'

// ── Primitives ────────────────────────────────────────────────────────

export function getDist(matrix: DistMatrix, from: string, to: string): number {
  if (from === to) return 0
  return matrix[from]?.[to] ?? 0
}

export function permutations<T>(arr: readonly T[]): T[][] {
  if (arr.length <= 1) return [arr.slice()]
  const result: T[][] = []
  arr.forEach((v, i) => {
    const rest = arr.filter((_, j) => j !== i)
    permutations(rest).forEach((p) => result.push([v, ...p]))
  })
  return result
}

export function calcRouteDist(
  matrix: DistMatrix,
  stops: readonly string[],
  depot: string = DEPOT,
): number {
  if (!stops.length) return 0
  let d = getDist(matrix, depot, stops[0])
  for (let i = 1; i < stops.length; i++) {
    d += getDist(matrix, stops[i - 1], stops[i])
  }
  d += getDist(matrix, stops[stops.length - 1], depot)
  return d
}

export function bruteForceSequence(
  matrix: DistMatrix,
  stops: readonly string[],
): { sequence: string[]; distance: number } {
  if (stops.length <= 1) {
    return { sequence: stops.slice(), distance: calcRouteDist(matrix, stops) }
  }
  const perms = permutations(stops)
  let best = perms[0]
  let bestD = Infinity
  for (const p of perms) {
    const d = calcRouteDist(matrix, p)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return { sequence: best, distance: bestD }
}

export function assignVehicle(
  vehicles: readonly Vehicle[],
  weight: number,
  vol: number,
): Vehicle | null {
  const sorted = [...vehicles].sort((a, b) => a.max_weight - b.max_weight)
  return sorted.find((v) => v.max_weight >= weight && v.max_vol >= vol) ?? null
}

// ── Main entry ────────────────────────────────────────────────────────

interface WorkingRoute {
  orders: Order[]
  weight: number
  vol: number
  vehicle: Vehicle | null
  stops: string[]
  savings: number
}

/**
 * Run CVRP against a batch of pending orders.
 *
 * Returns one draft per merged route. Orders that can't be assigned a vehicle
 * (too heavy / bulky for the largest fleet entry) are dropped silently — match
 * v3 behavior. Caller should filter `orders` to status='pending' upstream.
 */
export function runCVRP(
  orders: readonly Order[],
  vehicles: readonly Vehicle[],
  matrix: DistMatrix,
): RoutePlanDraft[] {
  if (orders.length === 0) return []

  // 1. Seed: one route per order, smallest fitting vehicle.
  const routes: Array<WorkingRoute | null> = orders.map((o) => {
    const weight = Number(o.weight_ton) || 0
    const vol = Number(o.vol_m3) || 0
    return {
      orders: [o],
      weight,
      vol,
      vehicle: assignVehicle(vehicles, weight, vol),
      stops: [o.dest],
      savings: 0,
    }
  })

  // 2. Pairwise savings s(i,j) = d(depot,i) + d(depot,j) − d(i,j)
  const savings: Array<{ i: number; j: number; s: number }> = []
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const di = routes[i]!.orders[0].dest
      const dj = routes[j]!.orders[0].dest
      const s =
        getDist(matrix, DEPOT, di) +
        getDist(matrix, DEPOT, dj) -
        getDist(matrix, di, dj)
      savings.push({ i, j, s })
    }
  }
  savings.sort((a, b) => b.s - a.s)

  // 3. Greedy merge — highest savings first, capacity-feasible only.
  const routeOf = routes.map((_, i) => i) // order-index → current route slot
  for (const { i, j } of savings) {
    const ri = routeOf[i]
    const rj = routeOf[j]
    if (ri === rj) continue
    const a = routes[ri]
    const b = routes[rj]
    if (!a || !b) continue

    const mergedWeight = a.weight + b.weight
    const mergedVol = a.vol + b.vol
    const v = assignVehicle(vehicles, mergedWeight, mergedVol)
    if (!v) continue

    const mergedOrders = [...a.orders, ...b.orders]
    const stops = Array.from(new Set(mergedOrders.map((o) => o.dest)))

    routes[ri] = {
      orders: mergedOrders,
      weight: mergedWeight,
      vol: mergedVol,
      vehicle: v,
      stops,
      savings: a.savings + b.savings + Math.max(0, savings.find((x) => x.i === i && x.j === j)!.s),
    }
    routes[rj] = null

    // Rewire any order that previously pointed at rj → ri
    for (let k = 0; k < routeOf.length; k++) {
      if (routeOf[k] === rj) routeOf[k] = ri
    }
  }

  // 4. Finalize: brute-force optimal stop sequence per surviving route.
  let draftIdx = 0
  const drafts: RoutePlanDraft[] = []
  for (const r of routes) {
    if (!r || !r.vehicle) continue
    const { sequence, distance } = bruteForceSequence(matrix, r.stops)
    draftIdx += 1
    drafts.push({
      id: `RP-DRAFT-${draftIdx}`,
      orderIds: r.orders.map((o) => o.id),
      sequence,
      vehicle: r.vehicle.type,
      totalWeight: Number(r.weight.toFixed(2)),
      totalVol: Number(r.vol.toFixed(2)),
      distance,
      savings: r.savings,
      weightPct: Math.round((r.weight / r.vehicle.max_weight) * 100),
      volPct: Math.round((r.vol / r.vehicle.max_vol) * 100),
      status: 'draft',
    })
  }
  return drafts
}

// ── Helper: reshape distances_matrix rows into nested DistMatrix ──────

export function toMatrix(rows: ReadonlyArray<{ from_node: string; to_node: string; km: number }>): DistMatrix {
  const m: DistMatrix = {}
  for (const row of rows) {
    if (!m[row.from_node]) m[row.from_node] = {}
    m[row.from_node][row.to_node] = row.km
  }
  return m
}
