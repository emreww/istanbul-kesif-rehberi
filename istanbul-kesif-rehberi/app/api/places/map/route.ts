import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Haritada gösterilecek mekanlar için hafif (sadece koordinat ve temel bilgi) API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()

  // Sayfalama (Varsayılan olarak tek seferde 2000'er çeker)
  const page = parseInt(searchParams.get('page') || '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '40000', 10), 5000)
  const from = page * limit
  const to = from + limit - 1

  // Filtreler (varsa)
  const ilce = searchParams.get('ilce')
  const kategori = searchParams.get('kategori')
  const q = searchParams.get('q')

  let query = supabase
    .from('places')
    .select('id, name, district, latitude, longitude, average_rating, total_reviews, category_id')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (ilce) {
    query = query.eq('district', ilce)
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,district.ilike.%${q}%`)
  }

  const { data, error, count } = await query
    .range(from, to)
    .order('average_rating', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    places: data || [],
    hasMore: (data?.length || 0) === limit,
    nextPage: page + 1,
    count,
  })
}

