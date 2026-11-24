import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AdminTabs from '@/components/admin/AdminTabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Yönetim Paneli | İstanbul Keşif Rehberi',
  description: 'Raporları, mekanları, yorumları, fotoğrafları, kullanıcıları ve listeleri yönet.',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    notFound()
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs font-semibold text-amber-300 mb-2">
              Yönetim Merkezi
            </span>
            <h1 className="text-3xl font-bold text-gray-100">Admin Paneli</h1>
            <p className="text-sm text-gray-400 mt-1">
              Hoş geldin <strong className="text-gray-200">{profile.username || 'Yönetici'}</strong> — tüm içerik ve kullanıcı işlemlerini buradan yönetebilirsin.
            </p>
          </div>
        </div>

        <AdminTabs />
      </div>
    </div>
  )
}