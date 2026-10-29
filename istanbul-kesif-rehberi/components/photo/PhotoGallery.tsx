'use client'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNotificationStore } from '@/store/notifications'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Photo {
  id: string
  url: string
  caption: string | null
  created_at: string
  profiles?: any
}

export default function PhotoGallery({ placeId }: { placeId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)

      const { data } = await supabase
        .from('photos')
        .select(`
          id, url, caption, created_at,
          profiles ( username, avatar_url )
        `)
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })

      setPhotos((data as Photo[]) ?? [])
    }
    fetchData()
  }, [placeId, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/giris')
      return
    }
    if (!file) {
      setError('Lütfen bir fotoğraf seçin.')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${placeId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
      const photoUrl = urlData.publicUrl

      const { error: insertError } = await supabase
        .from('photos')
        .insert({
          place_id: placeId,
          user_id: user.id,
          url: photoUrl,
          caption: caption || null,
        })

      if (insertError) throw insertError

      addNotification('Fotoğraf yüklendi! 📸', 'success')
      setCaption('')
      setFile(null)
      setSuccess('Fotoğraf yüklendi!')
      router.refresh()

      const { data: freshPhotos } = await supabase
        .from('photos')
        .select(`
          id, url, caption, created_at,
          profiles ( username, avatar_url )
        `)
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })

      setPhotos((freshPhotos as Photo[]) ?? [])
    } catch (err: any) {
      setError(err.message || 'Yükleme sırasında bir hata oluştu.')
    } finally {
      setUploading(false)
    }
  }

  const openLightbox = (index: number) => setSelectedPhotoIndex(index)
  const closeLightbox = () => setSelectedPhotoIndex(null)

  const nextPhoto = () => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) => (prev === null ? 0 : (prev + 1) % photos.length))
  }

  const prevPhoto = () => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) => (prev === null ? 0 : (prev - 1 + photos.length) % photos.length))
  }

  const handleDeleteRequest = (photo: Photo) => {
    const owner = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles
    if (owner?.username !== user?.user_metadata?.username) {
      setError('Yalnızca kendi fotoğraflarınızı silebilirsiniz.')
      return
    }
    setPhotoToDelete(photo)
  }

  const confirmDelete = async () => {
    if (!photoToDelete) return

    const { error } = await supabase.from('photos').delete().eq('id', photoToDelete.id)

    if (error) {
      setError(error.message)
      return
    }

    addNotification('Fotoğraf silindi 🗑️', 'info')
    setPhotos(prev => prev.filter(p => p.id !== photoToDelete.id))
    if (selectedPhotoIndex !== null && photos[selectedPhotoIndex]?.id === photoToDelete.id) {
      closeLightbox()
    }
    setPhotoToDelete(null)
    router.refresh()
  }

  if (loadingUser) {
    return <LoadingSpinner size="md" className="py-8" />
  }

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null

  return (
    <>
      <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center gap-2">
          📸 Fotoğraflar
          <span className="text-sm font-normal text-gray-400">({photos.length})</span>
        </h2>

        {/* Yükleme Formu */}
        {user ? (
          <form onSubmit={handleUpload} className="mb-8 bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold text-gray-200 mb-3">Fotoğraf Yükle</h3>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-300 hover:file:bg-primary-500/30"
              />
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Fotoğraf açıklaması (opsiyonel)"
                className="input-field"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}
              <button type="submit" disabled={uploading} className="btn-primary">
                {uploading ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-300">Fotoğraf yüklemek için giriş yapmalısınız.</p>
            <a href="/giris" className="text-primary-400 hover:underline">Giriş Yap</a>
          </div>
        )}

        {/* Galeri */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => {
              const owner = Array.isArray(photo.profiles) ? photo.profiles[0] : photo.profiles
              return (
                <div key={photo.id} className="group cursor-pointer">
                  <div onClick={() => openLightbox(index)} className="aspect-square overflow-hidden rounded-lg">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Fotoğraf'}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    {photo.caption && <p className="text-gray-200 text-sm mb-1">{photo.caption}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        👤 {owner?.username || 'Anonim'}
                      </span>
                      {owner?.username === user?.user_metadata?.username && (
                        <button
                          onClick={() => handleDeleteRequest(photo)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center">Henüz fotoğraf eklenmemiş.</p>
        )}
      </section>

      {/* Lightbox Modal – Eşit boyutlu, çerçevesiz */}
      {selectedPhoto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Opak arka plan */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={closeLightbox}
          />

          <div className="relative w-full max-w-5xl h-[80vh] perspective-1000">
            {photos.map((photo, i) => {
              if (selectedPhotoIndex === null) return null
              const offset = i - selectedPhotoIndex
              const absOffset = Math.abs(offset)

              let x = 0
              let y = 0
              let scale = 1
              let rotate = 0
              let zIndex = 10
              let opacity = 1

              if (offset === 0) {
                x = 0
                y = 0
                scale = 1
                rotate = 0
                zIndex = 10
                opacity = 1
              } else if (offset > 0) {
                x = 80 + offset * 30
                y = 20 + offset * 10
                scale = 0.88 - (absOffset - 1) * 0.05
                rotate = 6 + offset * 3
                zIndex = 10 - absOffset
                opacity = 0.85 - absOffset * 0.1
              } else {
                x = -80 + offset * 30
                y = 20 - offset * 10
                scale = 0.88 - (absOffset - 1) * 0.05
                rotate = -6 + offset * 3
                zIndex = 10 - absOffset
                opacity = 0.85 - absOffset * 0.1
              }

              return (
                <motion.div
                  key={photo.id}
                  initial={false}
                  animate={{ x, y, scale, rotate, opacity }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ zIndex }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              )
            })}
          </div>

          {selectedPhoto.caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full">
              {selectedPhoto.caption}
            </div>
          )}

          <button
            onClick={prevPhoto}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition z-20"
          >
            ❮
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition z-20"
          >
            ❯
          </button>
          <button
            onClick={closeLightbox}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition z-20"
          >
            ✕
          </button>
        </div>,
        document.body
      )}

      {/* Silme Onay Modalı */}
      {photoToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setPhotoToDelete(null)}
          />
          <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-lg font-semibold text-gray-100 mb-2">Fotoğrafı sil</p>
            <p className="text-gray-400 mb-6">Bu fotoğrafı silmek istediğinize emin misiniz?</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
              >
                Evet
              </button>
              <button
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
              >
                Hayır
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}