'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface EditProfileModalProps {
  userId: string
  initialUsername: string
  initialBio: string
  initialAvatarUrl: string | null
  initialInstagram: string | null
  initialTwitter: string | null
  initialTiktok: string | null
  initialWebsite: string | null
}

function cleanHandle(value: string): string | null {
  const cleaned = value.trim().replace(/^@+/, '').trim()
  return cleaned || null
}

function cleanWebsite(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default function EditProfileModal({
  userId,
  initialUsername,
  initialBio,
  initialAvatarUrl,
  initialInstagram,
  initialTwitter,
  initialTiktok,
  initialWebsite,
}: EditProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [username, setUsername] = useState(initialUsername)
  const [bio, setBio] = useState(initialBio)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl)

  const [instagram, setInstagram] = useState(initialInstagram || '')
  const [twitter, setTwitter] = useState(initialTwitter || '')
  const [tiktok, setTiktok] = useState(initialTiktok || '')
  const [website, setWebsite] = useState(initialWebsite || '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewObjectUrlRef = useRef<string | null>(null)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current)
    }
  }, [])

  useEffect(() => {
    setUsername(initialUsername)
    setBio(initialBio)
    setAvatarPreview(initialAvatarUrl)
    setInstagram(initialInstagram || '')
    setTwitter(initialTwitter || '')
    setTiktok(initialTiktok || '')
    setWebsite(initialWebsite || '')
  }, [
    initialUsername,
    initialBio,
    initialAvatarUrl,
    initialInstagram,
    initialTwitter,
    initialTiktok,
    initialWebsite,
  ])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Lütfen geçerli bir görsel dosyası seçin.')
      return
    }

    const maxBytes = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxBytes) {
      setError('Avatar boyutu en fazla 5 MB olabilir.')
      return
    }

    setError('')
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    previewObjectUrlRef.current = objectUrl
    setAvatarFile(file)
    setAvatarPreview(objectUrl)
  }

  const handleClose = () => {
    if (loading) return
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setIsOpen(false)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setError('Kullanıcı adı boş bırakılamaz.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let avatarUrl = initialAvatarUrl

      if (avatarFile) {
        const rawExt = avatarFile.name.split('.').pop()?.toLowerCase()
        const fileExt = rawExt && /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'jpg'
        const fileName = `${userId}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: false })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        avatarUrl = data.publicUrl
      }

      const normalizedIg = cleanHandle(instagram)
      const normalizedTw = cleanHandle(twitter)
      const normalizedTt = cleanHandle(tiktok)
      const normalizedWeb = cleanWebsite(website)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername,
          bio: bio.trim(),
          avatar_url: avatarUrl,
          instagram: normalizedIg,
          twitter: normalizedTw,
          tiktok: normalizedTt,
          website: normalizedWeb,
        })
        .eq('id', userId)

      if (updateError) throw updateError

      await supabase.auth.updateUser({
        data: { username: trimmedUsername },
      })

      setAvatarFile(null)
      setSuccess('Profil güncellendi!')
      router.refresh()

      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false)
        setSuccess('')
      }, 1000)
    } catch (err: any) {
      setError(err?.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setError('')
          setSuccess('')
          setIsOpen(true)
        }}
        className="px-4 py-2 bg-white/10 text-gray-200 rounded-full hover:bg-white/20 transition border border-white/10 text-sm font-medium cursor-pointer"
      >
        ✏️ Düzenle
      </button>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={handleClose} />

      <div className="relative bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Profili Düzenle</h2>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-3">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden border border-white/10">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar önizleme"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                  👤
                </div>
              )}
            </div>
            <label className="cursor-pointer text-sm font-medium text-amber-400 hover:text-amber-300 transition">
              Avatar Seç
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Kullanıcı Adı */}
          <div>
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-300 mb-1">
              Kullanıcı Adı
            </label>
            <input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Biyografi */}
          <div>
            <label htmlFor="edit-bio" className="block text-sm font-medium text-gray-300 mb-1">
              Biyografi
            </label>
            <textarea
              id="edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Kendinden bahset..."
            />
          </div>

          {/* Sosyal Linkler */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <h3 className="text-sm font-semibold text-gray-300">Sosyal Linkler</h3>

            <div>
              <label htmlFor="edit-instagram" className="block text-xs text-gray-400 mb-1">
                📸 Instagram
              </label>
              <input
                id="edit-instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="edit-twitter" className="block text-xs text-gray-400 mb-1">
                🐦 Twitter
              </label>
              <input
                id="edit-twitter"
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="edit-tiktok" className="block text-xs text-gray-400 mb-1">
                🎵 TikTok
              </label>
              <input
                id="edit-tiktok"
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="edit-website" className="block text-xs text-gray-400 mb-1">
                🌐 Web Sitesi
              </label>
              <input
                id="edit-website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 text-sm font-medium transition disabled:opacity-60 cursor-pointer"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}