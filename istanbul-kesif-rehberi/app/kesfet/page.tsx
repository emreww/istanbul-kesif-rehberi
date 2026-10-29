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

export default async function KesfetPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const sp = (await searchParams) as any

  const kategori = sp?.kategori as string | undefined
  const ilce = sp?.ilce as string | undefined
  const minPuan = sp?.minPuan ? Number(sp.minPuan) : undefined
  const fiyat = sp?.fiyat ? Number(sp.fiyat) : undefined
  const q = sp?.q as string | undefined
  const siralama = (sp?.siralama as string) || 'populer'
  const page = sp?.sayfa ? Math.max(1, Number(sp.sayfa)) : 1
  const ozellikler = sp?.ozellikler
    ? Array.isArray(sp.ozellikler)
      ? sp.ozellikler
      : [sp.ozellikler]
    : []

  // Categories sorgusu (Emoji desteği eklendi)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .order('id')

  // --- Kullanıcıya özel öneriler ---
  const { data: { user } } = await supabase.auth.getUser()
  let recommendedPlaces: any[] = []

  if (user) {
    const { data: favoriteData } = await supabase
      .from('favorites')
      .select('place_id, places ( category_id )')
      .eq('user_id', user.id)
      .limit(10)

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('place_id, places ( category_id )')
      .eq('user_id', user.id)
      .limit(10)

    const categoryCounts: Record<number, number> = {}
    const interactedPlaceIds = new Set<string>()

    const processItems = (items: any, weight: number) => {
      if (!items) return
      const array = Array.isArray(items) ? items : [items]
      array.forEach((item: any) => {
        const place = Array.isArray(item.places) ? item.places[0] : item.places
        const catId = place?.category_id
        if (catId) categoryCounts[catId] = (categoryCounts[catId] || 0) + weight
        if (item.place_id) interactedPlaceIds.add(item.place_id)
      })
    }

    processItems(favoriteData, 1)
    processItems(reviewData, 2)

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([catId]) => Number(catId))

    if (topCategories.length > 0) {
      const { data } = await supabase
        .from('places')
        .select(`
          id, name, district, average_rating, total_reviews, category_id,
          categories ( name, icon )
        `)
        .eq('status', 'approved')
        .in('category_id', topCategories)
        .order('average_rating', { ascending: false })
        .limit(10)

      recommendedPlaces = data ?? []
    }

    recommendedPlaces = recommendedPlaces.filter(p => !interactedPlaceIds.has(p.id))

    if (recommendedPlaces.length < 5) {
      const { data: fallback } = await supabase
        .from('places')
        .select(`
          id, name, district, average_rating, total_reviews, category_id,
          categories ( name, icon )
        `)
        .eq('status', 'approved')
        .order('average_rating', { ascending: false })
        .limit(10)

      const combined = [...recommendedPlaces]
      ;(fallback ?? []).forEach((place) => {
        if (!interactedPlaceIds.has(place.id) && !combined.find(p => p.id === place.id)) {
          combined.push(place)
        }
      })
      recommendedPlaces = combined.slice(0, 10)
    }
  }

  // --- Sayfalamalı Normal Filtreleme Sorgusu ---
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('places')
    .select(`
      id, name, district, average_rating, total_reviews, total_photos, 
      category_id, price_range, latitude, longitude,
      categories ( name, icon )
    `, { count: 'exact' })
    .eq('status', 'approved')

  if (kategori) {
    const selectedCategory = categories?.find((c) => c.slug === kategori)
    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory.id)
    }
  }

  if (ilce) {
    query = query.eq('district', ilce)
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,district.ilike.%${q}%`)
  }

  if (minPuan) {
    query = query.gte('average_rating', minPuan)
  }

  if (fiyat) {
    query = query.eq('price_range', fiyat)
  }

  if (ozellikler.length > 0) {
    query = query.contains('features', ozellikler)
  }

  switch (siralama) {
    case 'populer':
      query = query
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
      break
    case 'en-yeni':
      query = query.order('created_at', { ascending: false })
      break
    case 'en-cok-yorum':
      query = query.order('total_reviews', { ascending: false })
      break
    case 'en-yuksek-puan':
      query = query.order('average_rating', { ascending: false })
      break
    case 'en-cok-fotograf':
      query = query.order('total_photos', { ascending: false })
      break
    default:
      query = query
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
  }

  if (sp?.view !== 'harita') {
    query = query.range(from, to)
  } else {
    query = query.limit(100)
  }

  const { data: places, count } = await query
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  const mapPlaces = (places ?? []).filter(
    (place: any) => place.latitude && place.longitude
  )

  const getPageUrl = (newPage: number) => {
    const params = new URLSearchParams(sp as any)
    params.set('sayfa', newPage.toString())
    return `/kesfet?${params.toString()}`
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <AnimatedSection>
          <h1 className="text-3xl font-bold mb-8 text-gray-100">Keşfet</h1>
        </AnimatedSection>

        {/* Sana Özel Öneriler */}
        {recommendedPlaces.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-100 mb-4">✨ Sana Özel Öneriler</h2>
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
                    <p className="text-gray-400 text-sm mt-1">{place.district}</p>
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
                <input type="text" name="q" defaultValue={q || ''} placeholder="Mekan veya ilçe..." className="input-field" />
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
          <a
            href={`/kesfet?${new URLSearchParams({ ...(sp as any), view: 'liste' }).toString()}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              (!sp?.view || sp.view === 'liste')
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            📋 Liste
          </a>
          <a
            href={`/kesfet?${new URLSearchParams({ ...(sp as any), view: 'harita' }).toString()}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              sp?.view === 'harita'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            🗺️ Harita
          </a>
        </div>

        {/* İçerik */}
        {sp?.view === 'harita' ? (
          <AnimatedSection>
            <MapView places={mapPlaces} />
          </AnimatedSection>
        ) : (
          places && places.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {places.map((place: any, index: number) => {
                  const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
                  return (
                    <AnimatedSection key={place.id} delay={index * 0.03}>
                      <a href={`/mekan/${place.id}`} className="card block p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-primary-400 border border-white/10 flex items-center gap-1.5">
                            <span>{category?.icon || '📍'}</span>
                            <span>{category?.name || 'Kategori Yok'}</span>
                          </span>
                        </div>
                        <h2 className="font-bold text-lg text-gray-100">{place.name}</h2>
                        <p className="text-gray-400 text-sm">{place.district}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-yellow-500">★</span>
                          <span className="font-semibold text-gray-200">{Number(place.average_rating).toFixed(1)}</span>
                          <span className="text-gray-400 text-sm">({place.total_reviews} yorum)</span>
                        </div>
                      </a>
                    </AnimatedSection>
                  )
                })}
              </div>

              {/* Sayfalama Sekmesi (Pagination UI) */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 pb-8">
                  {page > 1 ? (
                    <Link
                      href={getPageUrl(page - 1)}
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
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((pageNum, idx, array) => {
                        const showEllipsis = idx > 0 && pageNum - array[idx - 1] > 1
                        return (
                          <div key={pageNum} className="flex items-center gap-1.5">
                            {showEllipsis && <span className="text-gray-500 px-1">...</span>}
                            <Link
                              href={getPageUrl(pageNum)}
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
                      href={getPageUrl(page + 1)}
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
                  <a href="/cark" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition">
                    🎡 Çarkı Çevir!
                  </a>
                }
              />
            </AnimatedSection>
          )
        )}
      </div>
    </div>
  )
}