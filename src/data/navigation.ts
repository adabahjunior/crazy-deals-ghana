import {
  LayoutDashboard,
  Wallet,
  History,
  Smartphone,
  Radio,
  Clock,
  Signal,
  UserPlus,
  Sparkles,
  Gift,
  Store,
  Package,
  ShoppingBag,
  Banknote,
  Code2,
  Settings,
  AlertCircle,
  LogOut,
  Menu,
  X,
} from '../components/icons'

export interface NavItem {
  label: string
  path: string
  icon: React.FC<{ className?: string }>
  section?: string
}

export const navItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, section: 'Main' },
  { label: 'Wallet', path: '/dashboard/wallet', icon: Wallet, section: 'Main' },
  { label: 'Transaction History', path: '/dashboard/transactions', icon: History, section: 'Main' },
  { label: 'Buy MTN Data', path: '/dashboard/buy-mtn', icon: Smartphone, section: 'Buy Data' },
  { label: 'Buy Airtel-Tigo iShare Data', path: '/dashboard/buy-airtel-ishare', icon: Radio, section: 'Buy Data' },
  { label: 'Buy Airtel-Tigo BigTime Data', path: '/dashboard/buy-airtel-bigtime', icon: Clock, section: 'Buy Data' },
  { label: 'Buy Telecel Data', path: '/dashboard/buy-telecel', icon: Signal, section: 'Buy Data' },
  { label: 'AFA Registration', path: '/dashboard/afa-registration', icon: UserPlus, section: 'Services' },
  { label: 'Extra Services', path: '/dashboard/extra-services', icon: Sparkles, section: 'Services' },
  { label: 'Rewards & Spin', path: '/dashboard/rewards', icon: Gift, section: 'Services' },
  { label: 'My Store', path: '/dashboard/my-store', icon: Store, section: 'Store' },
  { label: 'Store Packages', path: '/dashboard/store-packages', icon: Package, section: 'Store' },
  { label: 'Store Orders', path: '/dashboard/store-orders', icon: ShoppingBag, section: 'Store' },
  { label: 'Store Withdrawal', path: '/dashboard/store-withdrawal', icon: Banknote, section: 'Store' },
  { label: 'Developer API', path: '/dashboard/developer-api', icon: Code2, section: 'Account' },
  { label: 'My Settings', path: '/dashboard/settings', icon: Settings, section: 'Account' },
  { label: 'Report an Issue', path: '/dashboard/report-issue', icon: AlertCircle, section: 'Account' },
]

export { LogOut, Menu, X }
