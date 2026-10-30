import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import EditPlaceForm from '@/components/place/EditPlaceForm'

export default async function MekanDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Oturum açan kullanıcıyı al
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/giris')
  }

  // Mekanı çek
  const { data: place } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single()

  if (!place) {
    notFound()
  }

  // Yetki kontrolü: sadece sahibi veya admin düzenleyebilir
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin || false

  if (place.owner_id !== user.id && !isAdmin) {
    redirect('/')
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <AnimatedSection>
          <EditPlaceForm
            place={{
              id: place.id,
              name: place.name,
              description: place.description,
              phone: place.phone,
              website: place.website,
              instagram: place.instagram,
              working_hours: place.working_hours,
              price_range: place.price_range,
              features: place.features,
            }}
          />
        </AnimatedSection>
      </div>
    </div>
  )
}