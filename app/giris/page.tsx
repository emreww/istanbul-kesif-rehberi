'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Compass,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Route,
  Sparkles,
  AlertCircle,
  Bookmark,
  Award,
} from 'lucide-react'
import AnimatedBackground from '@/components/ui/AnimatedBackground'

const HERO_ISTANBUL_PHOTO =
  'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1600&q=85'

export default function GirisPage() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifreGoster, setSifreGoster] = useState(false)
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sifreSifirlamaModu, setSifreSifirlamaModu] = useState(false)
  const [sifirlamaYukleniyor, setSifirlamaYukleniyor] = useState(false)
  const [sifirlamaMailGonderildi, setSifirlamaMailGonderildi] = useState(false)
  const [mekanCount, setMekanCount] = useState<number | null>(null)

  const router = useRouter()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    const kayit = params.get('kayit')

    if (reason) {
      setHata(`Hesabınız engellenmiştir. Sebep: ${reason}`)
    } else if (kayit === 'basarili') {
      setBilgi('Kayıt başarılı! Lütfen hesabınızı doğrulamak için e-postanızı kontrol edin.')
    }

    let aktif = true
    const fetchMekanSayisi = async () => {
      const { count, error } = await supabase
        .from('places')
        .select('id', { count: 'exact', head: true })

      if (!aktif) return
      if (!error && count !== null) {
        setMekanCount(count)
      }
    }

    fetchMekanSayisi()
    return () => {
      aktif = false
    }
  }, [supabase])

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

  const handleSifreSifirla = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    setBilgi('')
    setSifirlamaYukleniyor(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/password-reset`,
    })

    setSifirlamaYukleniyor(false)

    if (error) {
      setHata('Sıfırlama e-postası gönderilemedi: ' + error.message)
    } else {
      setSifirlamaMailGonderildi(true)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] w-full bg-[#070b14] text-slate-100 overflow-x-hidden lg:overflow-hidden">
      {/* Gece mavisi & altın atmosferik ışık katmanları */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-blue-600/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <AnimatedBackground />

      <section className="relative z-10 w-full h-full grid grid-cols-1 lg:grid-cols-12">
        {/* SOL YARI: TAM YÜKSEKLİK İSTANBUL FOTOĞRAFI & TEŞVİK */}
        <div className="relative lg:col-span-7 min-h-[420px] lg:min-h-full flex flex-col justify-between overflow-hidden bg-[#0a101d] border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <img
            src={HERO_ISTANBUL_PHOTO}
            alt="İstanbul manzarası ve Boğaz"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dikey karartma azaltıldı: via-40 ve to-10 yapıldı */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/50 to-[#070b14]/20" />
          {/* Yatay vinyet yumuşatıldı: kenarlar 50, orta tamamen şeffaf (transparent) yapıldı */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070b14]/50 via-transparent to-[#070b14]/50" />

          <div className="relative z-10 p-6 sm:p-10 lg:p-10 flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#070b14]/85 border border-amber-400/35 px-4 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
              <span>
                {mekanCount !== null ? `${mekanCount.toLocaleString('tr-TR')} Mekan` : 'İstanbul Mekanları'} · 39 İlçe
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-300/90 bg-[#070b14]/70 border border-slate-800/80 rounded-full px-3.5 py-1.5 backdrop-blur-md">
              İstanbul Keşif Rehberi
            </span>
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-10 space-y-5">
            <div className="max-w-2xl">
              <h2 className="font-serif text-4xl sm:text-5xl xl:text-6xl text-white leading-[1.12] tracking-tight">
                İstanbul'u haritada değil,{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-yellow-500 bg-clip-text text-transparent italic pr-1  ">
                  kendi rotanda
                </span>{' '}
                yaşa.
              </h2>
              <p className="font-sans text-slate-200/90 text-sm sm:text-base leading-relaxed mt-3 max-w-xl">
                Gizli seyir noktalarından tarihi mekanlara, özel kahvecilerden yürüyüş rotalarına kadar aradığın her durak hesabında seni bekliyor.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="rounded-2xl bg-[#070b14]/85 backdrop-blur-md border border-slate-800/90 p-4">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 mb-2.5">
                  <Bookmark className="w-4 h-4" strokeWidth={1.9} />
                </div>
                <h3 className="text-sm font-semibold text-white">Kişisel Listeler</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Favori mekanlarını kaydet ve dilediğin an ulaş.
                </p>
              </div>

              <div className="rounded-2xl bg-[#070b14]/85 backdrop-blur-md border border-slate-800/90 p-4">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 mb-2.5">
                  <Route className="w-4 h-4" strokeWidth={1.9} />
                </div>
                <h3 className="text-sm font-semibold text-white">Rota Planlama</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Gününe uygun durakları sıralayıp rotanı çiz.
                </p>
              </div>

              <div className="rounded-2xl bg-[#070b14]/85 backdrop-blur-md border border-slate-800/90 p-4">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400 mb-2.5">
                  <Award className="w-4 h-4" strokeWidth={1.9} />
                </div>
                <h3 className="text-sm font-semibold text-white">Rozet & Yorum</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Deneyimlerini paylaş, puan ver ve rozet kazan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ YARI: TAM YÜKSEKLİK GİRİŞ / ŞİFRE SIFIRLAMA ALANI */}
        <div className="lg:col-span-5 bg-[#070b14]/95 backdrop-blur-xl flex flex-col justify-between p-6 sm:p-10 lg:p-10">
          <div className="text-xs text-slate-500 flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="font-medium text-slate-400">kesifistanbul.com.tr</span>
            <span className="text-amber-400 font-medium">Üye Girişi</span>
          </div>

          <div className="my-auto py-4 w-full max-w-md mx-auto">
            {sifreSifirlamaModu ? (
              /* ŞİFRE SIFIRLAMA MODU */
              <div>
                <div className="mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4">
                    <KeyRound className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-white">Şifreni mi Unuttun?</h1>
                  <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                    Kayıtlı e-posta adresini gir; sana şifre sıfırlama bağlantısı gönderelim.
                  </p>
                </div>

                {hata && (
                  <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs leading-relaxed mb-5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{hata}</span>
                  </div>
                )}

                {sifirlamaMailGonderildi ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 p-5 rounded-2xl text-sm space-y-3">
                    <p className="font-semibold flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
                      <span>Sıfırlama Bağlantısı Gönderildi</span>
                    </p>
                    <p className="text-xs text-emerald-200/80 leading-relaxed">
                      <span className="font-semibold text-white">{email}</span> adresine bir bağlantı yolladık. Gelen kutunu ve spam klasörünü kontrol edebilirsin.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSifreSifirlamaModu(false)
                        setSifirlamaMailGonderildi(false)
                      }}
                      className="pt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Giriş Ekranına Dön</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSifreSifirla} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                        E-posta Adresi
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all"
                          placeholder="ornek@mail.com"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sifirlamaYukleniyor}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/15 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 transition-all duration-200 cursor-pointer"
                    >
                      <span>{sifirlamaYukleniyor ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}</span>
                      {!sifirlamaYukleniyor && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSifreSifirlamaModu(false)}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-300 transition-colors pt-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Giriş Ekranına Dön</span>
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* STANDART GİRİŞ MODU */
              <div>
                <div className="mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-4">
                    <Compass className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-white">Tekrar Hoş Geldin</h1>
                  <p className="text-slate-400 text-sm mt-1.5">
                    Hesabına giriş yap ve İstanbul'u keşfetmeye devam et.
                  </p>
                </div>

                {bilgi && (
                  <div className="flex items-start gap-2.5 bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl text-xs leading-relaxed mb-5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{bilgi}</span>
                  </div>
                )}

                {hata && (
                  <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs leading-relaxed mb-5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{hata}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
                      E-posta
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all"
                        placeholder="ornek@mail.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                        Şifre
                      </label>
                      <button
                        type="button"
                        onClick={() => setSifreSifirlamaModu(true)}
                        className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        Şifremi unuttum?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                      <input
                        type={sifreGoster ? 'text' : 'password'}
                        value={sifre}
                        onChange={(e) => setSifre(e.target.value)}
                        className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setSifreGoster((prev) => !prev)}
                        aria-label={sifreGoster ? 'Şifreyi gizle' : 'Şifreyi göster'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        {sifreGoster ? (
                          <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                        ) : (
                          <Eye className="w-4 h-4" strokeWidth={1.8} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={yukleniyor}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 disabled:opacity-60 transition-all duration-200 cursor-pointer"
                  >
                    <span>{yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}</span>
                    {!yukleniyor && <ArrowRight className="w-4 h-4" strokeWidth={2.2} />}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
                  Henüz hesabın yok mu?{' '}
                  <Link
                    href="/kayit"
                    className="font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Ücretsiz kayıt ol
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-800/60 pt-3">
            Giriş yaparak kullanım ve topluluk kurallarını kabul etmiş olursun.
          </div>
        </div>
      </section>
    </div>
  )
}