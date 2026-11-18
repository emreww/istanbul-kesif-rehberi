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
    "İstanbul'daki restoran, kafe, müze, park ve tarihi mekanları keşfedin. Topluluk puanlarıyla şehrin en özel duraklarını bulun.",
}

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
}

// Mekanın kendi fotoğrafı yoksa kategorisine göre otomatik atanacak atmosfer görselleri
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  muze: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
  'tarihi-yer': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80',
  kule: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=800&q=80',
  park: 'https://images.unsplash.com/photo-1584974292709-5c2f0619971b?auto=format&fit=crop&w=800&q=80',
  kafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
  restoran: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'sanat-galerisi': 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=800&q=80',
  'gece-hayati': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80',
}

function getCategoryIcon(slug?: string): LucideIcon {
  if (!slug) return Building2
  return CATEGORY_ICON_MAP[slug.toLowerCase()] || Compass
}

function getPlaceImage(place: any, slug?: string): string {
  if (place.image_url) return place.image_url
  if (slug && CATEGORY_FALLBACK_IMAGES[slug.toLowerCase()]) {
    return CATEGORY_FALLBACK_IMAGES[slug.toLowerCase()]
  }
  return CATEGORY_FALLBACK_IMAGES.default
}

// Ana sayfada sadece gerçek gezi/keşif kategorileri gösterilir
const EXPLORE_CATEGORY_SLUGS = [
  'tarihi-yer',
  'muze',
  'kule',
  'park',
  'kafe',
  'restoran',
  'sanat-galerisi',
  'gece-hayati',
]

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
      .in('slug', EXPLORE_CATEGORY_SLUGS)
      .order('id')
      .limit(8),
    supabase
      .from('places')
      .select('id, name, district, image_url, average_rating, total_reviews, category_id, categories!inner(name, slug)')
      .eq('status', 'approved')
      .in('categories.slug', EXPLORE_CATEGORY_SLUGS)
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
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 pb-20 selection:bg-amber-400 selection:text-slate-950">
      {/* Arka planda gece mavisi & altın atmosferik ışık hüzmeleri */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-blue-600/15 blur-[130px]" />
        <div className="absolute top-20 right-0 h-[440px] w-[440px] rounded-full bg-amber-500/10 blur-[130px]" />
      </div>

      <AnimatedBackground />

      <div className="relative z-10">
        {/* HERO BÖLÜMÜ */}
        <section className="max-w-7xl mx-auto px-4 pt-12 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left space-y-7">
              <AnimatedSection>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/25 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-300 mb-5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                  <span>İstanbul'un Dijital Keşif Rehberi</span>
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-normal text-white leading-[1.02] tracking-tight">
                  Bugün nereye{' '}
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent italic">
                    gidelim?
                  </span>
                </h1>

                <p className="font-sans text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed mt-5">
                  Boğaz'ın gizli seyir teraslarından tarihi yarımadanın saklı duraklarına kadar on binlerce mekanı keşfet ve kendi rotanı çiz.
                </p>
              </AnimatedSection>

              <AnimatedSection delay={0.15} variant="zoom">
                <SearchBar />
              </AnimatedSection>

              <AnimatedSection delay={0.25} variant="zoom">
                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <Link
                    href="/kesfet"
                    className="inline-flex items-center gap-2.5 min-h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-sm px-7 py-3.5 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
                  >
                    <Compass className="w-4 h-4" strokeWidth={2.2} />
                    <span>Mekanları Keşfet</span>
                  </Link>

                  <Link
                    href="/rota"
                    className="inline-flex items-center gap-2.5 min-h-12 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-100 font-medium text-sm px-6 py-3.5 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-200"
                  >
                    <Route className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Rota Oluştur</span>
                  </Link>

                  <Link
                    href="/yakinimda"
                    className="inline-flex items-center gap-2 min-h-12 rounded-xl px-4 py-3.5 text-sm font-medium text-slate-300 hover:text-amber-300 transition-colors"
                  >
                    <Navigation className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Yakınımdakiler</span>
                  </Link>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.35} variant="up">
                <div className="pt-1">
                  <IstanbulWeather />
                </div>
              </AnimatedSection>
            </div>

            {/* SAĞ TARAF: GECE MAVİSİ & ALTIN PUSULA ÇARKI */}
            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <div className="relative w-80 h-80 md:w-96 md:h-96">
                <div className="absolute inset-0 rounded-full border border-dashed border-slate-600/50 animate-[spin_30s_linear_infinite] motion-reduce:animate-none" />
                <div className="absolute inset-6 rounded-full border border-amber-400/30 shadow-[0_0_50px_rgba(251,191,36,0.08)]" />
                <div className="absolute inset-12 rounded-full bg-gradient-to-b from-slate-900/90 to-[#070b14]/95 border border-slate-800 backdrop-blur-md" />

                <Link
                  href="/cark"
                  className="absolute inset-0 flex flex-col items-center justify-center group cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-400/20 group-hover:border-amber-300 transition-all duration-300">
                    <Compass
                      className="w-11 h-11 text-amber-400 group-hover:rotate-45 transition-transform duration-500"
                      strokeWidth={1.4}
                    />
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-slate-900/90 px-5 py-2 text-xs font-semibold tracking-wider text-amber-300 group-hover:border-amber-400 group-hover:text-amber-200 transition-all">
                    <span>Kararsızsan Çarkı Çevir</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* İSTATİSTİK KARTLARI */}
        <section className="max-w-7xl mx-auto px-4 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm p-6">
              <div className="font-serif text-3xl md:text-4xl text-white">
                {totalPlacesCount.toLocaleString('tr-TR')}+
              </div>
              <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider font-medium">
                Kayıtlı Mekan
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm p-6">
              <div className="font-serif text-3xl md:text-4xl text-amber-400">39</div>
              <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider font-medium">
                İstanbul İlçesi
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm p-6">
              <div className="font-serif text-3xl md:text-4xl text-sky-400">
                {totalReviewsCount >= 10 ? `${totalReviewsCount.toLocaleString('tr-TR')}+` : 'Canlı'}
              </div>
              <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider font-medium">
                {totalReviewsCount >= 10 ? 'Kullanıcı Yorumu' : 'Topluluk Puanlaması'}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm p-6">
              <div className="font-serif text-3xl md:text-4xl text-emerald-400">
                {totalUsersCount >= 10 ? `${totalUsersCount.toLocaleString('tr-TR')}+` : 'Ücretsiz'}
              </div>
              <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider font-medium">
                {totalUsersCount >= 10 ? 'Aktif Kaşif' : 'Akıllı Rota Planlayıcı'}
              </div>
            </div>
          </div>
        </section>

        {/* KATEGORİLER */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <AnimatedSection variant="left">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-serif text-3xl md:text-4xl text-white">Kategoriler</h2>
                <p className="text-sm text-slate-400 mt-1.5">
                  İlgi alanına ve aradığın atmosfere göre keşfet
                </p>
              </div>
              <Link
                href="/kesfet"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>Tümünü Gör</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            {categories?.map((cat: any, index: number) => {
              const IconComponent = getCategoryIcon(cat.slug)
              return (
                <AnimatedSection key={cat.id} delay={index * 0.04} variant="up">
                  <Link
                    href={`/kesfet?kategori=${cat.slug}`}
                    className="group flex flex-col items-center text-center rounded-2xl bg-slate-900/50 border border-slate-800/80 p-5 hover:border-amber-400/50 hover:bg-slate-800/60 transition-all duration-200"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-all duration-200 mb-3">
                      <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <span className="font-medium text-sm text-slate-200 group-hover:text-amber-300 transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        </section>

        {/* FOTOĞRAFLI GEZİLECEK YERLER VİTRİNİ */}
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <AnimatedSection variant="right">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Şehrin Ruhu</span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl text-white">
                  Öne Çıkan Gezilecek Yerler
                </h2>
              </div>
              <Link
                href="/kesfet?siralama=en-yuksek-puan"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>Tümünü Keşfet</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularPlaces?.map((place: any, index: number) => {
              const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
              const CatIcon = getCategoryIcon(cat?.slug)
              const coverImage = getPlaceImage(place, cat?.slug)

              return (
                <AnimatedSection key={place.id} delay={index * 0.07} variant="up">
                  <Link
                    href={`/mekan/${place.id}`}
                    className="group block overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-amber-400/50 transition-all duration-300 hover:-translate-y-1 shadow-xl shadow-black/30"
                  >
                    {/* FOTOĞRAF ALANI */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
                      <img
                        src={coverImage}
                        alt={place.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/20 to-transparent" />

                      {/* Sol Üst: Kategori Rozeti */}
                      {cat && (
                        <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                          <CatIcon className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
                          <span>{cat.name}</span>
                        </span>
                      )}

                      {/* Sağ Üst: Altın Puan Rozeti */}
                      <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/30 px-2.5 py-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">
                          {Number(place.average_rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* KART İÇERİĞİ */}
                    <div className="p-5">
                      <h3 className="font-serif text-xl text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {place.name}
                      </h3>

                      <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.8} />
                        <span>{place.district || 'İstanbul'}</span>
                      </p>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.8} />
                          <span>{place.total_reviews || 0} yorum</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                          <span>İncele</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      </div>
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