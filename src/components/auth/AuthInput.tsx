import type { InputHTMLAttributes, ReactNode } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  suffix?: ReactNode
  variant?: 'login' | 'register'
}

export default function AuthInput({
  label,
  icon,
  suffix,
  variant = 'login',
  id,
  className = '',
  ...props
}: AuthInputProps) {
  return (
    <div className="dm-auth-field">
      <label htmlFor={id} className={variant}>{label}</label>
      <div className={`dm-auth-input-wrap ${variant} ${suffix ? 'has-suffix' : ''}`}>
        {icon && <span className="dm-auth-input-icon">{icon}</span>}
        <input id={id} className={`dm-auth-input ${variant} ${className}`} {...props} />
        {suffix && <span className="dm-auth-input-suffix">{suffix}</span>}
      </div>
    </div>
  )
}
