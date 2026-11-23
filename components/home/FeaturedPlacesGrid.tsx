'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MapPin,
  Star,
  MessageSquare,
  ArrowRight,
  Compass,
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

export default function FeaturedPlacesGrid({ places }: { places: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {places?.map((place: any, index: number) => {
        const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
        const CatIcon = getCategoryIcon(cat?.slug)
        const coverImage = getPlaceImage(place, cat?.slug)

        return (
          <motion.div
            key={place.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 'some' }}
            transition={{
              duration: 0.4,
              delay: (index % 3) * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/mekan/${place.id}`}
              className="group block overflow-hidden rounded-2xl bg-[#0c1220] border border-slate-800 hover:border-amber-400/60 transition-all duration-300 shadow-xl shadow-black/40"
            >
              {/* FOTOĞRAF ALANI */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0c1220]">
                <img
                  src={coverImage}
                  alt={place.name}
                  loading="lazy"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c1220] via-transparent to-transparent" />

                {/* Sol Üst: Kategori Rozeti */}
                {cat && (
                  <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/90 border border-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                    <CatIcon className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
                    <span>{cat.name}</span>
                  </span>
                )}

                {/* Sağ Üst: Altın Puan Rozeti */}
                <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full bg-slate-950/90 border border-amber-400/30 px-2.5 py-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">
                    {Number(place.average_rating).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* KART İÇERİĞİ */}
              <div className="p-5 bg-[#0c1220]">
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
          </motion.div>
        )
      })}
    </div>
  )
}