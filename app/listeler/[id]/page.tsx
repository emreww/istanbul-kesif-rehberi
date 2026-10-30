import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'

export default async function ListeDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: list } = await supabase
    .from('user_lists')
    .select(`
      id, name, is_public, created_at,
      profiles ( id, username, avatar_url ),
      user_list_items (
        id,
        places ( id, name, district, average_rating, total_reviews )
      )
    `)
    .eq('id', id)
    .single()

  if (!list || !list.is_public) {
    notFound()
  }

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles
  const items = list.user_list_items || []

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">{list.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold overflow-hidden">
                {owner?.avatar_url ? (
                  <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (owner?.username?.[0] || 'K').toUpperCase()
                )}
              </div>
              <Link href={`/profil/${owner?.id}`} className="text-gray-200 hover:text-primary-400">
                {owner?.username || 'Anonim'}
              </Link>
            </div>
          </div>
        </AnimatedSection>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any) => {
              const place = item.places
              if (!place) return null
              return (
                <AnimatedSection key={item.id}>
                  <Link
                    href={`/mekan/${place.id}`}
                    className="block bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition"
                  >
                    <h2 className="text-xl font-bold text-gray-100">{place.name}</h2>
                    <p className="text-gray-400 text-sm mt-1">{place.district}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-200 font-semibold">{Number(place.average_rating).toFixed(1)}</span>
                      <span className="text-gray-400 text-sm">({place.total_reviews} yorum)</span>
                    </div>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-400">Bu liste boş.</p>
          </div>
        )}
      </div>
    </div>
  )
}