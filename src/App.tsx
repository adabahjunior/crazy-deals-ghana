import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import DashboardLayout from './components/DashboardLayout'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import OverviewPage from './pages/OverviewPage'
import WalletPage from './pages/WalletPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import BuyMtnDataPage from './pages/BuyMtnDataPage'
import BuyAirtelIsharePage from './pages/BuyAirtelIsharePage'
import BuyAirtelBigTimePage from './pages/BuyAirtelBigTimePage'
import BuyTelecelDataPage from './pages/BuyTelecelDataPage'
import AfaRegistrationPage from './pages/AfaRegistrationPage'
import ExtraServicesPage from './pages/ExtraServicesPage'
import MyStorePage from './pages/MyStorePage'
import StorePackagesPage from './pages/StorePackagesPage'
import StoreOrdersPage from './pages/StoreOrdersPage'
import StoreWithdrawalPage from './pages/StoreWithdrawalPage'
import DeveloperApiPage from './pages/DeveloperApiPage'
import MySettingsPage from './pages/MySettingsPage'
import ReportIssuePage from './pages/ReportIssuePage'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminPackagesPage from './pages/admin/AdminPackagesPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import PublicStorePage from './pages/PublicStorePage'
import ApiDocsPage from './pages/ApiDocsPage'
import RewardsPage from './pages/RewardsPage'
import CustomersPage from './pages/CustomersPage'
import MorePage from './pages/MorePage'
import PromoCodesPage from './pages/tools/PromoCodesPage'
import PerformancePage from './pages/tools/PerformancePage'
import WhatsAppBotPage from './pages/tools/WhatsAppBotPage'
import EmailMarketingPage from './pages/tools/EmailMarketingPage'
import SubAgentsPage from './pages/tools/SubAgentsPage'
import SubAgentOrdersPage from './pages/tools/SubAgentOrdersPage'
import SubAgentWithdrawalsPage from './pages/tools/SubAgentWithdrawalsPage'
import AgentPricingPage from './pages/tools/AgentPricingPage'
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage'
import AdminPromoCodesPage from './pages/admin/AdminPromoCodesPage'
import AdminSubAgentsPage from './pages/admin/AdminSubAgentsPage'
import { hasSupabaseEnv, supabaseEnvError } from './lib/supabase'

export default function App() {
  if (!hasSupabaseEnv) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '720px', textAlign: 'center' }}>
          <h1>Configuration required</h1>
          <p>{supabaseEnvError}</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="/store/:slug" element={<PublicStorePage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="products" element={<StorePackagesPage />} />
              <Route path="orders" element={<StoreOrdersPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="withdrawals" element={<StoreWithdrawalPage />} />
              <Route path="promo-codes" element={<PromoCodesPage />} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="whatsapp-bot" element={<WhatsAppBotPage />} />
              <Route path="email-marketing" element={<EmailMarketingPage />} />
              <Route path="sub-agents" element={<SubAgentsPage />} />
              <Route path="sub-agent-transactions" element={<SubAgentOrdersPage />} />
              <Route path="sub-agent-withdrawals" element={<SubAgentWithdrawalsPage />} />
              <Route path="agent-pricing" element={<AgentPricingPage />} />
              <Route path="more" element={<MorePage />} />
              <Route path="settings" element={<MySettingsPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="transactions" element={<TransactionHistoryPage />} />
              <Route path="buy-mtn" element={<BuyMtnDataPage />} />
              <Route path="buy-airtel-ishare" element={<BuyAirtelIsharePage />} />
              <Route path="buy-airtel-bigtime" element={<BuyAirtelBigTimePage />} />
              <Route path="buy-telecel" element={<BuyTelecelDataPage />} />
              <Route path="afa-registration" element={<AfaRegistrationPage />} />
              <Route path="extra-services" element={<ExtraServicesPage />} />
              <Route path="rewards" element={<RewardsPage />} />
              <Route path="my-store" element={<MyStorePage />} />
              <Route path="store-packages" element={<Navigate to="/dashboard/products" replace />} />
              <Route path="store-orders" element={<Navigate to="/dashboard/orders" replace />} />
              <Route path="store-withdrawal" element={<Navigate to="/dashboard/withdrawals" replace />} />
              <Route path="developer-api" element={<DeveloperApiPage />} />
              <Route path="report-issue" element={<ReportIssuePage />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="packages" element={<AdminPackagesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId" element={<AdminUserDetailPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
              <Route path="promo-codes" element={<AdminPromoCodesPage />} />
              <Route path="sub-agents" element={<AdminSubAgentsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
