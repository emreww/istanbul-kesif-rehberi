'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'

interface NearbyPlace {
  id: string
  name: string
  district: string
  average_rating: number
  total_reviews: number
  latitude: number
  longitude: number
  price_range: number | null
  distance_km: number
}

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
]

export default function YakinimdaPage() {
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(true)
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Filtre state'leri
  const [q, setQ] = useState('')
  const [kategori, setKategori] = useState('')
  const [fiyat, setFiyat] = useState('')
  const [minPuan, setMinPuan] = useState('')

  const supabase = useMemo(() => createClient(), [])

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

  // Kategorileri çek
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('id')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [supabase])

  // Konum al
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum paylaşımını desteklemiyor.')
      setLoading(false)
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationLoading(false)
      },
      () => {
        setError('Konum izni reddedildi. Konum paylaşımına izin vererek yakındaki mekanları görebilirsiniz.')
        setLoading(false)
        setLocationLoading(false)
      }
    )
  }, [])

  const fetchPlaces = useCallback(async () => {
    if (!userLocation) return

    setLoading(true)
    setError('')

    let query = supabase
      .from('places')
      .select('id, name, district, average_rating, total_reviews, latitude, longitude, price_range, category_id')
      .eq('status', 'approved')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    // Arama
    if (q.trim()) {
      query = query.or(`name.ilike.%${q}%,district.ilike.%${q}%`)
    }

    // Kategori
    if (kategori) {
      query = query.eq('category_id', Number(kategori))
    }

    // Fiyat aralığı
    if (fiyat) {
      query = query.eq('price_range', Number(fiyat))
    }

    // Minimum puan
    if (minPuan) {
      query = query.gte('average_rating', Number(minPuan))
    }

    const { data } = await query

    if (data) {
      const withDistance = data
        .map((place: any) => ({
          ...place,
          distance_km: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            place.latitude,
            place.longitude
          ),
        }))
        .sort((a: any, b: any) => a.distance_km - b.distance_km)

      setPlaces(withDistance.slice(0, 20))
    }
    setLoading(false)
  }, [supabase, userLocation, q, kategori, fiyat, minPuan])

  useEffect(() => {
    if (userLocation) {
      fetchPlaces()
    }
  }, [userLocation, fetchPlaces])

  if (locationLoading) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Konumunuz alınıyor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
          <AnimatedSection>
            <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-5xl mb-3">📍</div>
              <p className="text-gray-300">{error}</p>
              <button onClick={() => window.location.reload()} className="btn-primary mt-6">
                Tekrar Dene
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
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-8">📍 Yakınımdaki Mekanlar</h1>
        </AnimatedSection>

        {/* Filtre Paneli */}
        <AnimatedSection delay={0.1}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              fetchPlaces()
            }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Arama</label>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Mekan veya ilçe..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="input-field">
                  <option value="">Tümü</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
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
            <button type="submit" className="btn-primary w-full">Filtrele</button>
          </form>
        </AnimatedSection>

        {/* Sonuçlar */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : places.length > 0 ? (
          <div className="space-y-4">
            {places.map((place, index) => (
              <AnimatedSection key={place.id} delay={index * 0.05}>
                <Link
                  href={`/mekan/${place.id}`}
                  className="block bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-gray-100">{place.name}</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {place.district} • ⭐ {Number(place.average_rating).toFixed(1)} ({place.total_reviews} yorum)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-400">
                        {place.distance_km < 1
                          ? `${Math.round(place.distance_km * 1000)} m`
                          : `${place.distance_km.toFixed(1)} km`}
                      </div>
                      <p className="text-xs text-gray-400">mesafede</p>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">😔</div>
            <p className="text-gray-400">Kriterlere uygun yakın mekan bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  )
}