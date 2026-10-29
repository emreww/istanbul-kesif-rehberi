import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Base URL
  const baseUrl = 'https://istanbulkesifrehberi.com' // Varsayılan URL (kendinize göre değiştirin)

  // Statik sayfalar
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/kesfet`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mekan-ekle`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]

  try {
    // Tüm onaylı mekanları getir
    const { data: places } = await supabase
      .from('places')
      .select('id, updated_at')
      .eq('status', 'approved')

    if (places) {
      const placeRoutes = places.map((place) => ({
        url: `${baseUrl}/mekan/${place.id}`,
        lastModified: place.updated_at ? new Date(place.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
      
      routes.push(...placeRoutes)
    }
  } catch (err) {
    console.error('Sitemap fetch error:', err)
  }

  return routes
}
