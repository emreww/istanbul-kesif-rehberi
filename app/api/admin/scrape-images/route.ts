import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SITE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_SUPABASESERVICE_KEY

  if (!url || !key) {
    throw new Error('Supabase URL veya SERVICE_SUPABASESERVICE_KEY eksik.')
  }

  return createClient(url, key)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Gereksiz kelimeleri temizleyip arama sorgusunu netleştirir
function buildCleanQuery(placeName: string, district?: string | null, category?: string) {
  const cleanDistrict =
    district && district.toLowerCase() !== 'istanbul' && district.toLowerCase() !== 'i̇stanbul'
      ? district
      : ''
  return `${placeName} ${cleanDistrict} İstanbul ${category || ''}`.replace(/\s+/g, ' ').trim()
}

// 1. KAYNAK: Türkçe Wikipedia Sayfa Özeti API (Ünlü mekanlar için %100 net sonuç)
async function searchTurkishWikipedia(placeName: string) {
  try {
    const query = encodeURIComponent(placeName)
    const searchUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=1&format=json`
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'IstanbulKesifBot/1.0' },
    })
    const searchData = await searchRes.json()
    const title = searchData?.query?.search?.[0]?.title
    if (!title) return null

    // Başlık mekan adıyla yeterince örtüşüyor mu kontrol et
    const firstWord = placeName.split(' ')[0].toLocaleLowerCase('tr-TR')
    if (!title.toLocaleLowerCase('tr-TR').includes(firstWord)) return null

    const summaryUrl = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const summaryRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'IstanbulKesifBot/1.0' },
    })
    const summaryData = await summaryRes.json()
    return summaryData?.originalimage?.source || summaryData?.thumbnail?.source || null
  } catch {
    return null
  }
}

// 2. KAYNAK: Wikimedia Commons API
async function searchWikimedia(placeName: string, district?: string | null) {
  const query = encodeURIComponent(buildCleanQuery(placeName, district))
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${query}&gsrnamespace=6&gsrlimit=2&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IstanbulKesifBot/1.0' },
    })
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null

    for (const page of Object.values(pages) as any[]) {
      const img = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url
      if (img && !img.endsWith('.svg') && !img.endsWith('.pdf')) {
        return img
      }
    }
    return null
  } catch {
    return null
  }
}

// 3. KAYNAK: Bing Görseller Scraper (Kafe, Restoran ve Yerel Mekanlarda Çok Yüksek İsabet)
async function searchBingImages(placeName: string, district?: string | null, category?: string) {
  try {
    const query = encodeURIComponent(buildCleanQuery(placeName, district, category))
    const url = `https://www.bing.com/images/search?q=${query}&qft=+filterui:aspect-wide+filterui:imagesize-large&form=IRFLTR`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    const html = await res.text()

    // Bing görsel JSON bloklarından murl (media url) değerlerini ayıkla
    const matches = [...html.matchAll(/murl":"(https?:\/\/[^&]+?)"/g)]

    const blockedDomains = [
      'fbsbx.com',
      'instagram.com',
      'facebook.com',
      'tiktok.com',
      'shutterstock',
      'istockphoto',
      'gettyimages',
      'alamy',
      'dreamstime',
      '123rf',
      'vecteezy',
    ]

    for (const match of matches) {
      const candidate = match[1]
      const lower = candidate.toLowerCase()
      if (
        !blockedDomains.some((domain) => lower.includes(domain)) &&
        (lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp') ||
          lower.includes('googleusercontent') ||
          lower.includes('tripadvisor') ||
          lower.includes('foursquare'))
      ) {
        return candidate
      }
    }
    return null
  } catch {
    return null
  }
}

// 4. KAYNAK: DuckDuckGo Görseller (Yedek)
async function searchDuckDuckGoImage(placeName: string, district?: string | null) {
  try {
    const query = encodeURIComponent(buildCleanQuery(placeName, district))
    const pageRes = await fetch(`https://duckduckgo.com/?q=${query}&iax=images&ia=images`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    })
    const html = await pageRes.text()
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/)
    if (!vqdMatch) return null

    const apiUrl = `https://duckduckgo.com/i.js?l=tr-tr&o=json&q=${query}&vqd=${vqdMatch[1]}&f=,,,&p=1`
    const imgRes = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
      const catName = cat?.name || ''
      let source = 'none'
      let imageUrl: string | null = null

      // 1. Türkçe Wikipedia
      imageUrl = await searchTurkishWikipedia(place.name)
      if (imageUrl) source = 'Wikipedia TR'

      // 2. Wikimedia Commons
      if (!imageUrl) {
        imageUrl = await searchWikimedia(place.name, place.district)
        if (imageUrl) source = 'Wikimedia'
      }

      // 3. Bing Görseller (Kategori kelimesiyle birlikte)
      if (!imageUrl) {
        await sleep(300)
        imageUrl = await searchBingImages(place.name, place.district, catName)
        if (imageUrl) source = 'Bing'
      }

      // 4. Bing Görseller (Sadece mekan adı + İstanbul ile geniş arama)
      if (!imageUrl) {
        await sleep(300)
        imageUrl = await searchBingImages(place.name, place.district)
        if (imageUrl) source = 'Bing (Geniş)'
      }

      // 5. DuckDuckGo Yedek
      if (!imageUrl) {
        await sleep(400)
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
        category: catName || 'Genel',
        imageUrl,
        source,
        time: new Date().toLocaleTimeString('tr-TR'),
      })

      await sleep(600)
    }

    return NextResponse.json({ done: false, logs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bilinmeyen hata' }, { status: 500 })
  }
}