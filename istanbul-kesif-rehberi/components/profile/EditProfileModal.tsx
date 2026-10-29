'use client'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setUsername(initialUsername)
    setBio(initialBio)
    setAvatarPreview(initialAvatarUrl)
    setInstagram(initialInstagram || '')
    setTwitter(initialTwitter || '')
    setTiktok(initialTiktok || '')
    setWebsite(initialWebsite || '')
  }, [initialUsername, initialBio, initialAvatarUrl, initialInstagram, initialTwitter, initialTiktok, initialWebsite])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let avatarUrl = initialAvatarUrl

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        avatarUrl = data.publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          instagram: instagram.trim() || null,
          twitter: twitter.trim() || null,
          tiktok: tiktok.trim() || null,
          website: website.trim() || null,
        })
        .eq('id', userId)

      if (updateError) throw updateError

      await supabase.auth.updateUser({
        data: { username },
      })

      setSuccess('Profil güncellendi!')
      router.refresh()
      setTimeout(() => setIsOpen(false), 1000)
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white/10 text-gray-200 rounded-full hover:bg-white/20 transition border border-white/10"
      >
        ✏️ Düzenle
      </button>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Profili Düzenle</h2>

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-2">{success}</p>}

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
            <label className="cursor-pointer text-sm text-primary-400 hover:underline">
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
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Biyografi */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Biyografi
            </label>
            <textarea
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
              <label className="block text-xs text-gray-400 mb-1">📸 Instagram</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">🐦 Twitter</label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">🎵 TikTok</label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="kullaniciadi"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">🌐 Web Sitesi</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-white/10 text-gray-300 rounded-full hover:bg-white/20 transition"
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