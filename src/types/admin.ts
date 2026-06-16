export interface AdminOrder {
  id: string
  source: 'platform' | 'store'
  user_id: string
  user_name: string | null
  user_email: string | null
  description: string | null
  network: string | null
  phone: string | null
  amount: number
  status: 'pending' | 'success' | 'failed'
  created_at: string
  store_name: string | null
  customer_phone: string | null
  package_label: string | null
}

export interface SalesDay {
  day: string
  orders: number
  revenue: number
}

export interface AdminDashboardStats {
  total_users: number
  total_platform_orders: number
  total_store_orders: number
  total_orders: number
  total_revenue: number
  today_orders: number
  today_revenue: number
  pending_orders: number
  wallet_topups_today: number
  active_stores: number
  sales_per_day: SalesDay[]
  recent_orders: AdminOrder[]
}
