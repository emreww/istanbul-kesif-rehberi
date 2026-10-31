import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import SearchBar from '@/components/search/SearchBar'
import IstanbulWeather from '@/components/weather/IstanbulWeather'

export const metadata: Metadata = {
  title: 'İstanbul Keşif Rehberi | Mekan Keşfet, Puanla, Yorumla',
  description:
    "İstanbul'daki restoran, kafe, müze, park ve daha fazlasını keşfedin. Kullanıcıların yorumları ve puanlarıyla en iyi mekanları bulun.",
  openGraph: {
    title: 'İstanbul Keşif Rehberi',
    description: "İstanbul'un en iyi mekanlarını keşfedin.",
    type: 'website',
    locale: 'tr_TR',
  },
}

export default async function HomePage() {
  // "use client" SATIRI SİLİNDİ (Bu bir Server Component'tir)
  
  const supabase = await createClient()
  
  const [
    categoriesRes,
    popularPlacesRes,
    totalPlacesRes,
    totalReviewsRes,
    totalUsersRes
  ] = await Promise.all([
    supabase.from('categories').select('*').order('id').limit(12),
    supabase.from('places').select('id, name, district, average_rating, total_reviews, category_id, categories(name, icon)').eq('status', 'approved').order('average_rating', { ascending: false }).order('total_reviews', { ascending: false }).limit(6),
    supabase.from('places').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ])
  
  const categories = categoriesRes.data || []
  const popularPlaces = popularPlacesRes.data || []
  const totalPlacesCount = totalPlacesRes.count || 0
  const totalReviewsCount = totalReviewsRes.count || 0
  const totalUsersCount = totalUsersRes.count || 0
      
  return (
    <div className="relative min-h-screen pb-16">
      <AnimatedBackground />
      <div className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 pt-12 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-bold uppercase tracking-wider mb-2">
                  ✨ İstanbul'un En Kapsamlı Keşif Platformu
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                  Bugün nereye <span className="gradient-text-orange">gidelim?</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Tarihi sokaklardan gizli lezzet duraklarına, yüzlerce mekanı keşfet, puanla ve toplulukla paylaş.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.2} variant="zoom">
                <SearchBar />
              </AnimatedSection>

              <AnimatedSection delay={0.35} variant="zoom">
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-2">
                  <Link
                    href="/kesfet"
                    className="btn-primary py-3.5 px-8 text-base shadow-lg shadow-orange-500/30"
                  >
                    🗺️ Mekanları Keşfet
                  </Link>
                  <Link
                    href="/cark"
                    className="btn-secondary py-3.5 px-8 text-base"
                  >
                    🎡 Çarkı Çevir
                  </Link>
                  <Link
                    href="/yakinimda"
                    className="btn-outline py-3.5 px-6 text-sm"
                  >
                    📍 Yakınımdakiler
                  </Link>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.45} variant="up">
                <div className="pt-2">
                  <IstanbulWeather />
                </div>
              </AnimatedSection>
            </div>

            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <div className="relative w-80 h-80 md:w-96 md:h-96">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-400/40 animate-[spin_25s_linear_infinite]" />
                <div className="absolute inset-6 rounded-full border border-primary-500/20 animate-pulse" />
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-amber-500/20 blur-2xl animate-pulse" />
                <Link
                  href="/cark"
                  className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer"
                >
                  <span className="text-8xl drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">🎡</span>
                  <span className="mt-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300 group-hover:border-amber-400 transition">
                    Çarkı Başlat →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 glass-panel rounded-3xl border border-white/10">
            <div className="text-center p-3 border-r border-white/5 last:border-0">
              <div className="text-3xl font-extrabold text-white">{totalPlacesCount || 0}+</div>
              <div className="text-xs text-gray-400 mt-1 uppercase font-semibold">Kayıtlı Mekan</div>
            </div>
            <div className="text-center p-3 md:border-r border-white/5 last:border-0">
              <div className="text-3xl font-extrabold text-amber-400">39</div>
              <div className="text-xs text-gray-400 mt-1 uppercase font-semibold">İstanbul İlçesi</div>
            </div>
            <div className="text-center p-3 border-r border-white/5 last:border-0">
              <div className="text-3xl font-extrabold text-emerald-400">{totalReviewsCount || 0}+</div>
              <div className="text-xs text-gray-400 mt-1 uppercase font-semibold">Kullanıcı Yorumu</div>
            </div>
            <div className="text-center p-3">
              <div className="text-3xl font-extrabold text-sky-400">{totalUsersCount || 0}+</div>
              <div className="text-xs text-gray-400 mt-1 uppercase font-semibold">Aktif Kullanıcı</div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16">
          <AnimatedSection variant="left">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">Kategoriler</h2>
                <p className="text-sm text-gray-400 mt-1">İlgi alanına ve aradığın atmosfere göre filtrele</p>
              </div>
              <Link href="/kesfet" className="text-xs font-semibold text-primary-400 hover:text-primary-300">
                Tümünü Gör →
              </Link>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories?.map((cat: any, index: number) => (
              <AnimatedSection key={cat.id} delay={index * 0.04} variant="up">
                <Link
                  href={`/kesfet?kategori=${cat.slug}`}
                  className="glass-card rounded-2xl p-5 text-center block hover:border-orange-500/40 transition group"
                >
                  <div className="text-4xl mb-2.5 group-hover:scale-115 transition-transform duration-200">{cat.icon}</div>
                  <div className="font-bold text-sm text-gray-200 group-hover:text-primary-300 transition">{cat.name}</div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pb-12">
          <AnimatedSection variant="right">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">⭐ En Çok Sevilen Mekanlar</h2>
                <p className="text-sm text-gray-400 mt-1">Topluluk puanlarına göre öne çıkan mekanlar</p>
              </div>
              <Link href="/kesfet?siralama=en-yuksek-puan" className="text-xs font-semibold text-primary-400 hover:text-primary-300">
                Tüm Popülerleri Gör →
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPlaces?.map((place: any, index: number) => {
              const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
              return (
                <AnimatedSection key={place.id} delay={index * 0.08} variant="up">
                  <Link
                    href={`/mekan/${place.id}`}
                    className="card block p-6 relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        {cat && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-primary-300">
                            {cat.icon} {cat.name}
                          </span>
                        )}
                        <h3 className="font-bold text-xl text-white mt-2 group-hover:text-primary-300 transition">
                          {place.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl shrink-0">
                        <span className="text-amber-400 text-sm">★</span>
                        <span className="font-extrabold text-sm text-amber-300">
                          {Number(place.average_rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm flex items-center gap-1 mb-4">
                      <span>📍</span> {place.district}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-400">
                      <span>💬 {place.total_reviews || 0} kullanıcı yorumu</span>
                      <span className="text-primary-400 font-semibold group-hover:translate-x-1 transition-transform">İncele →</span>
                    </div>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}