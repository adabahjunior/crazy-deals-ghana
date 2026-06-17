export type NetworkType = 'mtn' | 'airtel-ishare' | 'airtel-bigtime' | 'telecel'
export type TransactionStatus = 'pending' | 'processing' | 'success' | 'failed'
export type TransactionType =
  | 'data_purchase'
  | 'wallet_topup'
  | 'store_order'
  | 'withdrawal'
  | 'store_activation'
  | 'points_redemption'
  | 'spin_reward'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          wallet_balance?: number
          total_deposits?: number
          total_spent?: number
          store_balance?: number
          total_withdrawn?: number
          api_key?: string
          store_slug?: string | null
        }
        Update: Partial<Profile>
        Relationships: []
      }
      data_packages: {
        Row: DataPackage
        Insert: {
          network: NetworkType
          size_gb: number
          user_price: number
          agent_price: number
          validity: string
          is_active?: boolean
          sort_order?: number
        }
        Update: Partial<DataPackage>
        Relationships: []
      }
      transactions: {
        Row: Transaction
        Insert: {
          user_id: string
          type: TransactionType
          amount: number
          network?: string | null
          package_id?: string | null
          phone?: string | null
          description?: string | null
          status?: TransactionStatus
        }
        Update: Partial<Transaction>
        Relationships: []
      }
      store_packages: {
        Row: StorePackage
        Insert: {
          user_id: string
          data_package_id?: string | null
          network: string
          size_gb: number
          base_price?: number
          profit?: number
          price: number
          is_active?: boolean
        }
        Update: Partial<StorePackage>
        Relationships: []
      }
      store_orders: {
        Row: StoreOrder
        Insert: {
          store_user_id: string
          customer_phone: string
          package_label: string
          amount: number
          status?: TransactionStatus
        }
        Update: Partial<StoreOrder>
        Relationships: []
      }
      withdrawals: {
        Row: Withdrawal
        Insert: {
          user_id: string
          amount: number
          momo_number: string
          momo_network: string
          status?: TransactionStatus
        }
        Update: Partial<Withdrawal>
        Relationships: []
      }
      afa_registrations: {
        Row: AfaRegistration
        Insert: {
          user_id: string
          full_name: string
          phone: string
          id_type: string
          id_number: string
          region: string
          network: string
          status?: string
        }
        Update: Partial<AfaRegistration>
        Relationships: []
      }
      issue_reports: {
        Row: IssueReport
        Insert: {
          user_id: string
          issue_type: string
          transaction_ref?: string | null
          description: string
          status?: string
        }
        Update: Partial<IssueReport>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      purchase_data_package: {
        Args: { p_package_id: string; p_phone: string }
        Returns: string
      }
      topup_wallet: {
        Args: { p_amount: number; p_method: string }
        Returns: string
      }
      request_withdrawal: {
        Args: { p_amount: number; p_momo_number: string; p_momo_network: string }
        Returns: string
      }
      regenerate_api_key: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  is_admin: boolean
  wallet_balance: number
  total_deposits: number
  total_spent: number
  store_balance: number
  total_withdrawn: number
  api_key: string
  store_slug: string | null
  store_name: string | null
  store_whatsapp: string | null
  store_published: boolean
  store_activation_paid: boolean
  points_balance: number
  referral_code: string | null
  referred_by: string | null
  bonus_spin_chances: number
  last_spin_at: string | null
  created_at: string
  updated_at: string
}

export interface DataPackage {
  id: string
  network: NetworkType
  size_gb: number
  user_price: number
  agent_price: number
  price?: number
  validity: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  network: string | null
  package_id: string | null
  phone: string | null
  amount: number
  description: string | null
  status: TransactionStatus
  provider_order_id: string | null
  provider_status: string | null
  provider_error: string | null
  external_reference: string | null
  created_at: string
}

export interface StorePackage {
  id: string
  user_id: string
  data_package_id: string | null
  network: string
  size_gb: number
  base_price: number
  profit: number
  price: number
  is_active: boolean
  created_at: string
}

export interface StoreOrder {
  id: string
  store_user_id: string
  customer_phone: string
  package_label: string
  amount: number
  status: TransactionStatus
  created_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  momo_number: string
  momo_network: string
  status: TransactionStatus
  created_at: string
}

export interface AfaRegistration {
  id: string
  user_id: string
  full_name: string
  phone: string
  id_type: string
  id_number: string
  region: string
  network: string
  status: string
  created_at: string
}

export interface IssueReport {
  id: string
  user_id: string
  issue_type: string
  transaction_ref: string | null
  description: string
  status: string
  created_at: string
}

export const networkLabels: Record<NetworkType, string> = {
  mtn: 'MTN',
  'airtel-ishare': 'AirtelTigo iShare',
  'airtel-bigtime': 'AirtelTigo BigTime',
  telecel: 'Telecel',
}
