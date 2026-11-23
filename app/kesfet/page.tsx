import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'
import MapView from '@/components/map/MapView'
import {
  Compass,
  Search,
  MapPin,
  Star,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Inbox,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Keşfet | İstanbul Keşif Rehberi',
  description: "İstanbul'daki mekanları filtreleyin, arayın ve keşfedin.",
}

const PAGE_SIZE = 12

const EXCLUDED_CATEGORY_IDS = [
  5, 9, 10, 11, 14, 16, 18, 19, 20, 22, 24, 26, 28, 29, 32, 33, 34, 36, 38,
  40, 41, 43, 45, 48, 51, 54, 55, 56, 57, 59, 60, 61, 62, 63, 64, 66, 67, 68,
  69, 70, 72, 73, 74, 75, 77, 78, 79, 80, 82, 87, 88, 89, 91, 92, 94, 98, 99,
  100, 101, 102, 103, 104,
  37, 49, 52, 53, 71, 86, 90, 105, 106, 107, 114, 115, 117, 118, 121, 122,
  123, 124, 125, 128, 129, 131, 132, 133, 135, 137,
]

const EXCLUDED_SET = new Set(EXCLUDED_CATEGORY_IDS)
const EXCLUDED_FILTER_VALUE = `(${EXCLUDED_CATEGORY_IDS.join(',')})`

const OZELLIKLER = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cocuk-dostu', label: 'Çocuk Dostu' },
  { value: 'evcil-hayvan-dostu', label: 'Evcil Hayvan Dostu' },
  { value: 'manzara', label: 'Manzara' },
  { value: 'alkol-servisi', label: 'Alkol Servisi' },
  { value: 'vejetaryen', label: 'Vejetaryen Seçenek' },
  { value: 'otopark', label: 'Otopark' },
  { value: 'acik-alan', label: 'Açık Alan' },
  { value: 'deniz-kenari', label: 'Deniz Kenarı' },
  { value: 'canli-muzik', label: 'Canlı Müzik' },
  { value: 'rezervasyon', label: 'Rezervasyon' },
  { value: 'paket-servis', label: 'Paket Servis' },
  { value: 'vegan-secenek', label: 'Vegan Seçenek' },
]

const SIRALAMA_SECENEKLERI = [
  { value: 'populer', label: 'En Popüler' },
  { value: 'en-yeni', label: 'En Yeni' },
  { value: 'en-cok-yorum', label: 'En Çok Yorum' },
  { value: 'en-yuksek-puan', label: 'En Yüksek Puan' },
  { value: 'en-cok-fotograf', label: 'En Çok Fotoğraf' },
]

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu',
]

const inputClass =
  'w-full rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all'

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueryString(
  sp: Record<string, string | string[] | undefined>,
  overrides: Record<string, string>
) {
  const params = new URLSearchParams()
  Object.entries(sp).forEach(([key, val]) => {
    if (!val) return
    if (Array.isArray(val)) {
      val.forEach((v) => params.append(key, v))
    } else {
      params.set(key, val)
    }
  })
  Object.entries(overrides).forEach(([key, val]) => {
    params.set(key, val)
  })
  return params.toString()
}

