import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import ReviewSection from '@/components/review/ReviewSection'
import FavoriteButton from '@/components/favorite/FavoriteButton'
import AddToWheelButton from '@/components/wheel/AddToWheelButton'
import PhotoGallery from '@/components/photo/PhotoGallery'
import OwnershipRequestButton from '@/components/place/OwnershipRequestButton'
import AddToListButton from '@/components/list/AddToListButton'
import ReportModal from '@/components/report/ReportModal'
import { generatePlaceJsonLd } from '@/lib/jsonld'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: place } = await supabase
    .from('places')
    .select('name, description, district')
    .eq('id', id)
    .single()

  return {
    title: place?.name ? `${place.name} | İstanbul Keşif Rehberi` : 'Mekan | İstanbul Keşif Rehberi',
    description: place?.description || `${place?.name || 'Mekan'} - İstanbul ${place?.district || ''} bölgesinde. Yorumlar, fotoğraflar ve detaylı bilgi.`,
    openGraph: {
      title: place?.name ? `${place.name} | İstanbul Keşif Rehberi` : undefined,
      description: place?.description || undefined,
      type: 'website',
    },
  }
}

export default async function MekanDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: place, error } = await supabase
    .from('places')
    .select(`
      *,
      categories ( name, icon )
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single()

  if (!place || error) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === place.owner_id

  const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
  const categoryName = category?.name || 'Kategori belirtilmemiş'
  const categoryIcon = category?.icon || '📍'
  const features: string[] = Array.isArray(place.features) ? (place.features as string[]) : []

  // JSON-LD yapılandırılmış veri (Google Rich Snippets)
  const jsonLd = generatePlaceJsonLd({
    name: place.name,
    description: place.description,
    address: place.address,
    district: place.district,
    phone: place.phone,
    website: place.website,
    averageRating: Number(place.average_rating),
    totalReviews: place.total_reviews,
    priceRange: place.price_range,
    categoryName,
    placeId: id,
  })

  return (
    <div className="relative min-h-screen">
      {/* JSON-LD Structured Data for Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnimatedBackground />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Hero Kartı */}
        <AnimatedSection>
          <div className="relative overflow-hidden rounded-3xl mb-8 glass-panel border border-white/15 shadow-2xl p-6 sm:p-8 md:p-10">
            {/* Arka plan ışık vurgusu */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-primary-500/20 to-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 text-primary-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                    {categoryIcon} {categoryName}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
                    {place.name}
                  </h1>
                  <p className="text-gray-300 text-sm md:text-base flex items-center gap-1.5">
                    <span className="text-primary-400">📍</span>
                    <span>{place.district}</span>
                    {place.address && <span className="text-gray-400">• {place.address}</span>}
                  </p>
                </div>

                <div className="flex items-center md:flex-col md:items-end gap-3 bg-white/[0.04] md:bg-transparent p-3 md:p-0 rounded-2xl border border-white/5 md:border-0">
                  <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-amber-500/10">
                    <span className="text-amber-400 text-2xl font-black">★</span>
                    <span className="text-2xl font-black text-amber-300">
                      {Number(place.average_rating).toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-400">
                    {place.total_reviews} değerlendirme
                  </div>
                </div>
              </div>

              {place.description && (
                <p className="mt-5 text-gray-200 text-base leading-relaxed max-w-3xl">
                  {place.description}
                </p>
              )}

              {features.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {features.map((feature: string) => (
                    <span
                      key={feature}
                      className="bg-white/[0.06] border border-white/10 text-gray-200 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      ✓ {feature}
                    </span>
                  ))}
                </div>
              )}

              {/* Aksiyon Butonları */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
                <FavoriteButton placeId={id} />
                <AddToWheelButton placeId={id} />
                <AddToListButton placeId={id} />

                {isOwner && (
                  <Link
                    href={`/mekan-duzenle/${place.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs sm:text-sm font-bold transition duration-200 shadow-md backdrop-blur-md hover:scale-105"
                  >
                    ✏️ Mekanı Düzenle
                  </Link>
                )}

                <ReportModal targetType="place" targetId={id} />
              </div>

              {/* Sahiplendirme talebi */}
              <OwnershipRequestButton placeId={id} ownerId={place.owner_id} />
            </div>
          </div>
        </AnimatedSection>

        {/* İletişim Bilgileri */}
        <AnimatedSection delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {place.phone && (
              <div className="glass-card p-5 rounded-2xl text-center border border-white/10 hover:border-primary-500/40 transition">
                <div className="text-3xl mb-1.5">📞</div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Telefon</p>
                <p className="font-bold text-white text-sm mt-1">{place.phone}</p>
              </div>
            )}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-5 rounded-2xl text-center border border-white/10 hover:border-primary-500/40 transition group block"
              >
                <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">🌐</div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Web Sitesi</p>
                <p className="font-bold text-primary-400 group-hover:text-primary-300 text-sm mt-1">Ziyaret Et →</p>
              </a>
            )}
            {place.instagram && (
              <a
                href={`https://instagram.com/${place.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-5 rounded-2xl text-center border border-white/10 hover:border-primary-500/40 transition group block"
              >
                <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">📸</div>
                <p className="text-xs text-gray-400 font-semibold uppercase">Instagram</p>
                <p className="font-bold text-primary-400 group-hover:text-primary-300 text-sm mt-1">@{place.instagram}</p>
              </a>
            )}
          </div>
        </AnimatedSection>

        {/* Fotoğraf Galerisi */}
        <AnimatedSection delay={0.25}>
          <PhotoGallery placeId={id} />
        </AnimatedSection>

        {/* Yorumlar Bölümü */}
        <AnimatedSection delay={0.3}>
          <ReviewSection placeId={id} />
        </AnimatedSection>
      </div>
    </div>
  )
}