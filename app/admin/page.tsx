import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AdminTabs from '@/components/admin/AdminTabs'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    notFound()
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <AdminTabs />
    </div>
  )
}