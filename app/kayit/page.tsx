'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

export default function KayitPage() {
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mailGonderildi, setMailGonderildi] = useState(false)
  
  const supabase = createClient()

  // Şifre gereksinimleri
  const sifreGereksinimleri = [
    { kontrol: sifre.length >= 8, metin: 'En az 8 karakter' },
    { kontrol: /[A-Z]/.test(sifre), metin: 'En az bir büyük harf' },
    { kontrol: /[0-9]/.test(sifre), metin: 'En az bir rakam' },
    { kontrol: /[!@#$%^&*(),.?":{}|<>]/.test(sifre), metin: 'En az bir özel karakter' },
  ]

  const sifreGecerli = sifreGereksinimleri.every(g => g.kontrol)
  const sifreEslesiyor = sifre === sifreTekrar && sifre.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')

    if (!sifreGecerli) {
      setHata('Şifre gereksinimlerini karşılayın.')
      return
    }
    if (!sifreEslesiyor) {
      setHata('Şifreler eşleşmiyor.')
      return
    }

    setYukleniyor(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password: sifre,
      options: {
        data: {
          username: kullaniciAdi,
        },
        // Maildeki onay linkine tıklanınca yönlendirilecek adres
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    setYukleniyor(false)

    if (error) {
      setHata(error.message)
      return
    }

    // E-posta doğrulaması gerekiyorsa oturum açılmaz, mailGonderildi durumuna geçilir
    if (data.user && !data.session) {
      setMailGonderildi(true)
    } else {
      // Eğer veritabanında mail doğrulaması kapalıysa doğrudan yönlendir
      window.location.href = '/giris?kayit=basarili'
    }
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
          
          {mailGonderildi ? (
            /* E-POSTA DOĞRULAMA BİLGİLENDİRME KARTI */
            <div className="text-center py-4 space-y-4">
              <div className="text-5xl mb-2 animate-bounce">📩</div>
              <h2 className="text-2xl font-bold text-gray-100">Son Bir Adım Kaldı!</h2>
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm text-gray-200">
                  <span className="font-semibold text-primary-400">{email}</span> adresine bir doğrulama e-postası gönderdik.
                </p>
                <p className="text-xs text-gray-400">
                  Lütfen gelen kutunuzu açın ve hesabınızı aktifleştirmek için e-postadaki onay bağlantısına tıklayın.
                </p>
              </div>

              <p className="text-xs text-gray-400">
                E-posta ulaşmadı mı? Spambox (gereksiz) klasörünü kontrol etmeyi unutmayın.
              </p>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                <Link
                  href="/giris"
                  className="btn-primary w-full py-2.5 text-center text-sm font-semibold"
                >
                  Doğruladım, Giriş Yap
                </Link>

                <button
                  onClick={() => setMailGonderildi(false)}
                  className="text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  ← E-posta adresini değiştir
                </button>
              </div>
            </div>
          ) : (
            /* KAYIT FORMU */
            <>
              <div className="text-center mb-8">
                <div className="text-4xl mb-3">✨</div>
                <h1 className="text-2xl font-bold text-gray-100">Aramıza Katıl</h1>
                <p className="text-gray-400 text-sm mt-2">Keşfetmeye başlamak için hesap oluştur</p>
              </div>

              {hata && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-6">
                  {hata}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    className="input-field"
                    placeholder="kullanici_adi"
                    required
                  />
                </div>

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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={sifre}
                    onChange={(e) => setSifre(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />

                  {/* Şifre gereksinimleri */}
                  {sifre.length > 0 && (
                    <div className="mt-3 bg-black/20 border border-white/10 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        Şifre Gereksinimleri
                      </p>
                      {sifreGereksinimleri.map((g, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm font-medium ${
                            g.kontrol ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          <span className={`text-base ${g.kontrol ? 'text-green-300' : 'text-red-400'}`}>
                            {g.kontrol ? '✓' : '✗'}
                          </span>
                          <span>{g.metin}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={sifreTekrar}
                    onChange={(e) => setSifreTekrar(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                    required
                  />
                  {sifreTekrar.length > 0 && (
                    <p className={`text-sm font-medium mt-2 ${sifreEslesiyor ? 'text-green-300' : 'text-red-300'}`}>
                      {sifreEslesiyor ? '✓ Şifreler eşleşiyor' : '✗ Şifreler eşleşmiyor'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={yukleniyor || !sifreGecerli || !sifreEslesiyor}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {yukleniyor ? 'Kaydediliyor...' : 'Kayıt Ol'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-400">
                Zaten hesabın var mı?{' '}
                <Link href="/giris" className="text-primary-400 hover:underline">
                  Giriş yap
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}