import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAuthenticated: boolean
  isAdmin: boolean
  isAgent: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signup: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: AuthError | null; session: Session | null }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (data: { full_name?: string; phone?: string }) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Failed to load profile:', error.message)
    return null
  }
  return data
}

async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) {
    console.error('Failed to check admin status:', error.message)
    return false
  }
  return data === true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession?.user) {
      setProfile(null)
      setIsAdmin(false)
      return
    }
    const [p, admin] = await Promise.all([
      fetchProfile(currentSession.user.id),
      checkIsAdmin(),
    ])
    setProfile(p)
    setIsAdmin(admin)
  }, [])

  useEffect(() => {
    async function initSession(activeSession: Session | null) {
      setSession(activeSession)
      setUser(activeSession?.user ?? null)
      if (activeSession?.user) {
        const [p, admin] = await Promise.all([
          fetchProfile(activeSession.user.id),
          checkIsAdmin(),
        ])
        setProfile(p)
        setIsAdmin(admin)
      } else {
        setProfile(null)
        setIsAdmin(false)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      initSession(initialSession)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      initSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signup = useCallback(async (email: string, password: string, fullName: string, referralCode?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...(referralCode ? { referral_code: referralCode } : {}),
        },
      },
    })
    return { error, session: data.session }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setIsAdmin(false)
  }, [])

  const updateProfile = useCallback(async (data: { full_name?: string; phone?: string }) => {
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) return { error: error.message }
    await refreshProfile()
    return { error: null }
  }, [user, refreshProfile])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAuthenticated: !!session,
        isAdmin,
        isAgent: !!profile?.store_published,
        loading,
        login,
        signup,
        logout,
        refreshProfile,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
