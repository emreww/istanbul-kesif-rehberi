'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'

interface Place {
  id: string
  name: string
  district: string
  average_rating: number
  total_reviews: number
  price_range: number | null
  features: string[] | null
  phone: string | null
  website: string | null
  working_hours: string | null
  category_id: number
  categories?: any // Supabase'den dizi veya obje gelebilir, any yapıyoruz
}

export default function KarsilastirPage() {
  const [query1, setQuery1] = useState('')
  const [query2, setQuery2] = useState('')
  const [suggestions1, setSuggestions1] = useState<Place[]>([])
  const [suggestions2, setSuggestions2] = useState<Place[]>([])
  const [place1, setPlace1] = useState<Place | null>(null)
  const [place2, setPlace2] = useState<Place | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const searchPlaces = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) return []
      const { data } = await supabase
        .from('places')
        .select(`
          id, name, district, average_rating, total_reviews, price_range, features, phone, website, working_hours, category_id,
          categories ( name )
        `)
        .eq('status', 'approved')
        .or(`name.ilike.%${query}%,district.ilike.%${query}%`)
        .limit(5)

      return (data ?? []) as Place[]
    },
    [supabase]
  )

  useEffect(() => {
    const timer = setTimeout(async () => {
      const results = await searchPlaces(query1)
      setSuggestions1(results)
    }, 300)
    return () => clearTimeout(timer)
  }, [query1, searchPlaces])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const results = await searchPlaces(query2)
      setSuggestions2(results)
    }, 300)
    return () => clearTimeout(timer)
  }, [query2, searchPlaces])

  const formatPrice = (price: number | null) => {
    if (!price) return 'Belirtilmemiş'
    return '₺'.repeat(price)
  }

  const formatFeatures = (features: string[] | null) => {
    if (!features || features.length === 0) return 'Belirtilmemiş'
    return features.join(', ')
  }

  const selectPlace1 = (place: Place) => {
    setPlace1(place)
    setQuery1('')
    setSuggestions1([])
  }

  const selectPlace2 = (place: Place) => {
    setPlace2(place)
    setQuery2('')
    setSuggestions2([])
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-8">🆚 Mekan Karşılaştır</h1>
        </AnimatedSection>

        {/* Mekan seçim alanları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Sol mekan seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">1. Mekan</label>
            <input
              type="text"
              value={query1}
              onChange={(e) => setQuery1(e.target.value)}
              placeholder="Mekan adı veya ilçe..."
              className="input-field"
            />
            {suggestions1.length > 0 && (
              <div className="mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
                {suggestions1.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectPlace1(place)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 transition"
                  >
                    <div className="font-semibold text-gray-100">{place.name}</div>
                    <div className="text-sm text-gray-400">{place.district}</div>
                  </button>
                ))}
              </div>
            )}
            {place1 && (
              <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="font-bold text-gray-100">{place1.name}</div>
                <div className="text-sm text-gray-400">{place1.district}</div>
              </div>
            )}
          </div>

          {/* Sağ mekan seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">2. Mekan</label>
            <input
              type="text"
              value={query2}
              onChange={(e) => setQuery2(e.target.value)}
              placeholder="Mekan adı veya ilçe..."
              className="input-field"
            />
            {suggestions2.length > 0 && (
              <div className="mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
                {suggestions2.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => selectPlace2(place)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 transition"
                  >
                    <div className="font-semibold text-gray-100">{place.name}</div>
                    <div className="text-sm text-gray-400">{place.district}</div>
                  </button>
                ))}
              </div>
            )}
            {place2 && (
              <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="font-bold text-gray-100">{place2.name}</div>
                <div className="text-sm text-gray-400">{place2.district}</div>
              </div>
            )}
          </div>
        </div>

        {/* Karşılaştırma tablosu */}
        {place1 && place2 && (
          <AnimatedSection>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-3 text-gray-400 font-medium w-1/3">Özellik</th>
                    <th className="text-left p-3 text-gray-100 font-semibold">
                      <Link href={`/mekan/${place1.id}`} className="hover:text-primary-400 transition">{place1.name}</Link>
                    </th>
                    <th className="text-left p-3 text-gray-100 font-semibold">
                      <Link href={`/mekan/${place2.id}`} className="hover:text-primary-400 transition">{place2.name}</Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">İlçe</td>
                    <td className="p-3 text-gray-300">{place1.district}</td>
                    <td className="p-3 text-gray-300">{place2.district}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Kategori</td>
                    <td className="p-3 text-gray-300">{place1.categories?.[0]?.name || place1.categories?.name || 'Belirtilmemiş'}</td>
                    <td className="p-3 text-gray-300">{place2.categories?.[0]?.name || place2.categories?.name || 'Belirtilmemiş'}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Ortalama Puan</td>
                    <td className="p-3 text-gray-300">⭐ {Number(place1.average_rating).toFixed(1)} ({place1.total_reviews} yorum)</td>
                    <td className="p-3 text-gray-300">⭐ {Number(place2.average_rating).toFixed(1)} ({place2.total_reviews} yorum)</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Fiyat Aralığı</td>
                    <td className="p-3 text-gray-300">{formatPrice(place1.price_range)}</td>
                    <td className="p-3 text-gray-300">{formatPrice(place2.price_range)}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Telefon</td>
                    <td className="p-3 text-gray-300">{place1.phone || 'Belirtilmemiş'}</td>
                    <td className="p-3 text-gray-300">{place2.phone || 'Belirtilmemiş'}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Web Sitesi</td>
                    <td className="p-3 text-gray-300">{place1.website || 'Belirtilmemiş'}</td>
                    <td className="p-3 text-gray-300">{place2.website || 'Belirtilmemiş'}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Çalışma Saatleri</td>
                    <td className="p-3 text-gray-300">{place1.working_hours || 'Belirtilmemiş'}</td>
                    <td className="p-3 text-gray-300">{place2.working_hours || 'Belirtilmemiş'}</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="p-3 text-gray-400">Özellikler</td>
                    <td className="p-3 text-gray-300">{formatFeatures(place1.features)}</td>
                    <td className="p-3 text-gray-300">{formatFeatures(place2.features)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}