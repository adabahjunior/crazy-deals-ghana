import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wallet,
  Settings,
  Sparkles,
  TrendingUp,
  Tag,
  Bot,
  Mail,
  UserPlus,
  History,
  Banknote,
  Gift,
  Code2,
  Smartphone,
  Store,
  AlertCircle,
  MoreHorizontal,
  LogOut,
  Menu,
  X,
  Shield,
} from '../components/icons'

export interface DashboardNavItem {
  label: string
  path: string
  icon: React.FC<{ className?: string }>
  badge?: string
}

export const dashboardMainNav: DashboardNavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/dashboard/products', icon: Package },
  { label: 'Orders', path: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/dashboard/customers', icon: Users },
  { label: 'Withdrawals', path: '/dashboard/withdrawals', icon: Wallet },
]

export const dashboardToolsNav: DashboardNavItem[] = [
  { label: 'Promo Codes', path: '/dashboard/promo-codes', icon: Tag, badge: 'NEW' },
  { label: 'Performance', path: '/dashboard/performance', icon: TrendingUp },
  { label: 'WhatsApp Bot', path: '/dashboard/whatsapp-bot', icon: Bot, badge: 'BETA' },
  { label: 'Email Marketing', path: '/dashboard/email-marketing', icon: Mail },
  { label: 'Sub-Agents', path: '/dashboard/sub-agents', icon: UserPlus },
  { label: 'Agent Orders', path: '/dashboard/sub-agent-transactions', icon: History },
  { label: 'Agent Withdrawals', path: '/dashboard/sub-agent-withdrawals', icon: Banknote },
  { label: 'Agent Pricing', path: '/dashboard/agent-pricing', icon: Package },
]

export const dashboardAccountNav: DashboardNavItem[] = [
  { label: 'Settings', path: '/dashboard/settings', icon: Settings },
]

export const dashboardMobileNav: DashboardNavItem[] = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/dashboard/products', icon: Package },
  { label: 'Orders', path: '/dashboard/orders', icon: ShoppingBag },
  { label: 'Wallet', path: '/dashboard/withdrawals', icon: Wallet },
  { label: 'More', path: '/dashboard/more', icon: MoreHorizontal },
]

export const dashboardMoreTools: DashboardNavItem[] = dashboardToolsNav

export const dashboardMoreLinks: DashboardNavItem[] = [
  { label: 'Customers', path: '/dashboard/customers', icon: Users },
  { label: 'Store Settings', path: '/dashboard/settings', icon: Settings },
  { label: 'Buy MTN Data', path: '/dashboard/buy-mtn', icon: Smartphone },
  { label: 'Rewards & Spin', path: '/dashboard/rewards', icon: Gift },
  { label: 'Developer API', path: '/dashboard/developer-api', icon: Code2 },
  { label: 'My Store Setup', path: '/dashboard/my-store', icon: Store },
  { label: 'Report Issue', path: '/dashboard/report-issue', icon: AlertCircle },
]

export const dashboardMoreActivePrefixes = [
  '/dashboard/settings',
  '/dashboard/customers',
  '/dashboard/promo-codes',
  '/dashboard/performance',
  '/dashboard/whatsapp-bot',
  '/dashboard/email-marketing',
  '/dashboard/sub-agents',
  '/dashboard/agent-pricing',
  '/dashboard/sub-agent-transactions',
  '/dashboard/sub-agent-withdrawals',
  '/dashboard/more',
  '/dashboard/buy-',
  '/dashboard/rewards',
  '/dashboard/developer-api',
  '/dashboard/my-store',
  '/dashboard/report-issue',
]

export { LogOut, Menu, X, Shield, Sparkles }
