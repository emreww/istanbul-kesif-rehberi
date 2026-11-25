import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType = 'success' | 'warning' | 'info'

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    userId?: string | null
    actorId?: string | null
    message: string
    type?: NotificationType
  }
) {
  const { userId, actorId, message, type = 'info' } = params
  if (!userId || (actorId && actorId === userId)) return

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    message,
    type,
    read: false,
  })

  if (error) {
    console.error('Bildirim gönderilemedi:', error.message)
  }
}