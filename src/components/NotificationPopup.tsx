import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { X } from './icons'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
}

export default function NotificationPopup() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<Notification[]>([])
  const [current, setCurrent] = useState<Notification | null>(null)

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    async function load() {
      const { data: dismissed } = await supabase
        .from('notification_dismissals')
        .select('notification_id')
        .eq('user_id', userId)

      const dismissedIds = dismissed?.map((d) => d.notification_id) ?? []

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, message, type')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const unread = (notifications ?? []).filter((n) => !dismissedIds.includes(n.id))
      setQueue(unread)
      if (unread.length > 0) setCurrent(unread[0])
    }

    load()
  }, [user])

  const dismiss = async () => {
    if (!user || !current) return

    await supabase.from('notification_dismissals').upsert({
      user_id: user.id,
      notification_id: current.id,
    })

    const remaining = queue.filter((n) => n.id !== current.id)
    setQueue(remaining)
    setCurrent(remaining[0] ?? null)
  }

  if (!current) return null

  return (
    <div className="modal-overlay notification-popup-overlay">
      <div className={`modal notification-popup notification-${current.type}`}>
        <div className="modal-header">
          <h2>{current.title}</h2>
          <button className="modal-close" onClick={dismiss} aria-label="Dismiss">
            <X />
          </button>
        </div>
        <p className="notification-message">{current.message}</p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={dismiss}>
          Got it
        </button>
        {queue.length > 1 && (
          <p className="notification-count">{queue.length - 1} more notification{queue.length > 2 ? 's' : ''}</p>
        )}
      </div>
    </div>
  )
}
