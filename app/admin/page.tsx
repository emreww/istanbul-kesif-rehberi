import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AdminShell from './AdminShell'
import { resolveRole } from '@/lib/admin/roles'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Yönetim Paneli | İstanbul Keşif Rehberi',
  description: 'Raporları, mekanları, yorumları, fotoğrafları, kullanıcıları ve listeleri yönet.',
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, is_admin, role')
    .eq('id', user.id)
    .single()

  const role = resolveRole(profile)
  if (role === 'user') notFound()

  return (
    <div className="relative min-h-screen bg-slate-950">
      <AnimatedBackground />
      <div className="relative z-10">
        <AdminShell currentAdmin={{
          id: user.id,
          username: profile?.username ?? null,
          role,
        }} />
      </div>
    </div>
  )
}