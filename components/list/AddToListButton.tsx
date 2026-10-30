'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useNotificationStore } from '@/store/notifications'

export default function AddToListButton({ placeId }: { placeId: string }) {
  const [user, setUser] = useState<any>(null)
  const [lists, setLists] = useState<any[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [newListName, setNewListName] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [itemsByList, setItemsByList] = useState<{ [key: string]: string[] }>({})
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  const isPlaceInAnyList = Object.values(itemsByList).some((ids) => ids.includes(placeId))

  const fetchLists = useCallback(async () => {
    if (!user) return
    const { data: listsData } = await supabase
      .from('user_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    const listArray = listsData ?? []
    setLists(listArray)

    if (listArray.length > 0) {
      const listIds = listArray.map((l) => l.id)
      const { data: items } = await supabase
        .from('user_list_items')
        .select('list_id, place_id')
        .in('list_id', listIds)

      const map: { [key: string]: string[] } = {}
      ;(items ?? []).forEach((item: any) => {
        if (!map[item.list_id]) map[item.list_id] = []
        map[item.list_id].push(item.place_id)
      })
      setItemsByList(map)
    } else {
      setItemsByList({})
    }
  }, [supabase, user])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    init()
  }, [supabase])

  useEffect(() => {
    if (user) fetchLists()
  }, [user, fetchLists])

  if (!user) return null

  const handleAddToExistingList = async () => {
    if (!selectedListId) return
    setLoading(true)
    const { error } = await supabase.from('user_list_items').insert({
      list_id: selectedListId,
      place_id: placeId,
    })
    if (error) {
      addNotification('Mekan listeye eklenemedi: ' + error.message, 'warning')
      setLoading(false)
      return
    }
    addNotification('Mekan listeye eklendi! 📋', 'success')
    setLoading(false)
    setIsOpen(false)
    fetchLists()
    router.refresh()
  }

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return
    setLoading(true)
    const { data: newList, error: listError } = await supabase
      .from('user_lists')
      .insert({ user_id: user.id, name: newListName.trim() })
      .select('id, name')
      .single()

    if (listError) {
      addNotification('Liste oluşturulamadı: ' + listError.message, 'warning')
      setLoading(false)
      return
    }

    const { error: itemError } = await supabase.from('user_list_items').insert({
      list_id: newList.id,
      place_id: placeId,
    })
    if (itemError) {
      addNotification('Mekan listeye eklenemedi: ' + itemError.message, 'warning')
      setLoading(false)
      return
    }
    addNotification('Liste oluşturuldu ve mekan eklendi! 📋', 'success')
    setNewListName('')
    setLoading(false)
    setIsOpen(false)
    fetchLists()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition duration-200 shadow-md ${
          isPlaceInAnyList
            ? 'bg-sky-500 hover:bg-sky-600 text-white border border-sky-300 shadow-sky-500/30 scale-105'
            : 'bg-slate-900/90 hover:bg-sky-500/20 text-sky-200 hover:text-white border border-sky-500/40 backdrop-blur-md'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        <span>📋</span>
        <span>{isPlaceInAnyList ? 'Listede Ekli' : 'Listeye Ekle'}</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-100 mb-4">Listeye Ekle</h3>

            {lists.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mevcut liste</label>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Seçiniz</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} {itemsByList[list.id]?.includes(placeId) ? '(ekli)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddToExistingList}
                  disabled={loading || !selectedListId}
                  className="btn-primary w-full"
                >
                  Eklemeyi Tamamla
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">Henüz listeniz yok.</p>
            )}

            <div className="my-4 border-t border-white/10" />

            <div className="space-y-3">
              <label className="block text-sm text-gray-400">Yeni liste oluştur</label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Liste adı (örn. Hafta Sonu Rotası)"
                className="input-field"
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={loading || !newListName.trim()}
                className="btn-secondary w-full"
              >
                Oluştur ve Ekle
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition"
            >
              İptal
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}