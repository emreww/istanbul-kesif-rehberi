'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import {
  MapPin,
  Search,
  Star,
  Navigation,
  RefreshCw,
  SlidersHorizontal,
  X,
  Footprints,
  ExternalLink,
  Compass,
} from 'lucide-react'

interface NearbyPlace {
  id: string
  name: string
  address: string
  average_rating: number
  total_reviews: number
  latitude: number
  longitude: number
  price_range: number | null
  category_id: number | null
  distance_km: number
}

interface CategoryItem {
  id: number
  name: string
}

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '15 km', value: 15 },
  { label: 'Tümü', value: 0 },
]

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatPriceRange(range: number | null): string {
  if (!range || range < 1) return ''
  return '₺'.repeat(Math.min(4, range))
}

function estimateWalkTime(km: number): string {
  const mins = Math.max(1, Math.round((km / 4.8) * 60))
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `~${h} sa ${m} dk yürüyüş` : `~${h} sa yürüyüş`
  }
  return `~${mins} dk yürüyüş`
}

export default function YakinimdaPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rawPlaces, setRawPlaces] = useState<NearbyPlace[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(true)
  const [isRefreshingLoc, setIsRefreshingLoc] = useState(false)
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Filtre state'leri
  const [q, setQ] = useState('')
  const [kategori, setKategori] = useState('')
  const [fiyat, setFiyat] = useState('')
  const [minPuan, setMinPuan] = useState('')
  const [maxRadius, setMaxRadius] = useState<number>(5)
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((c) => map.set(Number(c.id), c.name))
    return map
  }, [categories])

  // Kategorileri çek
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name').order('id')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [supabase])

  // Konum alma fonksiyonu
  const requestLocation = useCallback((isManualRefresh = false) => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum paylaşımını desteklemiyor.')
      setLoading(false)
      setLocationLoading(false)
      return
    }

    if (isManualRefresh) {
      setIsRefreshingLoc(true)
    } else {
      setLocationLoading(true)
    }
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationLoading(false)
        setIsRefreshingLoc(false)
      },
      () => {
        setError('Konum izni reddedildi. Konum paylaşımına izin vererek yakındaki mekanları görebilirsiniz.')
        setLoading(false)
        setLocationLoading(false)
        setIsRefreshingLoc(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    requestLocation(false)
  }, [requestLocation])

  // Veritabanından mekanları çek
  const fetchPlaces = useCallback(async () => {
    if (!userLocation) return

    setLoading(true)
    setError('')

    let query = supabase
      .from('places')
      .select('id, name, address, average_rating, total_reviews, latitude, longitude, price_range, category_id')
      .eq('status', 'approved')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (maxRadius > 0) {
      const latDelta = (maxRadius * 1.25) / 111
      const lngDelta = (maxRadius * 1.25) / (111 * Math.cos((userLocation.latitude * Math.PI) / 180))
      query = query
        .gte('latitude', userLocation.latitude - latDelta)
        .lte('latitude', userLocation.latitude + latDelta)
        .gte('longitude', userLocation.longitude - lngDelta)
        .lte('longitude', userLocation.longitude + lngDelta)
    }

    if (kategori) {
      query = query.eq('category_id', Number(kategori))
    }

    if (fiyat) {
      query = query.eq('price_range', Number(fiyat))
    }

    if (minPuan) {
      query = query.gte('average_rating', Number(minPuan))
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError('Mekanlar yüklenirken bir sorun oluştu.')
      setLoading(false)
      return
    }

    if (data) {
      const withDistance: NearbyPlace[] = data
        .map((place: any) => ({
          ...place,
          distance_km: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(place.latitude),
            Number(place.longitude)
          ),
        }))
        .filter((place: NearbyPlace) => (maxRadius > 0 ? place.distance_km <= maxRadius : true))

      setRawPlaces(withDistance)
    }

    setLoading(false)
  }, [supabase, userLocation, kategori, fiyat, minPuan, maxRadius])

  useEffect(() => {
    if (userLocation) {
      fetchPlaces()
    }
  }, [userLocation, fetchPlaces])

  // İstemci tarafında anlık metin araması ve sıralama
  const filteredPlaces = useMemo(() => {
    const search = q.trim().toLocaleLowerCase('tr-TR')
    const list = search
      ? rawPlaces.filter(
          (p) =>
            p.name.toLocaleLowerCase('tr-TR').includes(search) ||
            (p.address && p.address.toLocaleLowerCase('tr-TR').includes(search))
        )
      : [...rawPlaces]

    list.sort((a, b) => {
      if (sortBy === 'rating') {
        return Number(b.average_rating) - Number(a.average_rating) || a.distance_km - b.distance_km
      }
      return a.distance_km - b.distance_km
    })

    return list.slice(0, 30)
  }, [rawPlaces, q, sortBy])

  const hasActiveFilters = Boolean(q || kategori || fiyat || minPuan || maxRadius !== 5)

  const resetFilters = () => {
    setQ('')
    setKategori('')
    setFiyat('')
    setMinPuan('')
    setMaxRadius(5)
    setSortBy('distance')
  }

  if (locationLoading) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="text-center bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-base font-semibold text-gray-100">Konumunuz Alınıyor</h2>
            <p className="text-xs text-gray-400 mt-1.5">
              Çevrenizdeki en yakın mekanlar sıralanıyor...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 max-w-xl mx-auto px-4 py-16">
          <AnimatedSection>
            <div className="text-center py-12 bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
                <MapPin className="w-7 h-7" />
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={() => requestLocation(false)}
                className="btn-primary mt-6 inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tekrar Dene</span>
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Başlık ve Konum Yenile */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Konum Aktif</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center gap-2.5">
                <Compass className="w-7 h-7 text-amber-400 shrink-0" />
                <span>Yakınımdaki Mekanlar</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => requestLocation(true)}
              disabled={isRefreshingLoc}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/10 hover:border-amber-400/40 text-xs font-semibold text-gray-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshingLoc ? 'animate-spin' : ''}`} />
              <span>{isRefreshingLoc ? 'Güncelleniyor...' : 'Konumu Yenile'}</span>
            </button>
          </div>
        </AnimatedSection>

        {/* Mesafe Yarıçapı & Sıralama */}
        <AnimatedSection delay={0.05}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-400 mr-1">Mesafe:</span>
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMaxRadius(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    maxRadius === opt.value
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 border border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-white/[0.05] backdrop-blur-md p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSortBy('distance')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sortBy === 'distance' ? 'bg-white/15 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                En Yakın
              </button>
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  sortBy === 'rating' ? 'bg-white/15 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                En Yüksek Puan
              </button>
            </div>
          </div>
        </AnimatedSection>

        {/* Filtre Paneli (Orijinal glassmorphism stili) */}
        <AnimatedSection delay={0.1}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Filtrele</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Sıfırla</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Arama</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Mekan veya ilçe..."
                    className="input-field pl-9 pr-8"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => setQ('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="input-field">
                  <option value="">Tümü</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fiyat Aralığı</label>
                <select value={fiyat} onChange={(e) => setFiyat(e.target.value)} className="input-field">
                  <option value="">Tümü</option>
                  <option value="1">₺</option>
                  <option value="2">₺₺</option>
                  <option value="3">₺₺₺</option>
                  <option value="4">₺₺₺₺</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Puan</label>
                <select value={minPuan} onChange={(e) => setMinPuan(e.target.value)} className="input-field">
                  <option value="">Seçiniz</option>
                  <option value="4">4+ Yıldız</option>
                  <option value="3">3+ Yıldız</option>
                  <option value="2">2+ Yıldız</option>
                  <option value="1">1+ Yıldız</option>
                </select>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Sonuç Sayısı */}
        {!loading && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4 px-1">
            <span>
              <strong className="text-gray-100">{filteredPlaces.length}</strong> mekan bulundu
              {maxRadius > 0 ? ` (${maxRadius} km çevrede)` : ''}
            </span>
          </div>
        )}

        {/* Sonuçlar */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredPlaces.length > 0 ? (
          <div className="space-y-4">
            {filteredPlaces.map((place, index) => {
              const catName = place.category_id ? categoryMap.get(Number(place.category_id)) : null
              const priceLabel = formatPriceRange(place.price_range)
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`

              return (
                <AnimatedSection key={place.id} delay={Math.min(index * 0.04, 0.3)}>
                  <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-amber-400/35 rounded-2xl p-5 md:p-6 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Sol Bilgi Alanı */}
                      <Link href={`/mekan/${place.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {catName && (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/25 text-amber-300 text-xs font-semibold">
                              {catName}
                            </span>
                          )}
                          {priceLabel && (
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 text-xs font-medium">
                              {priceLabel}
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg md:text-xl font-bold text-gray-100 group-hover:text-amber-300 transition truncate">
                          {place.name}
                        </h2>

                        <p className="text-gray-400 text-sm mt-1 truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{place.address}</span>
                        </p>

                        <div className="flex items-center gap-3 mt-2.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{Number(place.average_rating).toFixed(1)}</span>
                            <span className="text-gray-400 font-normal">({place.total_reviews} yorum)</span>
                          </span>

                          <span className="text-gray-600">•</span>

                          <span className="inline-flex items-center gap-1 text-gray-300">
                            <Footprints className="w-3.5 h-3.5 text-gray-400" />
                            <span>{estimateWalkTime(place.distance_km)}</span>
                          </span>
                        </div>
                      </Link>

                      {/* Sağ Mesafe & Yol Tarifi Alanı */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
                        <div className="sm:text-right">
                          <div className="text-2xl font-bold text-amber-400 leading-none">
                            {place.distance_km < 1
                              ? `${Math.round(place.distance_km * 1000)} m`
                              : `${place.distance_km.toFixed(1)} km`}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">mesafede</p>
                        </div>

                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-400 text-gray-100 hover:text-slate-950 border border-white/15 hover:border-amber-400 text-xs font-semibold transition"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Yol Tarifi</span>
                          <ExternalLink className="w-3 h-3 opacity-75" />
                        </a>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-gray-300 mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-100">Kriterlere uygun yakın mekan bulunamadı</h3>
            <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-md mx-auto">
              Mesafe yarıçapını artırabilir veya aktif filtreleri sıfırlayabilirsiniz.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 text-xs font-semibold transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Filtreleri Temizle</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}