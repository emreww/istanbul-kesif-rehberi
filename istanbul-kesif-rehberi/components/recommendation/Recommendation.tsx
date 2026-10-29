'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface RecommendedPlace {
  id: string
  name: string
  district: string
  average_rating: number
  total_reviews: number
  category_id: number
  categories?: any
}

export default function Recommendations() {
  const [places, setPlaces] = useState<RecommendedPlace[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Favori ve yorumlardan kategori ID'lerini topla
        const { data: favoriteData } = await supabase
          .from('favorites')
          .select('place_id, places ( category_id )')
          .eq('user_id', user.id)

        const { data: reviewData } = await supabase
          .from('reviews')
          .select('place_id, places ( category_id )')
          .eq('user_id', user.id)

        const categoryCounts: Record<number, number> = {}
        const interactedPlaceIds = new Set<string>()

        // Güvenli işleme için any tipine çeviriyoruz
        const processItems = (items: any, weight: number) => {
          if (!items) return
          const array = Array.isArray(items) ? items : [items]
          array.forEach((item: any) => {
            // places alanı dizi veya obje olabilir
            const place = Array.isArray(item.places) ? item.places[0] : item.places
            const catId = place?.category_id
            if (catId) {
              categoryCounts[catId] = (categoryCounts[catId] || 0) + weight
            }
            if (item.place_id) interactedPlaceIds.add(item.place_id)
          })
        }

        processItems(favoriteData, 1)
        processItems(reviewData, 2)

        const topCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([catId]) => Number(catId))

        let recommended: RecommendedPlace[] = []
        const interactedArray = Array.from(interactedPlaceIds)

        if (topCategories.length > 0) {
          let query = supabase
            .from('places')
            .select(`
              id, name, district, average_rating, total_reviews, category_id,
              categories ( name, icon )
            `)
            .eq('status', 'approved')
            .in('category_id', topCategories)
            .order('average_rating', { ascending: false })

          if (interactedArray.length > 0) {
            query = query.not('id', 'in', interactedArray)
          }

          const { data } = await query.limit(10)
          recommended = data ?? []
        }

        // Yeterli öneri yoksa popülerlerle tamamla
        if (recommended.length < 5) {
          let fallbackQuery = supabase
            .from('places')
            .select(`
              id, name, district, average_rating, total_reviews, category_id,
              categories ( name, icon )
            `)
            .eq('status', 'approved')
            .order('average_rating', { ascending: false })

          if (interactedArray.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', interactedArray)
          }

          const { data: fallback } = await fallbackQuery.limit(10)

          const combined = [...recommended]
          ;(fallback ?? []).forEach((place) => {
            if (!combined.find((p) => p.id === place.id)) {
              combined.push(place)
            }
          })
          recommended = combined.slice(0, 10)
        }

        setPlaces(recommended)
      } catch (error) {
        console.error('Öneriler yüklenirken hata:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [supabase])

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-100 mb-4">✨ Sana Özel Öneriler</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-32 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (places.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-100 mb-4">✨ Sana Özel Öneriler</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {places.map((place) => {
          const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
          return (
            <Link
              key={place.id}
              href={`/mekan/${place.id}`}
              className="flex-shrink-0 w-64 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
            >
              <span className="text-sm text-primary-400">
                {category?.icon} {category?.name}
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
  )
}