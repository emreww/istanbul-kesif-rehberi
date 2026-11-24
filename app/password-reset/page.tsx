'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function SifreGuncellePage() {
  const [mode, setMode] = useState<'link' | 'code'>('code')
  const [email, setEmail] = useState('')
  const [kod, setKod] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [basarili, setBasarili] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!active) return
      if (session) {
        setMode('link')
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setMode('link')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

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

    try {
      // Linkten oturum açılmadıysa önce e-posta + 6 haneli recovery kodunu doğrula
      if (mode === 'code') {
        if (!email.trim() || kod.trim().length < 6) {
          setHata('Lütfen e-posta adresinizi ve maildeki 6 haneli kodu girin.')
          setYukleniyor(false)
          return
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: kod.trim(),
          type: 'recovery',
        })

        if (verifyError) {
          setHata('Doğrulama kodu geçersiz veya süresi dolmuş: ' + verifyError.message)
          setYukleniyor(false)
          return
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: sifre,
      })

      if (error) {
        setHata('Şifre güncellenemedi: ' + error.message)
      } else {
        setBasarili(true)
        setTimeout(() => {
          router.push('/giris')
        }, 2500)
      }
    } catch (err: any) {
      setHata('Beklenmeyen bir hata oluştu: ' + (err?.message || ''))
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold text-gray-100">Yeni Şifre Belirle</h1>
            <p className="text-gray-400 text-sm mt-2">
              {mode === 'link'
                ? 'Bağlantı doğrulandı, hesabın için yeni bir şifre gir'
                : 'Mailine gelen 6 haneli kod ile yeni şifreni belirle'}
            </p>
          </div>

          {/* Yöntem Seçici */}
          {!basarili && (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('code')
                  setHata('')
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  mode === 'code'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                6 Haneli Kod ile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('link')
                  setHata('')
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  mode === 'link'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Bağlantı ile Geldim
              </button>
            </div>
          )}

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
              {mode === 'code' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      E-posta Adresi
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="ornek@mail.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maildeki 6 Haneli Kod
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={kod}
                      onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center font-mono text-lg tracking-[0.35em] font-bold"
                      placeholder="508530"
                      required
                    />
                  </div>
                </>
              )}

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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Yeni Şifre Tekrar
                </label>
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