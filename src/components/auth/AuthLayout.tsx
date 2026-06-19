import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogoCircle, BrandLogoSquare } from './AuthShared'

const loginFeatures = [
  { icon: '₵', tone: 'green', title: 'Set Your Own Prices', description: 'Buy data at wholesale prices, sell at your own markup. Keep all the profit.' },
  { icon: '🏪', tone: 'blue', title: 'Your Own Store Link', description: 'Get a personalized store URL to share with your customers on WhatsApp.' },
  { icon: '💳', tone: 'purple', title: 'Easy Withdrawals', description: 'Withdraw your earnings to Mobile Money anytime you want.' },
  { icon: '👥', tone: 'amber', title: 'Recruit Sub-Agents', description: 'Build a team of sellers under you. Earn from every order they make.' },
  { icon: '📊', tone: 'orange', title: 'Track Everything', description: 'See your orders, customers, earnings, and withdrawals all in one place.' },
]

interface AuthLayoutProps {
  variant: 'login' | 'register' | 'forgot'
  children: ReactNode
}

function MobileBrand({ variant }: { variant: AuthLayoutProps['variant'] }) {
  if (variant === 'register') {
    return (
      <div className="dm-auth-mobile-brand register">
        <BrandLogoSquare />
        <div>
          <h1>Agent Dashboard</h1>
          <p>CrazyDeals Ghana</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dm-auth-mobile-brand login">
      <BrandLogoCircle size="lg" />
      <h1>CrazyDeals Ghana</h1>
      <p>Agent Dashboard</p>
    </div>
  )
}

function LoginBrandPanel() {
  return (
    <aside className="dm-auth-brand login">
      <div>
        <Link to="/auth/login" className="dm-auth-brand-head login">
          <BrandLogoCircle />
          <div>
            <h1>CrazyDeals Ghana</h1>
            <p>Agent Dashboard</p>
          </div>
        </Link>

        <div className="dm-auth-brand-body">
          <h2>Your Own Data Reselling Business</h2>
          <p className="dm-auth-brand-copy">
            As a CrazyDeals agent, you get everything you need to run a successful data reselling business.
          </p>

          <div className="dm-auth-feature-block">
            <h3>What you get</h3>
            <ul>
              {loginFeatures.map((feature) => (
                <li key={feature.title}>
                  <span className={`dm-auth-feature-icon ${feature.tone}`}>{feature.icon}</span>
                  <div>
                    <strong>{feature.title}</strong>
                    <p>{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="dm-auth-brand-foot">© {new Date().getFullYear()} CrazyDeals Ghana</p>
    </aside>
  )
}

function RegisterBrandPanel() {
  return (
    <aside className="dm-auth-brand register">
      <div className="dm-auth-brand-glow" aria-hidden="true">
        <div className="dm-auth-glow-a" />
        <div className="dm-auth-glow-b" />
      </div>

      <div className="dm-auth-brand-inner">
        <Link to="/auth/login" className="dm-auth-brand-head register">
          <BrandLogoSquare />
          <div>
            <h1>Agent Dashboard</h1>
            <p>CrazyDeals Ghana</p>
          </div>
        </Link>

        <div className="dm-auth-brand-body register">
          <h2>
            Start Your <span className="dm-auth-gradient-text">Journey</span> Today
          </h2>
          <p className="dm-auth-brand-copy register">
            Join thousands of successful data resellers. Create your free account and start earning.
          </p>
        </div>
      </div>

      <p className="dm-auth-brand-foot register">© {new Date().getFullYear()} CrazyDeals Ghana. All rights reserved.</p>
    </aside>
  )
}

export default function AuthLayout({ variant, children }: AuthLayoutProps) {
  const isRegister = variant === 'register'

  return (
    <div className="dm-auth-page">
      <div className="dm-auth-shell">
        {isRegister ? <RegisterBrandPanel /> : <LoginBrandPanel />}
        <section className={`dm-auth-panel ${isRegister ? 'register' : 'login'}`}>
          <div className={`dm-auth-panel-inner ${variant === 'forgot' ? 'forgot' : variant}`}>
            <MobileBrand variant={variant} />
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
