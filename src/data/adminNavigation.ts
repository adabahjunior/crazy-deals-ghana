import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ShoppingBag,
  Tag,
  UserPlus,
  Wallet,
  MoreHorizontal,
} from '../components/icons'

export interface AdminNavItem {
  label: string
  path: string
  icon: React.FC<{ className?: string }>
}

export const adminMainNav: AdminNavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
]

export const adminSystemNav: AdminNavItem[] = [
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Sub-Agents', path: '/admin/sub-agents', icon: UserPlus },
  { label: 'Withdrawals', path: '/admin/withdrawals', icon: Wallet },
  { label: 'Promo Codes', path: '/admin/promo-codes', icon: Tag },
  { label: 'Data Packages', path: '/admin/packages', icon: Package },
  { label: 'Site Settings', path: '/admin/settings', icon: Settings },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
]

export const adminNavItems: AdminNavItem[] = [...adminMainNav, ...adminSystemNav]

export const adminMobileNav: AdminNavItem[] = [
  { label: 'Home', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Packages', path: '/admin/packages', icon: Package },
  { label: 'More', path: '/admin/settings', icon: MoreHorizontal },
]

export { LogOut, Menu, X, ArrowLeft }
