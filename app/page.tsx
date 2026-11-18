import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Sparkles,
  Compass,
  Navigation,
  Route,
  MapPin,
  Star,
  MessageSquare,
  ArrowRight,
  Utensils,
  Coffee,
  Landmark,
  Trees,
  ShoppingBag,
  Columns3,
  Martini,
  Palette,
  TowerControl,
  Cross,
  Mail,
  Building2,
  type LucideIcon,
} from 'lucide-react'
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

// Supabase'den gelen kategori slug veya ismine göre Lucide ikonu döndürür
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  restoran: Utensils,
  kafe: Coffee,
  muze: Landmark,
  park: Trees,
  alisveris: ShoppingBag,
  'tarihi-yer': Columns3,
  'gece-hayati': Martini,
  'sanat-galerisi': Palette,
  kule: TowerControl,
  klinik: Cross,
  postane: Mail,
}

function getCategoryIcon(slug?: string): LucideIcon {
  if (!slug) return Building2
  return CATEGORY_ICON_MAP[slug.toLowerCase()] || Compass
}

export default async function HomePage() {
  const supabase = await createClient()

  const [
    categoriesRes,
    popularPlacesRes,
    totalPlacesRes,
    totalReviewsRes,
    totalUsersRes,
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      // İhtiyaç noktalarını (tuvalet, klinik, postane vb.) ana sayfa vitrininden hariç tutmak istersen:
      .not('slug', 'in', '("tuvalet","klinik","postane","atm")')
      .order('id')
      .limit(12),
    supabase
      .from('places')
      .select('id, name, district, average_rating, total_reviews, category_id, categories!inner(name, slug, icon)')
      .eq('status', 'approved')
      // Sadece gezilecek/keşfedilecek kategorileri öne çıkarır
      .in('categories.slug', [
        'restoran',
        'kafe',
        'muze',
        'park',
        'tarihi-yer',
        'sanat-galerisi',
        'kule',
        'gece-hayati',
      ])
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(6),
    supabase.from('places').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 text-left space-y-8">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-stone-400 border-l-2 border-[#e8743b] pl-3 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-[#e8743b]" strokeWidth={1.75} />
                  <span>İstanbul'un En Kapsamlı Keşif Platformu</span>
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-normal text-stone-50 leading-[0.95] tracking-tight">
                  Bugün nereye <span className="text-[#e8743b] italic">gidelim?</span>
                </h1>
                <p className="font-sans text-stone-300 text-lg md:text-xl max-w-xl leading-relaxed mt-6">
                  Tarihi sokaklardan gizli lezzet duraklarına, on binlerce mekanı keşfet, puanla ve toplulukla paylaş.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.2} variant="zoom">
                <SearchBar />
              </AnimatedSection>

              <AnimatedSection delay={0.35} variant="zoom">
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/kesfet"
                    className="inline-flex items-center gap-2.5 min-h-11 bg-[#e8743b] text-stone-950 uppercase tracking-wide text-sm font-semibold py-3.5 px-8 rounded-none hover:bg-[#f08a55] cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                  >
                    <Compass className="w-4 h-4" strokeWidth={2} />
                    <span>Mekanları Keşfet</span>
                  </Link>
                  <Link
                    href="/rota"
                    className="inline-flex items-center gap-2.5 min-h-11 border border-stone-500 text-stone-100 text-sm py-3.5 px-8 rounded-none hover:border-stone-100 cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                  >
                    <Route className="w-4 h-4 text-[#e8743b]" strokeWidth={1.75} />
                    <span>Rota Oluştur</span>
                  </Link>
                  <Link
                    href="/yakinimda"
                    className="inline-flex items-center gap-2 min-h-11 text-stone-300 text-sm underline underline-offset-4 decoration-stone-600 hover:decoration-[#e8743b] hover:text-stone-100 py-3.5 px-4 cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                  >
                    <Navigation className="w-4 h-4 text-[#e8743b]" strokeWidth={1.75} />
                    <span>Yakınımdakiler</span>
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
                <div className="absolute inset-0 rounded-full border border-dashed border-stone-500/40 animate-[spin_25s_linear_infinite] motion-reduce:animate-none" />
                <div className="absolute inset-6 rounded-full border border-[#e8743b]/40 animate-pulse motion-reduce:animate-none" />
                <div className="absolute inset-12 rounded-full border border-stone-600/50 bg-[#e8743b]/5" />
                <Link
                  href="/cark"
                  className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                >
                  <div className="w-24 h-24 rounded-full border border-[#e8743b]/40 bg-stone-950/90 flex items-center justify-center group-hover:scale-110 group-hover:border-[#e8743b] transition-all duration-300 motion-reduce:transform-none">
                    <Compass
                      className="w-11 h-11 text-[#e8743b] group-hover:rotate-45 transition-transform duration-500"
                      strokeWidth={1.25}
                    />
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 border border-stone-500 bg-stone-950/90 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0a070] group-hover:border-[#e8743b] transition-colors duration-200">
                    <span>Kararsızsan Çarkı Çevir</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 border-y border-stone-700/60">
            <div className="text-left py-6 pl-5 odd:border-l-0 border-l border-stone-700/60 md:first:border-l-0 md:odd:border-l">
              <div className="font-serif text-4xl md:text-5xl font-normal text-stone-50">
                {totalPlacesCount.toLocaleString('tr-TR')}+
              </div>
              <div className="text-[11px] text-stone-400 mt-2 uppercase tracking-[0.18em] font-semibold">
                Kayıtlı Mekan
              </div>
            </div>
            <div className="text-left py-6 pl-5 border-l border-stone-700/60">
              <div className="font-serif text-4xl md:text-5xl font-normal text-amber-300">39</div>
              <div className="text-[11px] text-stone-400 mt-2 uppercase tracking-[0.18em] font-semibold">
                İstanbul İlçesi
              </div>
            </div>
            <div className="text-left py-6 pl-5 border-t md:border-t-0 border-stone-700/60 odd:border-l-0 md:odd:border-l md:border-l">
              <div className="font-serif text-4xl md:text-5xl font-normal text-emerald-300">
                {totalReviewsCount >= 10 ? `${totalReviewsCount.toLocaleString('tr-TR')}+` : 'Canlı'}
              </div>
              <div className="text-[11px] text-stone-400 mt-2 uppercase tracking-[0.18em] font-semibold">
                {totalReviewsCount >= 10 ? 'Kullanıcı Yorumu' : 'Topluluk Değerlendirmesi'}
              </div>
            </div>
            <div className="text-left py-6 pl-5 border-t md:border-t-0 border-l border-stone-700/60">
              <div className="font-serif text-4xl md:text-5xl font-normal text-sky-300">
                {totalUsersCount >= 10 ? `${totalUsersCount.toLocaleString('tr-TR')}+` : 'Ücretsiz'}
              </div>
              <div className="text-[11px] text-stone-400 mt-2 uppercase tracking-[0.18em] font-semibold">
                {totalUsersCount >= 10 ? 'Aktif Kullanıcı' : 'Rota ve Keşif Aracı'}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16">
          <AnimatedSection variant="left">
            <div className="flex items-end justify-between gap-4 border-b border-stone-700/60 pb-5 mb-10">
              <div>
                <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-stone-50">
                  Kategoriler
                </h2>
                <p className="text-sm text-stone-400 mt-2">
                  İlgi alanına ve aradığın atmosfere göre filtrele
                </p>
              </div>
              <Link
                href="/kesfet"
                className="inline-flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-[0.18em] font-semibold text-[#e8743b] hover:text-[#f08a55] hover:underline underline-offset-4 cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
              >
                <span>Tümünü Gör</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories?.map((cat: any, index: number) => {
              const IconComponent = getCategoryIcon(cat.slug)
              return (
                <AnimatedSection key={cat.id} delay={index * 0.04} variant="up">
                  <Link
                    href={`/kesfet?kategori=${cat.slug}`}
                    className="block border border-stone-700/60 bg-stone-900/40 rounded-none p-5 text-left hover:border-[#e8743b]/70 hover:bg-stone-800/60 transition-colors duration-200 group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                  >
                    <div className="w-10 h-10 border border-stone-700/80 bg-stone-950/60 flex items-center justify-center mb-4 text-[#e8743b] group-hover:border-[#e8743b] group-hover:bg-[#e8743b] group-hover:text-stone-950 transition-colors duration-200">
                      <IconComponent className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <div className="font-serif text-base text-stone-100 group-hover:text-[#f0a070] transition-colors duration-200">
                      {cat.name}
                    </div>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pb-12">
          <AnimatedSection variant="right">
            <div className="flex items-end justify-between gap-4 border-b border-stone-700/60 pb-5 mb-10">
              <div>
                <div className="inline-flex items-center gap-2.5">
                  <Star className="w-6 h-6 text-amber-300 fill-amber-300/20" strokeWidth={1.75} />
                  <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-stone-50">
                    Öne Çıkan Mekanlar
                  </h2>
                </div>
                <p className="text-sm text-stone-400 mt-2">
                  Topluluk puanlarına ve keşif rotalarına göre öne çıkan duraklar
                </p>
              </div>
              <Link
                href="/kesfet?siralama=en-yuksek-puan"
                className="inline-flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-[0.18em] font-semibold text-[#e8743b] hover:text-[#f08a55] hover:underline underline-offset-4 cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
              >
                <span>Tüm Popülerleri Gör</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 [counter-reset:place]">
            {popularPlaces?.map((place: any, index: number) => {
              const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
              const CatIcon = getCategoryIcon(cat?.slug)
              return (
                <AnimatedSection key={place.id} delay={index * 0.08} variant="up">
                  <Link
                    href={`/mekan/${place.id}`}
                    className="block relative border-t border-stone-600 pt-5 pb-6 hover:border-[#e8743b] transition-colors duration-200 group cursor-pointer [counter-increment:place] before:content-[counter(place,decimal-leading-zero)] before:block before:mb-3 before:font-serif before:text-sm before:tracking-[0.2em] before:text-[#e8743b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8743b]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        {cat && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-400 border border-stone-600 px-2 py-0.5 rounded-none bg-transparent">
                            <CatIcon className="w-3 h-3 text-[#e8743b]" strokeWidth={1.75} />
                            <span>{cat.name}</span>
                          </span>
                        )}
                        <h3 className="font-serif text-2xl font-normal text-stone-50 mt-3 leading-snug group-hover:text-[#f0a070] transition-colors duration-200">
                          {place.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 border border-amber-300/40 px-2.5 py-1 rounded-none bg-transparent shrink-0">
                        <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" strokeWidth={1.75} />
                        <span className="font-serif text-sm text-amber-200">
                          {Number(place.average_rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-stone-400 text-sm flex items-center gap-1.5 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-[#e8743b] shrink-0" strokeWidth={1.75} />
                      <span>{place.district || 'İstanbul'}</span>
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-700/60 text-xs text-stone-400">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.75} />
                        <span>{place.total_reviews || 0} kullanıcı yorumu</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#e8743b] uppercase tracking-[0.16em] font-semibold group-hover:translate-x-1 motion-reduce:transform-none transition-transform duration-200">
                        <span>İncele</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                      </span>
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