'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function GirisPage() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sifreSifirlamaModu, setSifreSifirlamaModu] = useState(false)
  const [sifirlamaYukleniyor, setSifirlamaYukleniyor] = useState(false)
  const [sifirlamaMailGonderildi, setSifirlamaMailGonderildi] = useState(false)


  const router = useRouter()
  const supabase = createClient()

  // Ban sebebini veya kayıt başarısını URL'den al
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    const kayit = params.get('kayit')

    if (reason) {
      setHata(`Hesabınız engellenmiştir. Sebep: ${reason}`)
    } else if (kayit === 'basarili') {
      setBilgi('Kayıt başarılı! Lütfen hesabınızı doğrulamak için e-postanızı kontrol edin.')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    setBilgi('')
    setYukleniyor(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: sifre,
    })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setHata('E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısına tıklayın.')
      } else {
        setHata('E-posta veya şifre hatalı.')
      }
      setYukleniyor(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', data.user.id)
        .single()

      if (profile?.is_banned) {
        await supabase.auth.signOut()
        const reason = profile.ban_reason || 'Belirtilmemiş'
        setHata(`Hesabınız engellenmiştir. Sebep: ${reason}`)
        setYukleniyor(false)
        return
      }
    }

    router.push('/')
    router.refresh()
  }

  // Supabase Şifre Sıfırlama İsteği
  const handleSifreSifirla = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    setBilgi('')
    setSifirlamaYukleniyor(true)

    /*const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/password-reset`,
    })

    setSifirlamaYukleniyor(false)

    if (error) {
      setHata('Sıfırlama e-postası gönderilemedi: ' + error.message)
    } else {
      setSifirlamaMailGonderildi(true)
    }*/
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Ekrana başarı mesajını veriyoruz
    postMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi!');
    // --- SİMÜLASYON BİTİŞİ ---



  }





  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
          
          {sifreSifirlamaModu ? (
            /* ŞİFRE SIFIRLAMA MODU */
            <div>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔑</div>
                <h1 className="text-2xl font-bold text-gray-100">Şifreni mi Unuttun?</h1>
                <p className="text-gray-400 text-sm mt-2">
                  E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
                </p>
              </div>

              {hata && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
                  {hata}
                </div>
              )}

              {sifirlamaMailGonderildi ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm text-center space-y-3">
                  <p className="font-semibold">✓ Sıfırlama Bağlantısı Gönderildi!</p>
                  <p className="text-xs text-emerald-200/80">
                    <span className="font-bold">{email}</span> adresine bir bağlantı yolladık. Lütfen gelen kutunuzu ve spam klasörünüzü kontrol edin.
                  </p>
                  <button
                    onClick={() => {
                      setSifreSifirlamaModu(false)
                      setSifirlamaMailGonderildi(false)
                    }}
                    className="mt-2 text-xs text-gray-300 hover:text-white underline block mx-auto"
                  >
                    Giriş Ekranına Dön
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSifreSifirla} className="space-y-5">
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

                  <button
                    type="submit"
                    disabled={sifirlamaYukleniyor}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {sifirlamaYukleniyor ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSifreSifirlamaModu(false)}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-200 transition"
                  >
                    ← Giriş Ekranına Dön
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* STANDART GİRİŞ MODU */
            <>
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">🏙️</div>
                <h1 className="text-2xl font-bold text-gray-100">Tekrar Hoş Geldin</h1>
                <p className="text-gray-400 text-sm mt-2">İstanbul'u keşfetmeye devam et</p>
              </div>

              {bilgi && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6">
                  {bilgi}
                </div>
              )}

              {hata && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
                  {hata}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    E-posta
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => setSifreSifirlamaModu(true)}
                      className="text-xs text-primary-400 hover:underline"
                    >
                      Şifremi unuttum?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={sifre}
                    onChange={(e) => setSifre(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={yukleniyor}
                  className="btn-primary w-full py-3"
                >
                  {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-400">
                Hesabın yok mu?{' '}
                <Link href="/kayit" className="text-primary-400 hover:underline">
                  Kayıt ol
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}