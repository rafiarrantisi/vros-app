// Navigation config — ported from Telkom/VROS v3.html NAV + PAGE_TITLES.
// v3 used page keys ('dashboard', 'mgr_hist', etc.) — here we map to App Router paths.

import type { IconName } from '@/components/Icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  section: string
  title: string // shown in TopBar
}

export const MANAGER_NAV: readonly NavItem[] = [
  {
    href: '/manager/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    section: 'Operations',
    title: 'Dashboard',
  },
  {
    href: '/manager/orders',
    label: 'Delivery Orders',
    icon: 'order',
    section: 'Operations',
    title: 'Delivery Orders',
  },
  {
    href: '/manager/optimizer',
    label: 'Route Optimizer',
    icon: 'optimize',
    section: 'Operations',
    title: 'Route Optimizer — CVRP',
  },
  {
    href: '/manager/delivery',
    label: 'Delivery Status',
    icon: 'status',
    section: 'Operations',
    title: 'Delivery Status Update',
  },
  {
    href: '/manager/tracking',
    label: 'Live Tracking',
    icon: 'truck',
    section: 'Operations',
    title: 'Live Driver Tracking',
  },
  {
    href: '/manager/plans',
    label: 'Plan History',
    icon: 'history',
    section: 'Reports',
    title: 'Routing Plan History',
  },
  {
    href: '/manager/reports-performance',
    label: 'Performance Report',
    icon: 'report',
    section: 'Reports',
    title: 'Delivery Performance Report',
  },
  {
    href: '/manager/reports-utilization',
    label: 'Utilization Report',
    icon: 'util',
    section: 'Reports',
    title: 'Vehicle Utilization Report',
  },
  {
    href: '/manager/reports-distance',
    label: 'Distance Report',
    icon: 'distance',
    section: 'Reports',
    title: 'Route Distance Report',
  },
]

export const ADMIN_NAV: readonly NavItem[] = [
  {
    href: '/admin/accounts',
    label: 'User Accounts',
    icon: 'users',
    section: 'Access',
    title: 'User Account Management',
  },
  {
    href: '/admin/vehicles',
    label: 'Vehicle Master',
    icon: 'fleet',
    section: 'Master Data',
    title: 'Vehicle Master Data',
  },
  {
    href: '/admin/customers',
    label: 'Customer Master',
    icon: 'order',
    section: 'Master Data',
    title: 'Customer Master Data',
  },
  {
    href: '/admin/distances',
    label: 'Distance Matrix',
    icon: 'map',
    section: 'Master Data',
    title: 'Route Distance Matrix',
  },
]

export function navFor(role: 'manager' | 'admin'): readonly NavItem[] {
  return role === 'admin' ? ADMIN_NAV : MANAGER_NAV
}

export function titleFor(pathname: string): string {
  const all = [...MANAGER_NAV, ...ADMIN_NAV]
  return all.find((n) => n.href === pathname)?.title ?? ''
}
