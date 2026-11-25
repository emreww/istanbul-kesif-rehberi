export type AdminRole = 'user' | 'moderator' | 'admin' | 'superadmin'

export const ROLE_LEVEL: Record<AdminRole, number> = {
  user: 0, moderator: 1, admin: 2, superadmin: 3,
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  user: 'Üye', moderator: 'Moderatör', admin: 'Yönetici', superadmin: 'Süper Yönetici',
}

export const ROLE_BADGE_CLASS: Record<AdminRole, string> = {
  user: 'bg-white/5 text-gray-300 border-white/10',
  moderator: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  admin: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  superadmin: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export function hasRole(role: AdminRole | undefined, required: AdminRole): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[required]
}

/** is_admin legacy kolonunu da hesaba katarak normalize eder. */
export function resolveRole(profile: {
  role?: string | null
  is_admin?: boolean | null
} | null | undefined): AdminRole {
  if (profile?.role && profile.role !== 'user') return profile.role as AdminRole
  if (profile?.is_admin) return 'superadmin'
  return 'user'
}

/** Her tab için gereken minimum rol. */
export const TAB_MIN_ROLE: Record<string, AdminRole> = {
  mekanlar: 'moderator',
  tum_mekanlar: 'moderator',
  medya: 'moderator',
  yorumlar: 'moderator',
  raporlar: 'moderator',
  kapatilan_raporlar: 'moderator',
  kullanicilar: 'admin',
  sahiplik: 'admin',
  audit_log: 'admin',
}