import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import PlaceForm from '@/components/place/PlaceForm'

export const metadata: Metadata = {
  title: 'Mekan Ekle | İstanbul Keşif Rehberi',
  description: 'Yeni bir mekan önererek İstanbul Keşif Rehberi\'ne katkıda bulunun.',
}

export default async function MekanEklePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/giris')
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <AnimatedSection>
          <PlaceForm />
        </AnimatedSection>
      </div>
    </div>
  )
}