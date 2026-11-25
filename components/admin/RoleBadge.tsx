import { ROLE_BADGE_CLASS, ROLE_LABEL, type AdminRole } from '@/lib/admin/roles'

export function RoleBadge({ role, className = '' }: { role: AdminRole; className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${ROLE_BADGE_CLASS[role]} ${className}`}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}