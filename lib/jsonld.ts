// JSON-LD yapılandırılmış veri (structured data) üretici
// Google zengin sonuçlarında (Rich Snippets) mekanların ⭐ puanlarla görünmesini sağlar

interface PlaceJsonLdProps {
  name: string
  description?: string
  address?: string
  district?: string
  phone?: string
  website?: string
  averageRating: number
  totalReviews: number
  priceRange?: number
  categoryName?: string
  placeId: string
}

export function generatePlaceJsonLd({
  name,
  description,
  address,
  district,
  phone,
  website,
  averageRating,
  totalReviews,
  priceRange,
  categoryName,
  placeId,
}: PlaceJsonLdProps) {
  const priceMap: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description: description || `${name} - İstanbul ${district || ''} bölgesinde bulunan mekan.`,
    url: `https://istanbulkesifrehberi.com/mekan/${placeId}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: district || 'İstanbul',
      addressRegion: 'İstanbul',
      addressCountry: 'TR',
      streetAddress: address || undefined,
    },
    telephone: phone || undefined,
    ...(website ? { sameAs: website } : {}),
    ...(priceRange && priceMap[priceRange] ? { priceRange: priceMap[priceRange] } : {}),
    ...(categoryName ? { additionalType: categoryName } : {}),
    ...(totalReviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: averageRating.toFixed(1),
            bestRating: '5',
            worstRating: '1',
            ratingCount: totalReviews,
          },
        }
      : {}),
  }
}
