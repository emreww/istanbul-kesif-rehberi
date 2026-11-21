import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'
import MapView from '@/components/map/MapView'
import EmptyState from '@/components/ui/EmptyState'

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
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
]

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildQueryString(sp: Record<string, string | string[] | undefined>, overrides: Record<string, string>) {
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
      id, name, address, average_rating, total_reviews, total_photos,
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
  let recommendationTitle = '⭐ En Yüksek Puanlı Mekanlar'
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

    // Favori kategorilerini rastgele karıştırıp en fazla 5 tanesini seç (her birine eşit pay düşmesi için)
    const activeFavCategories = shuffleArray(Array.from(favoriteCategorySet)).slice(0, 5)

    if (activeFavCategories.length > 0) {
      recommendationTitle = '✨ Sana Özel Öneriler'

      // Her favori kategorisi için ayrı ayrı en yüksek puanlı ilk 30 mekanı paralel çek
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

      // Her kategorinin yüksek puanlı havuzundan favorilenmemişleri alıp rastgele karıştır
      const categoryPools: any[][] = perCategoryResults.map((res) =>
        shuffleArray((res.data ?? []).filter((p) => !favoritedPlaceIds.has(p.id)))
      )

      // Round-robin (sırayla 1'er tane alarak) kategoriler arasında EŞİT BÖL
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

      // Eksik kalan slot varsa yüksek puanlı genel havuzdan rastgele tamamla
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

      // Kartların ekranda kategori sırasına göre dizilmemesi için son bir kez karıştır
      recommendedPlaces = shuffleArray(selected)
    } else {
      // Kullanıcının henüz favorisi yoksa yüksek puanlılardan rastgele 10 mekan göster
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
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <AnimatedSection>
          <h1 className="text-3xl font-bold mb-8 text-gray-100">Keşfet</h1>
        </AnimatedSection>

        {/* Öneriler Bölümü */}
        {recommendedPlaces.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-100 mb-4">{recommendationTitle}</h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recommendedPlaces.map((place) => {
                const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
                return (
                  <Link
                    key={place.id}
                    href={`/mekan/${place.id}`}
                    className="flex-shrink-0 w-64 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
                  >
                    <span className="text-sm text-primary-400">
                      {category?.icon || '📍'} {category?.name}
                    </span>
                    <h3 className="font-bold text-gray-100 mt-2">{place.name}</h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-1">{place.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-200 font-semibold">{Number(place.average_rating).toFixed(1)}</span>
                      <span className="text-gray-400 text-sm">({place.total_reviews} yorum)</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Filtre Paneli */}
        <AnimatedSection delay={0.1}>
          <form className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Arama</label>
                <input type="text" name="q" defaultValue={q || ''} placeholder="Mekan veya adres..." className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                <select name="kategori" defaultValue={kategori || ''} className="input-field">
                  <option value="">✨ Tüm Kategoriler</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.icon ? `${cat.icon} ` : '📍 '}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">İlçe</label>
                <select name="ilce" defaultValue={ilce || ''} className="input-field">
                  <option value="">Tümü</option>
                  {ILCELER.map((ilceAdi) => (
                    <option key={ilceAdi} value={ilceAdi}>{ilceAdi}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fiyat Aralığı</label>
                <select name="fiyat" defaultValue={fiyat || ''} className="input-field">
                  <option value="">Tümü</option>
                  <option value="1">₺</option>
                  <option value="2">₺₺</option>
                  <option value="3">₺₺₺</option>
                  <option value="4">₺₺₺₺</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Puan</label>
                <select name="minPuan" defaultValue={minPuan || ''} className="input-field">
                  <option value="">Seçiniz</option>
                  <option value="4">4+ Yıldız</option>
                  <option value="3">3+ Yıldız</option>
                  <option value="2">2+ Yıldız</option>
                  <option value="1">1+ Yıldız</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sıralama</label>
                <select name="siralama" defaultValue={siralama} className="input-field">
                  {SIRALAMA_SECENEKLERI.map((secenek) => (
                    <option key={secenek.value} value={secenek.value}>{secenek.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Özellikler</label>
              <div className="flex flex-wrap gap-3">
                {OZELLIKLER.map((ozellik) => (
                  <label key={ozellik.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ozellikler"
                      value={ozellik.value}
                      defaultChecked={ozellikler.includes(ozellik.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {ozellik.label}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">Filtrele</button>
          </form>
        </AnimatedSection>

        {/* Görünüm seçici */}
        <div className="flex gap-3 mb-6">
          <Link
            href={`/kesfet?${buildQueryString(sp, { view: 'liste', sayfa: '1' })}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              view !== 'harita'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            📋 Liste
          </Link>
          <Link
            href={`/kesfet?${buildQueryString(sp, { view: 'harita', sayfa: '1' })}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              view === 'harita'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            🗺️ Harita
          </Link>
        </div>

        {/* İçerik */}
        {view === 'harita' ? (
          <AnimatedSection>
            <MapView places={mapPlaces} />
          </AnimatedSection>
        ) : places && places.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place: any, index: number) => {
                const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
                return (
                  <AnimatedSection key={place.id} delay={Math.min(index * 0.03, 0.3)}>
                    <Link href={`/mekan/${place.id}`} className="card block p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-primary-400 border border-white/10 flex items-center gap-1.5">
                          <span>{category?.icon || '📍'}</span>
                          <span>{category?.name || 'Kategori Yok'}</span>
                        </span>
                      </div>
                      <h2 className="font-bold text-lg text-gray-100">{place.name}</h2>
                      <p className="text-gray-400 text-sm line-clamp-1">{place.address}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold text-gray-200">{Number(place.average_rating).toFixed(1)}</span>
                        <span className="text-gray-400 text-sm">({place.total_reviews} yorum)</span>
                      </div>
                    </Link>
                  </AnimatedSection>
                )
              })}
            </div>

            {/* Sayfalama Sekmesi */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12 pb-8">
                {page > 1 ? (
                  <Link
                    href={`/kesfet?${buildQueryString(sp, { sayfa: String(page - 1) })}`}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
                  >
                    ← Önceki
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed">
                    ← Önceki
                  </span>
                )}

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((pageNum, idx, array) => {
                      const showEllipsis = idx > 0 && pageNum - array[idx - 1] > 1
                      return (
                        <div key={pageNum} className="flex items-center gap-1.5">
                          {showEllipsis && <span className="text-gray-500 px-1">...</span>}
                          <Link
                            href={`/kesfet?${buildQueryString(sp, { sayfa: String(pageNum) })}`}
                            className={`px-4 py-2 rounded-xl font-medium transition ${
                              page === pageNum
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
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
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
                  >
                    Sonraki →
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed">
                    Sonraki →
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <AnimatedSection>
            <EmptyState
              icon="😕"
              title="Aradığın kriterlere uygun mekan bulunamadı"
              description="Filtreleri değiştirmeyi dene ya da çarkı çevirerek rastgele bir seçim yap."
              action={
                <Link href="/cark" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition">
                  🎡 Çarkı Çevir!
                </Link>
              }
            />
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}