export default async function KesfetPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const sp = (await searchParams) ?? {}

  const kategori = typeof sp.kategori === 'string' ? sp.kategori : undefined
  const ilce = typeof sp.ilce === 'string' ? sp.ilce : undefined
  const minPuan = typeof sp.minPuan === 'string' && sp.minPuan ? Number(sp.minPuan) : undefined
  const fiyat = typeof sp.fiyat === 'string' && sp.fiyat ? Number(sp.fiyat) : undefined
  const q = typeof sp.q === 'string' && sp.q.trim() ? sp.q.trim() : undefined
  const siralama = typeof sp.siralama === 'string' && sp.siralama ? sp.siralama : 'populer'
  const view = typeof sp.view === 'string' ? sp.view : 'liste'
  const page = typeof sp.sayfa === 'string' ? Math.max(1, Number(sp.sayfa) || 1) : 1
  const ozellikler = sp.ozellikler
    ? Array.isArray(sp.ozellikler)
      ? sp.ozellikler
      : [sp.ozellikler]
    : []

  // 1. Kategorileri ve kullanıcıyı paralel çek
  const [{ data: categories }, { data: { user } }] = await Promise.all([
    supabase.from('categories').select('id, name, slug, icon').order('id'),
    supabase.auth.getUser(),
  ])

  const selectedCategoryId = kategori
    ? categories?.find((c) => c.slug === kategori)?.id
    : undefined

  // 2. Ana listeleme sorgusunu hazırla
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let placesQuery = supabase
    .from('places')
    .select(
      `
      id, name, address, image_url, average_rating, total_reviews, total_photos,
      category_id, price_range, latitude, longitude,
      categories ( name, icon )
    `,
      { count: 'planned' }
    )
    .eq('status', 'approved')

  if (selectedCategoryId) {
    placesQuery = placesQuery.eq('category_id', selectedCategoryId)
  }
  if (ilce) {
    placesQuery = placesQuery.ilike('address', `%${ilce}%`)
  }
  if (q) {
    placesQuery = placesQuery.or(`name.ilike.%${q}%,address.ilike.%${q}%`)
  }
  if (minPuan) {
    placesQuery = placesQuery.gte('average_rating', minPuan)
  }
  if (fiyat) {
    placesQuery = placesQuery.eq('price_range', fiyat)
  }
  if (ozellikler.length > 0) {
    placesQuery = placesQuery.contains('features', ozellikler)
  }

  switch (siralama) {
    case 'en-yeni':
      placesQuery = placesQuery.order('created_at', { ascending: false })
      break
    case 'en-cok-yorum':
      placesQuery = placesQuery.order('total_reviews', { ascending: false })
      break
    case 'en-yuksek-puan':
      placesQuery = placesQuery.order('average_rating', { ascending: false })
      break
    case 'en-cok-fotograf':
      placesQuery = placesQuery.order('total_photos', { ascending: false })
      break
    case 'populer':
    default:
      placesQuery = placesQuery
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
      break
  }

  if (view === 'harita') {
    placesQuery = placesQuery.limit(100)
  } else {
    placesQuery = placesQuery.range(from, to)
  }

  // 3. Öneriler sorgusu (Favorilere göre eşit bölünmüş + yüksek yıldızlı + rastgele)
  let recommendedPlaces: any[] = []
  let isPersonalizedRecommendations = false
  let places: any[] | null = null
  let count: number | null = null

  const TARGET_RECOMMENDATIONS = 10

  const topRatedQuery = supabase
    .from('places')
    .select(`
      id, name, address, average_rating, total_reviews, category_id,
      categories ( name, icon )
    `)
    .eq('status', 'approved')
    .not('category_id', 'in', EXCLUDED_FILTER_VALUE)
    .order('average_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .limit(30)

  if (user) {
    const [{ data: favRows }, { data: topRatedData }, placesResult] = await Promise.all([
      supabase
        .from('favorites')
        .select('place_id')
        .eq('user_id', user.id)
        .limit(50),
      topRatedQuery,
      placesQuery,
    ])

    places = placesResult.data
    count = placesResult.count

    const favoritedPlaceIds = new Set<string>(
      (favRows ?? []).map((r: any) => r.place_id).filter(Boolean)
    )

    const favoriteCategorySet = new Set<number>()

    if (favoritedPlaceIds.size > 0) {
      const { data: favPlaces } = await supabase
        .from('places')
        .select('id, category_id')
        .in('id', Array.from(favoritedPlaceIds))

      ;(favPlaces ?? []).forEach((p: any) => {
        const catId = Number(p.category_id)
        if (catId && !EXCLUDED_SET.has(catId)) {
          favoriteCategorySet.add(catId)
        }
      })
    }

    const activeFavCategories = shuffleArray(Array.from(favoriteCategorySet)).slice(0, 5)

    if (activeFavCategories.length > 0) {
      isPersonalizedRecommendations = true

      const perCategoryResults = await Promise.all(
        activeFavCategories.map((catId) =>
          supabase
            .from('places')
            .select(`
              id, name, address, average_rating, total_reviews, category_id,
              categories ( name, icon )
            `)
            .eq('status', 'approved')
            .eq('category_id', catId)
            .order('average_rating', { ascending: false })
            .order('total_reviews', { ascending: false })
            .limit(30)
        )
      )

      const categoryPools: any[][] = perCategoryResults.map((res) =>
        shuffleArray((res.data ?? []).filter((p) => !favoritedPlaceIds.has(p.id)))
      )

      const selected: any[] = []
      const selectedIds = new Set<string>()
      let addedInRound = true

      while (selected.length < TARGET_RECOMMENDATIONS && addedInRound) {
        addedInRound = false
        for (let i = 0; i < categoryPools.length; i++) {
          if (selected.length >= TARGET_RECOMMENDATIONS) break
          const nextPlace = categoryPools[i].shift()
          if (nextPlace && !selectedIds.has(nextPlace.id)) {
            selected.push(nextPlace)
            selectedIds.add(nextPlace.id)
            addedInRound = true
          }
        }
      }

      if (selected.length < TARGET_RECOMMENDATIONS) {
        const shuffledFallback = shuffleArray(topRatedData ?? [])
        for (const place of shuffledFallback) {
          if (selected.length >= TARGET_RECOMMENDATIONS) break
          if (!favoritedPlaceIds.has(place.id) && !selectedIds.has(place.id)) {
            selected.push(place)
            selectedIds.add(place.id)
          }
        }
      }

      recommendedPlaces = shuffleArray(selected)
    } else {
      recommendedPlaces = shuffleArray(topRatedData ?? []).slice(0, TARGET_RECOMMENDATIONS)
    }
  } else {
    const [{ data: topRatedData }, placesResult] = await Promise.all([
      topRatedQuery,
      placesQuery,
    ])

    places = placesResult.data
    count = placesResult.count
    recommendedPlaces = shuffleArray(topRatedData ?? []).slice(0, TARGET_RECOMMENDATIONS)
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1
  const mapPlaces = (places ?? []).filter(
    (place: any) => place.latitude && place.longitude
  )

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 pb-20 selection:bg-amber-400 selection:text-slate-950">
      {/* Gece mavisi & altın atmosferik ışık katmanları */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-blue-600/15 blur-[130px]" />
        <div className="absolute top-20 right-0 h-[440px] w-[440px] rounded-full bg-amber-500/10 blur-[130px]" />
      </div>

      <AnimatedBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        {/* ÜST BAŞLIK */}
        <AnimatedSection>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/25 px-3.5 py-1 text-xs font-medium text-amber-300 mb-3">
                <Compass className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                <span>39 İlçe · Mekan Rehberi</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white">
                Mekanları Keşfet
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-1.5">
                İlçe, kategori, puan ve özelliklere göre filtrele; harita veya liste görünümünde incele.
              </p>
            </div>

            {typeof count === 'number' && (
              <div className="text-xs sm:text-sm text-slate-400">
                <span className="font-semibold text-amber-400">
                  {count.toLocaleString('tr-TR')}
                </span>{' '}
                mekan listeleniyor
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ÖNERİLER BANDI */}
        {recommendedPlaces.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-serif text-xl sm:text-2xl text-white flex items-center gap-2">
                {isPersonalizedRecommendations ? (
                  <Sparkles className="w-5 h-5 text-amber-400" strokeWidth={1.9} />
                ) : (
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                )}
                <span>
                  {isPersonalizedRecommendations
                    ? 'Sana Özel Öneriler'
                    : 'En Yüksek Puanlı Mekanlar'}
                </span>
              </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
              {recommendedPlaces.map((place) => {
                const category = Array.isArray(place.categories)
                  ? place.categories[0]
                  : place.categories
                return (
                  <Link
                    key={place.id}
                    href={`/mekan/${place.id}`}
                    className="group shrink-0 w-72 rounded-2xl bg-[#0c1220] border border-slate-800/90 hover:border-amber-400/50 p-4 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3 text-amber-400" strokeWidth={2} />
                        <span>{category?.name || 'Mekan'}</span>
                      </span>
                      <h3 className="font-serif text-lg text-white group-hover:text-amber-300 transition-colors mt-3 line-clamp-1">
                        {place.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                        {place.address || 'İstanbul'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-slate-100 font-semibold">
                          {Number(place.average_rating).toFixed(1)}
                        </span>
                        <span className="text-slate-500">
                          ({place.total_reviews || 0} yorum)
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* FİLTRE PANELİ */}
        <AnimatedSection delay={0.1}>
          <form className="rounded-2xl bg-[#0c1220]/90 border border-slate-800/90 shadow-2xl shadow-black/40 p-5 sm:p-7 mb-8 space-y-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" strokeWidth={2} />
                <span>Detaylı Filtreleme</span>
              </div>
              <Link
                href="/kesfet"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>Filtreleri Sıfırla</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Arama
                </label>
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ''}
                    placeholder="Mekan veya adres..."
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Kategori
                </label>
                <select
                  name="kategori"
                  defaultValue={kategori || ''}
                  className={inputClass}
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  İlçe
                </label>
                <select
                  name="ilce"
                  defaultValue={ilce || ''}
                  className={inputClass}
                >
                  <option value="">Tüm İlçeler</option>
                  {ILCELER.map((ilceAdi) => (
                    <option key={ilceAdi} value={ilceAdi}>
                      {ilceAdi}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Fiyat Aralığı
                </label>
                <select
                  name="fiyat"
                  defaultValue={fiyat || ''}
                  className={inputClass}
                >
                  <option value="">Tümü</option>
                  <option value="1">₺ (Ekonomik)</option>
                  <option value="2">₺₺ (Orta)</option>
                  <option value="3">₺₺₺ (Üst Segment)</option>
                  <option value="4">₺₺₺₺ (Lüks)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Minimum Puan
                </label>
                <select
                  name="minPuan"
                  defaultValue={minPuan || ''}
                  className={inputClass}
                >
                  <option value="">Fark Etmez</option>
                  <option value="4">4.0+ Yıldız</option>
                  <option value="3">3.0+ Yıldız</option>
                  <option value="2">2.0+ Yıldız</option>
                  <option value="1">1.0+ Yıldız</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                  Sıralama
                </label>
                <select
                  name="siralama"
                  defaultValue={siralama}
                  className={inputClass}
                >
                  {SIRALAMA_SECENEKLERI.map((secenek) => (
                    <option key={secenek.value} value={secenek.value}>
                      {secenek.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2.5">
                Özellikler
              </label>
              <div className="flex flex-wrap gap-2.5">
                {OZELLIKLER.map((ozellik) => (
                  <label
                    key={ozellik.value}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900/75 border border-slate-800 hover:border-amber-400/40 px-3 py-2 text-xs font-medium text-slate-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="ozellikler"
                      value={ozellik.value}
                      defaultChecked={ozellikler.includes(ozellik.value)}
                      className="rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400/30"
                    />
                    <span>{ozellik.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/15 hover:from-amber-300 hover:to-amber-400 transition-all duration-200 cursor-pointer"
            >
              <Search className="w-4 h-4" strokeWidth={2.2} />
              <span>Filtreleri Uygula</span>
            </button>
          </form>
        </AnimatedSection>

        {/* GÖRÜNÜM SEÇİCİ (LİSTE / HARİTA) */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="inline-flex rounded-xl bg-[#0c1220] border border-slate-800/90 p-1">
            <Link
              href={`/kesfet?${buildQueryString(sp, { view: 'liste', sayfa: '1' })}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                view !== 'harita'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" strokeWidth={2} />
              <span>Liste Görünümü</span>
            </Link>
            <Link
              href={`/kesfet?${buildQueryString(sp, { view: 'harita', sayfa: '1' })}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                view === 'harita'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4" strokeWidth={2} />
              <span>Harita Görünümü</span>
            </Link>
          </div>
        </div>

        {/* ANA İÇERİK */}
        {view === 'harita' ? (
          <AnimatedSection>
            <div className="rounded-2xl overflow-hidden border border-slate-800/90 bg-[#0c1220]">
              <MapView places={mapPlaces} />
            </div>
          </AnimatedSection>
        ) : places && places.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place: any, index: number) => {
                const category = Array.isArray(place.categories)
                  ? place.categories[0]
                  : place.categories

                return (
                  <AnimatedSection key={place.id} delay={Math.min(index * 0.03, 0.3)}>
                    <Link
                      href={`/mekan/${place.id}`}
                      className="group h-full flex flex-col justify-between rounded-2xl bg-[#0c1220] border border-slate-800/90 hover:border-amber-400/60 p-6 transition-all duration-200 shadow-xl shadow-black/30"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-900 text-amber-300 border border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
                            <span>{category?.name || 'Kategori Yok'}</span>
                          </span>

                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/25 px-2.5 py-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-amber-300">
                              {Number(place.average_rating).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <h2 className="font-serif text-xl text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {place.name}
                        </h2>

                        <p className="text-slate-400 text-sm mt-1.5 line-clamp-1">
                          {place.address || 'İstanbul'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-800/80 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.8} />
                          <span>{place.total_reviews || 0} yorum</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                          <span>İncele</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </Link>
                  </AnimatedSection>
                )
              })}
            </div>

            {/* SAYFALAMA */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12 pb-8">
                {page > 1 ? (
                  <Link
                    href={`/kesfet?${buildQueryString(sp, { sayfa: String(page - 1) })}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1220] border border-slate-800 text-xs sm:text-sm font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-300 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Önceki</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1220]/50 border border-slate-800/50 text-xs sm:text-sm text-slate-600 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Önceki</span>
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((pageNum, idx, array) => {
                      const showEllipsis = idx > 0 && pageNum - array[idx - 1] > 1
                      return (
                        <div key={pageNum} className="flex items-center gap-1.5">
                          {showEllipsis && (
                            <span className="text-slate-500 px-1 text-xs">...</span>
                          )}
                          <Link
                            href={`/kesfet?${buildQueryString(sp, { sayfa: String(pageNum) })}`}
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                              page === pageNum
                                ? 'bg-amber-400 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
                                : 'bg-[#0c1220] border border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-300'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        </div>
                      )
                    })}
                </div>

                {page < totalPages ? (
                  <Link
                    href={`/kesfet?${buildQueryString(sp, { sayfa: String(page + 1) })}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1220] border border-slate-800 text-xs sm:text-sm font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-300 transition"
                  >
                    <span>Sonraki</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1220]/50 border border-slate-800/50 text-xs sm:text-sm text-slate-600 cursor-not-allowed">
                    <span>Sonraki</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <AnimatedSection>
            <div className="rounded-2xl bg-[#0c1220] border border-slate-800/90 p-10 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
                <Inbox className="w-6 h-6" strokeWidth={1.8} />
              </div>
              <h3 className="font-serif text-2xl text-white">
                Aradığın kriterlere uygun mekan bulunamadı
              </h3>
              <p className="text-slate-400 text-sm max-w-md">
                Filtreleri değiştirmeyi dene ya da çarkı çevirerek rastgele bir seçim yap.
              </p>
              <Link
                href="/cark"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-sm rounded-xl hover:from-amber-300 hover:to-amber-400 transition"
              >
                <Compass className="w-4 h-4" strokeWidth={2.2} />
                <span>Çarkı Çevir</span>
              </Link>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}