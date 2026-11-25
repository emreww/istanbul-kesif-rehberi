'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { AuditEntry, AuditAction } from '@/lib/admin/audit'
import { RoleBadge } from '@/components/admin/RoleBadge'

const ACTION_LABEL: Record<AuditAction, string> = {
  approve_place: 'Mekan onaylandı',
  reject_place: 'Mekan reddedildi',
  delete_place: 'Mekan silindi',
  bulk_approve_places: 'Toplu mekan onayı',
  bulk_reject_places: 'Toplu mekan reddi',
  delete_review: 'Yorum silindi',
  bulk_delete_reviews: 'Toplu yorum silme',
  delete_photo: 'Fotoğraf silindi',
  bulk_delete_photos: 'Toplu fotoğraf silme',
  ban_user: 'Kullanıcı engellendi',
  unban_user: 'Engel kaldırıldı',
  delete_user: 'Kullanıcı silindi',
  approve_ownership: 'Sahiplik onaylandı',
  reject_ownership: 'Sahiplik reddedildi',
  close_report: 'Rapor kapatıldı',
  reopen_report: 'Rapor yeniden açıldı',
  delete_report: 'Rapor silindi',
  bulk_close_reports: 'Toplu rapor kapatma',
  export_csv: 'CSV dışa aktarıldı',
}

const ACTION_ICON: Record<string, string> = {
  approve_place: '✅', reject_place: '❌', delete_place: '🗑️',
  bulk_approve_places: '✅', bulk_reject_places: '❌',
  delete_review: '🗑️', bulk_delete_reviews: '🗑️',
  delete_photo: '🗑️', bulk_delete_photos: '🗑️',
  ban_user: '⛔', unban_user: '🔓', delete_user: '🗑️',
  approve_ownership: '✅', reject_ownership: '❌',
  close_report: '📁', reopen_report: '🔄', delete_report: '🗑️',
  bulk_close_reports: '📁', export_csv: '📥',
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'az önce'
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`
  if (s < 604800) return `${Math.floor(s / 86400)} gün önce`
  return new Date(iso).toLocaleDateString('tr-TR')
}

export function AuditLogTab({
  entries, loading, onRefresh,
}: {
  entries: AuditEntry[]
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            📋 İşlem Geçmişi
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-semibold">
              {entries.length} kayıt
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Tüm yönetici aksiyonlarının kronolojik kaydı
          </p>
        </div>
        <button
          type="button" onClick={onRefresh} disabled={loading}
          className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-gray-200 hover:bg-white/15 transition cursor-pointer disabled:opacity-50"
        >
          🔄 Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <div className="text-5xl mb-3 opacity-80">📋</div>
          <h4 className="text-base font-bold text-gray-200">Henüz işlem yok</h4>
          <p className="text-sm text-gray-500 mt-1">Panel üzerinden yapılan ilk işlem burada görünecek.</p>
        </div>
      ) : (
        <div className="relative space-y-3 pl-2">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          <AnimatePresence initial={false}>
            {entries.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className="relative flex gap-3"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-lg relative z-10 shadow-md">
                  {ACTION_ICON[e.action] ?? '•'}
                </div>
                <div className="flex-1 bg-white/[0.03] hover:bg-white/[0.05] rounded-xl p-3 border border-white/5 transition">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {ACTION_LABEL[e.action] ?? e.action}
                        {e.target_name && (
                          <span className="text-gray-400 font-normal"> — {e.target_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-amber-300 font-semibold">{e.admin_username ?? 'Yönetici'}</span>
                        <span className="text-gray-600">·</span>
                        <span title={new Date(e.created_at).toLocaleString('tr-TR')}>
                          {timeAgo(e.created_at)}
                        </span>
                        <span className="text-gray-600">·</span>
                        <RoleBadge role="admin" className="!text-[9px] !px-1.5" />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                      #{e.id.slice(0, 8)}
                    </span>
                  </div>
                  {e.details && Object.keys(e.details).length > 0 && (
                    <details className="mt-2 text-xs text-gray-400">
                      <summary className="cursor-pointer hover:text-gray-200 select-none">Detaylar</summary>
                      <pre className="mt-1.5 p-2 rounded-lg bg-black/40 border border-white/5 overflow-x-auto text-[10px] leading-relaxed">
                        {JSON.stringify(e.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}