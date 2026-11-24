import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import EmptyState from '@/components/ui/EmptyState'
import {
  Compass,
  Search,
  MapPin,
  Heart,
  ArrowRight,
  FolderOpen,
  Calendar,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Listeler | İstanbul Keşif Rehberi',
  description: 'Kullanıcıların oluşturduğu mekan listelerini keşfet, arayarak filtrele.',
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
  const sp = (await searchParams) ?? {}

  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const rawSort = Array.isArray(sp.siralama) ? sp.siralama[0] : sp.siralama

  const q = (rawQ || '').trim()
  const siralama = SIRALAMA_SECENEKLERI.some((s) => s.value === rawSort)
    ? (rawSort as string)
    : 'populer'

  let query = supabase
    .from('user_lists')
    .select(`
      id, name, is_public, like_count, created_at,
      profiles ( id, username, avatar_url ),
      user_list_items ( id )
    `)
    .eq('is_public', true)

  if (q) {
    const escapedQ = q.replace(/[%_]/g, '\\$&')
    query = query.ilike('name', `%${escapedQ}%`)
  }

  switch (siralama) {
    case 'en-yeni':
      query = query.order('created_at', { ascending: false })
      break
    case 'en-cok-mekan':
      query = query.order('created_at', { ascending: false })
      break
    case 'populer':
    default:
      query = query.order('like_count', { ascending: false })
      break
  }

  const { data: rawLists } = await query.limit(100)

  let lists = (rawLists ?? []).map((list: any) => ({
    ...list,
    itemCount: Array.isArray(list.user_list_items) ? list.user_list_items.length : 0,
  }))

  if (siralama === 'en-cok-mekan') {
    lists = lists.sort(
      (a: any, b: any) => b.itemCount - a.itemCount || (b.like_count || 0) - (a.like_count || 0)
    )
  }

  const hasFilter = Boolean(q || siralama !== 'populer')

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Başlık ve Aksiyon */}
        <AnimatedSection>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-xs font-medium text-amber-300 mb-3">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Topluluk Listeleri</span>
                <span className="text-amber-400/60">•</span>
                <span className="font-semibold text-gray-100">{lists.length} liste</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-100">Keşfedilecek Listeler</h1>
              <p className="text-gray-400 mt-1">
                Diğer kullanıcıların oluşturduğu mekan listelerini keşfet, arayarak filtrele.
              </p>
            </div>

            <Link
              href="/listelerim"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-sm font-medium text-gray-100 transition shrink-0"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Listelerime Git</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
          </div>
        </AnimatedSection>

        {/* Arama ve Filtreler */}
        <AnimatedSection delay={0.1}>
          <form
            method="GET"
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-5 md:p-6 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label htmlFor="liste-ara" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Liste Ara
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="liste-ara"
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Liste adı ile ara..."
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label htmlFor="liste-siralama" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Sıralama
                </label>
                <select
                  id="liste-siralama"
                  name="siralama"
                  defaultValue={siralama}
                  className="input-field"
                >
                  {SIRALAMA_SECENEKLERI.map((secenek) => (
                    <option key={secenek.value} value={secenek.value}>
                      {secenek.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full h-[42px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition cursor-pointer shadow-sm"
                >
                  Filtrele
                </button>
              </div>
            </div>
          </form>
        </AnimatedSection>

        {/* Sonuç Durumu */}
        {hasFilter && (
          <AnimatedSection delay={0.15}>
            <div className="flex items-center justify-between gap-3 mb-5 px-1">
              <p className="text-sm text-gray-400">
                {q ? (
                  <>
                    "<span className="text-gray-100 font-medium">{q}</span>" için{' '}
                    <span className="font-semibold text-amber-400">{lists.length}</span> liste bulundu
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-amber-400">{lists.length}</span> liste listeleniyor
                  </>
                )}
              </p>
              <Link
                href="/listeler"
                className="text-sm font-medium text-amber-400 hover:text-amber-300 transition shrink-0"
              >
                Filtreleri Temizle
              </Link>
            </div>
          </AnimatedSection>
        )}

        {/* Listeler */}
        {lists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {lists.map((list: any, index: number) => {
              const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles
              return (
                <AnimatedSection key={list.id} delay={Math.min(index * 0.04, 0.25)}>
                  <Link
                    href={`/listeler/${list.id}`}
                    className="group flex flex-col justify-between h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-amber-400/35 transition-all duration-200 shadow-lg"
                  >
                    <div>
                      <h2 className="text-lg font-bold text-gray-100 group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                        {list.name}
                      </h2>

                      {/* Sahibi */}
                      <div className="flex items-center gap-2.5 mt-4">
                        <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 text-xs font-bold overflow-hidden shrink-0">
                          {owner?.avatar_url ? (
                            <img
                              src={owner.avatar_url}
                              alt={owner?.username || 'Kullanıcı'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (owner?.username?.[0] || 'K').toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-gray-300 truncate">
                          {owner?.username || 'Anonim'}
                        </span>
                      </div>
                    </div>

                    {/* Alt Bilgi */}
                    <div className="mt-5 pt-3.5 border-t border-white/10">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 font-medium">
                            <MapPin className="w-3 h-3 text-amber-400" />
                            <span>{list.itemCount} mekan</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 font-medium">
                            <Heart className="w-3 h-3 text-amber-400" />
                            <span>{list.like_count || 0}</span>
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-gray-400 shrink-0">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>{new Date(list.created_at).toLocaleDateString('tr-TR')}</span>
                        </span>
                      </div>
                    </div>
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
              description={
                q
                  ? 'Farklı bir arama terimi deneyin.'
                  : 'Kullanıcılar listelerini herkese açık yaptığında burada görünecek.'
              }
              action={
                hasFilter ? (
                  <Link
                    href="/listeler"
                    className="inline-block px-6 py-3 bg-amber-400 text-slate-950 font-semibold rounded-full hover:bg-amber-300 transition"
                  >
                    Tüm Listeleri Göster
                  </Link>
                ) : undefined
              }
            />
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}