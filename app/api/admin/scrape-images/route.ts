import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase URL veya SUPABASE_SERVICE_ROLE_KEY eksik.')
  }

  return createClient(url, key)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function searchWikimedia(placeName: string, district?: string | null) {
  const query = encodeURIComponent(`${placeName} ${district || ''} Istanbul`.trim())
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IstanbulKesifRehberiBot/1.0 (https://kesifistanbul.com.tr)' },
    })
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null

    const first = Object.values(pages)[0] as any
    return first?.imageinfo?.[0]?.thumburl || first?.imageinfo?.[0]?.url || null
  } catch {
    return null
  }
}

async function searchDuckDuckGoImage(placeName: string, district?: string | null) {
  try {
    const query = encodeURIComponent(`${placeName} ${district || ''} İstanbul`)
    const pageRes = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    const html = await pageRes.text()
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/)
    if (!vqdMatch) return null

    const apiUrl = `https://duckduckgo.com/i.js?l=tr-tr&o=json&q=${query}&vqd=${vqdMatch[1]}&f=,,,&p=1`
    const imgRes = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://duckduckgo.com/',
      },
    })
    const imgData = await imgRes.json()
    const results = imgData?.results || []

    const valid = results.find(
      (item: any) =>
        item.image &&
        item.width > item.height &&
        !item.image.includes('fbsbx.com') &&
        !item.image.includes('instagram.com')
    )

    return valid ? valid.image : null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [totalRes, checkedRes, foundRes] = await Promise.all([
      supabase.from('places').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('places').select('*', { count: 'exact', head: true }).eq('image_checked', true),
      supabase.from('places').select('*', { count: 'exact', head: true }).not('image_url', 'is', null),
    ])

    return NextResponse.json({
      total: totalRes.count || 0,
      checked: checkedRes.count || 0,
      found: foundRes.count || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: places, error } = await supabase
      .from('places')
      .select('id, name, district, categories!inner(name)')
      .eq('status', 'approved')
      .eq('image_checked', false)
      .in('categories.name', [
        'Müze',
        'Tarihi Yer',
        'Kule',
        'Park',
        'Kafe',
        'Restoran',
        'Sanat Galerisi',
      ])
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!places || places.length === 0) {
      return NextResponse.json({ done: true, logs: [] })
    }

    const logs = []

    for (const place of places) {
      const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
      let source = 'none'
      let imageUrl = await searchWikimedia(place.name, place.district)

      if (imageUrl) {
        source = 'Wikimedia'
      } else {
        await sleep(500)
        imageUrl = await searchDuckDuckGoImage(place.name, place.district)
        if (imageUrl) source = 'DuckDuckGo'
      }

      await supabase
        .from('places')
        .update({
          image_url: imageUrl,
          image_checked: true,
        })
        .eq('id', place.id)

      logs.push({
        id: place.id,
        name: place.name,
        district: place.district || 'İstanbul',
        category: cat?.name || 'Genel',
        imageUrl,
        source,
        time: new Date().toLocaleTimeString('tr-TR'),
      })

      await sleep(700)
    }

    return NextResponse.json({ done: false, logs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bilinmeyen hata' }, { status: 500 })
  }
}