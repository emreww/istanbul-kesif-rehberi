'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function SifreGuncellePage() {
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [basarili, setBasarili] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')

    if (sifre !== sifreTekrar) {
      setHata('Şifreler eşleşmiyor.')
      return
    }

    if (sifre.length < 8) {
      setHata('Şifre en az 8 karakter olmalıdır.')
      return
    }

    setYukleniyor(true)

    const { error } = await supabase.auth.updateUser({
      password: sifre,
    })

    setYukleniyor(false)

    if (error) {
      setHata('Şifre güncellenemedi: ' + error.message)
    } else {
      setBasarili(true)
      setTimeout(() => {
        router.push('/giris')
      }, 2500)
    }
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold text-gray-100">Yeni Şifre Belirle</h1>
            <p className="text-gray-400 text-sm mt-2">Lütfen hesabın için yeni bir şifre girin</p>
          </div>

          {hata && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
              {hata}
            </div>
          )}

          {basarili ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm text-center space-y-2">
              <p className="font-bold">✓ Şifreniz başarıyla güncellendi!</p>
              <p className="text-xs">Giriş sayfasına yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Yeni Şifre</label>
                <input
                  type="password"
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  value={sifreTekrar}
                  onChange={(e) => setSifreTekrar(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={yukleniyor}
                className="btn-primary w-full py-3 disabled:opacity-50"
              >
                {yukleniyor ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}