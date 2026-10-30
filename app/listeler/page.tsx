import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Listeler | İstanbul Keşif Rehberi',
  description: "Kullanıcıların oluşturduğu mekan listelerini keşfet, arayarak filtrele.",
}

const SIRALAMA_SECENEKLERI = [
  { value: 'populer', label: 'En Popüler' },
  { value: 'en-yeni', label: 'En Yeni' },
  { value: 'en-cok-mekan', label: 'En Çok Mekan' },
]

export default async function ListelerPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const sp = (await searchParams) as any

  const q = (sp?.q as string) || ''
  const siralama = (sp?.siralama as string) || 'populer'

  // Tüm herkese açık listeleri çek (items count + like count + profil bilgisi)
  let query = supabase
    .from('user_lists')
    .select(`
      id, name, is_public, like_count, created_at,
      profiles ( id, username, avatar_url ),
      user_list_items ( id )
    `)
    .eq('is_public', true)

  // Arama filtresi
  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  // Sıralama
  switch (siralama) {
    case 'populer':
      query = query.order('like_count', { ascending: false })
      break
    case 'en-yeni':
      query = query.order('created_at', { ascending: false })
      break
    case 'en-cok-mekan':
      // Supabase'de nested count ile sıralama yapılamaz, bu yüzden client tarafında sıralayacağız
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('like_count', { ascending: false })
  }

  const { data: rawLists } = await query.limit(100)

  // Mekan sayısına göre sıralama (gerekiyorsa)
  let lists = (rawLists ?? []).map((list: any) => ({
    ...list,
    itemCount: Array.isArray(list.user_list_items) ? list.user_list_items.length : 0,
  }))

  if (siralama === 'en-cok-mekan') {
    lists = lists.sort((a: any, b: any) => b.itemCount - a.itemCount)
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">🌍 Keşfedilecek Listeler</h1>
          <p className="text-gray-400 mb-8">Diğer kullanıcıların oluşturduğu mekan listelerini keşfet</p>
        </AnimatedSection>

        {/* Arama ve Filtreler */}
        <AnimatedSection delay={0.1}>
          <form className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Arama */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Liste Ara</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Liste adı ile ara..."
                  className="input-field"
                />
              </div>

              {/* Sıralama */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sıralama</label>
                <select name="siralama" defaultValue={siralama} className="input-field">
                  {SIRALAMA_SECENEKLERI.map((secenek) => (
                    <option key={secenek.value} value={secenek.value}>{secenek.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-4">Filtrele</button>
          </form>
        </AnimatedSection>

        {/* Sonuç Sayısı */}
        {q && (
          <AnimatedSection delay={0.15}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                &quot;{q}&quot; için <span className="font-semibold text-gray-200">{lists.length}</span> liste bulundu
              </p>
              <a
                href="/listeler"
                className="text-sm text-primary-400 hover:text-primary-300 transition"
              >
                Filtreleri Temizle
              </a>
            </div>
          </AnimatedSection>
        )}

        {/* Listeler */}
        {lists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list: any, index: number) => {
              const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles
              return (
                <AnimatedSection key={list.id} delay={index * 0.05}>
                  <Link
                    href={`/listeler/${list.id}`}
                    className="block bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-200 h-full"
                  >
                    <h2 className="text-lg font-bold text-gray-100 line-clamp-2">{list.name}</h2>

                    {/* Sahibi */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-7 h-7 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                        {owner?.avatar_url ? (
                          <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (owner?.username?.[0] || 'K').toUpperCase()
                        )}
                      </div>
                      <span className="text-sm text-gray-300 truncate">{owner?.username || 'Anonim'}</span>
                    </div>

                    {/* İstatistikler */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">📍</span>
                        <span className="text-sm font-semibold text-gray-300">{list.itemCount}</span>
                        <span className="text-xs text-gray-500">mekan</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">❤️</span>
                        <span className="text-sm font-semibold text-gray-300">{list.like_count || 0}</span>
                        <span className="text-xs text-gray-500">beğeni</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      📅 {new Date(list.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </Link>
                </AnimatedSection>
              )
            })}
          </div>
        ) : (
          <AnimatedSection>
            <EmptyState
              icon="📋"
              title={q ? `"${q}" ile eşleşen liste bulunamadı` : 'Henüz herkese açık liste yok'}
              description={q ? 'Farklı bir arama terimi deneyin.' : 'Kullanıcılar listelerini herkese açık yaptığında burada görünecek.'}
              action={
                q ? (
                  <a href="/listeler" className="inline-block px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition">
                    Tüm Listeleri Göster
                  </a>
                ) : undefined
              }
            />
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}