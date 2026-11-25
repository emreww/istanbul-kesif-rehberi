import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'approve_place' | 'reject_place' | 'delete_place'
  | 'bulk_approve_places' | 'bulk_reject_places'
  | 'delete_review' | 'bulk_delete_reviews'
  | 'delete_photo' | 'bulk_delete_photos'
  | 'ban_user' | 'unban_user' | 'delete_user'
  | 'approve_ownership' | 'reject_ownership'
  | 'close_report' | 'reopen_report' | 'delete_report' | 'bulk_close_reports'
  | 'export_csv'

export type AuditTargetType =
  | 'place' | 'review' | 'user' | 'photo' | 'report' | 'ownership' | 'system'

export interface AuditEntry {
  id: string
  admin_id: string
  admin_username: string | null
  action: AuditAction
  target_type: AuditTargetType
  target_id: string | null
  target_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}

interface LogParams {
  supabase: SupabaseClient
  adminId: string
  adminUsername?: string | null
  action: AuditAction
  targetType: AuditTargetType
  targetId?: string | null
  targetName?: string | null
  details?: Record<string, unknown>
}

export async function logAdminAction({
  supabase, adminId, adminUsername, action,
  targetType, targetId, targetName, details = {},
}: LogParams) {
  const { error } = await supabase.from('admin_actions').insert({
    admin_id: adminId,
    admin_username: adminUsername ?? null,
    action, target_type: targetType,
    target_id: targetId ?? null, target_name: targetName ?? null, details,
  })
  if (error) console.warn('Audit log failed:', error.message)
}