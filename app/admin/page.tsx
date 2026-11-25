import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AdminTabs from '@/components/admin/AdminTabs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Yönetim Paneli | İstanbul Keşif Rehberi',
  description: 'Raporları, mekanları, yorumları, fotoğrafları, kullanıcıları ve listeleri yönet.',
  // 🔒 Admin panellerini arama motorlarından gizle
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminPage() {
  const supabase = await createClient()

  // 1) Oturum kontrolü
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Giriş yapmamış kullanıcı → login'e yönlendir (404 yerine)
    redirect('/login?redirect=/admin')
  }

  // 2) Yetki kontrolü
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', user.id)
    .single()

  // Giriş yapmış ama admin değil → panelin varlığını gizlemek için 404
  if (!profile?.is_admin) {
    notFound()
  }

  // 3) Layout — AdminTabs kendi sidebar + header + max-w-7xl'ini yönetiyor
  return (
    <div className="relative min-h-screen bg-slate-950">
      <AnimatedBackground />
      <div className="relative z-10">
        <AdminTabs />
      </div>
    </div>
  )
}