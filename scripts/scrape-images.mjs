import { createClient } from '@supabase/supabase-js'

// .env.local içindeki bilgilerini buraya veya ortam değişkeni olarak ver
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Yazma yetkisi için service_role key gerekli

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 1. KAYNAK: Wikipedia / Wikimedia Commons API (Tarihi yer, müze, park vb. için en temiz kaynak)
async function searchWikimedia(placeName, district) {
  const query = encodeURIComponent(`${placeName} ${district || ''} Istanbul`.trim())
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IstanbulKesifRehberiBot/1.0 (https://kesifistanbul.com.tr)' },
    })
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null

    const first = Object.values(pages)[0]
    return first?.imageinfo?.[0]?.thumburl || first?.imageinfo?.[0]?.url || null
  } catch {
    return null
  }
}

// 2. KAYNAK: DuckDuckGo Görsel Arama Scraper (Kafe, restoran vb. ticari mekanlar için)
async function searchDuckDuckGoImage(placeName, district) {
  try {
    const query = encodeURIComponent(`${placeName} ${district || ''} İstanbul`)
    const searchUrl = `https://duckduckgo.com/?q=${query}&iax=images&ia=images`

    const pageRes = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    const html = await pageRes.text()
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/)
    if (!vqdMatch) return null

    const vqd = vqdMatch[1]
    const apiUrl = `https://duckduckgo.com/i.js?l=tr-tr&o=json&q=${query}&vqd=${vqd}&f=,,,&p=1`

    const imgRes = await fetch(apiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://duckduckgo.com/',
      },
    })
    const imgData = await imgRes.json()
    const results = imgData?.results || []

    // Yatay (manzara/mekan) ve kırık olmayan ilk görseli seç
    const valid = results.find(
      (item) =>
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

async function runScraper() {
  console.log('🚀 İstanbul Keşif Fotoğraf Scraper başlatılıyor...')

  while (true) {
    // Henüz taranmamış ve onaylı gezilecek yerleri 25'erli çek
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
      .limit(25)

    if (error) {
      console.error('Supabase hatası:', error.message)
      break
    }

    if (!places || places.length === 0) {
      console.log('✅ Tüm hedef mekanlar tarandı!')
      break
    }

    for (const place of places) {
      const cat = Array.isArray(place.categories) ? place.categories[0] : place.categories
      console.log(`🔍 Aranıyor: ${place.name} (${place.district || 'İstanbul'}) [${cat?.name}]`)

      // Önce Wikimedia'ya bak
      let imageUrl = await searchWikimedia(place.name, place.district)

      // Bulunamazsa DuckDuckGo'dan çek
      if (!imageUrl) {
        await sleep(800)
        imageUrl = await searchDuckDuckGoImage(place.name, place.district)
      }

      // Sonucu veritabanına işle
      await supabase
        .from('places')
        .update({
          image_url: imageUrl,
          image_checked: true,
        })
        .eq('id', place.id)

      if (imageUrl) {
        console.log(`   ✅ Bulundu: ${imageUrl.slice(0, 65)}...`)
      } else {
        console.log(`   ⚠️ Bulunamadı (kategori görseli kullanılacak)`)
      }

      // Ban yememek için istekler arası kısa bekleme
      await sleep(1200)
    }
  }
}

runScraper()