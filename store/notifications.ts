import { create } from 'zustand'

export interface Notification {
  id: number | string
  message: string
  type: 'success' | 'info' | 'warning'
  group_key?: string
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (message: string, type?: Notification['type'], group_key?: string) => void
  removeNotification: (id: number | string) => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (message, type = 'info', group_key) => {
    const id = Date.now() + Math.random()
    set((state) => ({
      notifications: [{ id, message, type, group_key }, ...state.notifications],
    }))

    // 5 saniye sonra otomatik sil
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }, 5000)
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },
}))