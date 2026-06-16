import { LayoutDashboard, Package, Users, Settings, Bell, LogOut, Menu, X, ArrowLeft, ShoppingBag } from '../components/icons'

export interface AdminNavItem {
  label: string
  path: string
  icon: React.FC<{ className?: string }>
}

export const adminNavItems: AdminNavItem[] = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Data Packages', path: '/admin/packages', icon: Package },
  { label: 'Site Settings', path: '/admin/settings', icon: Settings },
  { label: 'Notifications', path: '/admin/notifications', icon: Bell },
]

export { LogOut, Menu, X, ArrowLeft }
