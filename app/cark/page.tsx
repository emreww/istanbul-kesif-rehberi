'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Link from 'next/link'

interface WheelItem {
  id: string
  name: string
  district: string
  average_rating: number
  category_name?: string
  category_icon?: string
}

const RENKLER = [
  '#ea580c', // Koyu Turuncu
  '#7c3aed', // Mor
  '#db2777', // Pembe / Fuşya
  '#0284c7', // Gök Mavisi
  '#059669', // Zümrüt Yeşili
  '#d97706', // Kehribar / Sarı
  '#4f46e5', // İndigo
  '#e11d48', // Kırmızı
  '#0d9488', // Teal
  '#9333ea', // Parlak Mor
  '#f97316', // Turuncu
  '#2563eb', // Kraliyet Mavisi
]

// Web Audio API ile çark tık sesi ve zafer jingle'ı
class WheelSoundFX {
  private ctx: AudioContext | null = null

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playTick(frequency = 650) {
    try {
      this.initCtx()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04)

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start()
      osc.stop(this.ctx.currentTime + 0.045)
    } catch {
      // Sessiz kal
    }
  }

  playWin() {
    try {
      this.initCtx()
      if (!this.ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1)

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.4)

        osc.connect(gain)
        gain.connect(this.ctx.destination)

        osc.start(this.ctx.currentTime + idx * 0.1)
        osc.stop(this.ctx.currentTime + idx * 0.1 + 0.45)
      })
    } catch {
      // Sessiz kal
    }
  }
}

const soundFX = new WheelSoundFX()

function launchConfetti() {
  const colors = ['#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ffd700']
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.top = '40%'
    el.style.left = '50%'
    el.style.width = Math.random() * 8 + 6 + 'px'
    el.style.height = Math.random() * 12 + 8 + 'px'
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
    el.style.zIndex = '9999'
    el.style.pointerEvents = 'none'
    document.body.appendChild(el)

    const angle = Math.random() * Math.PI * 2
    const velocity = 8 + Math.random() * 12
    const dx = Math.cos(angle) * velocity
    const dy = Math.sin(angle) * velocity - 4
    const rot = Math.random() * 720 - 360

    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 35}px), calc(-50% + ${dy * 35 + 80}px)) scale(0.6) rotate(${rot}deg)`, opacity: 0 },
      ],
      {
        duration: 1400 + Math.random() * 600,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      }
    ).onfinish = () => el.remove()
  }
}

export default function CarkPage() {
  const [wheelItems, setWheelItems] = useState<WheelItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WheelItem | null>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [tickerWobble, setTickerWobble] = useState(false)
  const [isRandomLoading, setIsRandomLoading] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleShare = async () => {
    if (!selectedItem) return
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/mekan/${selectedItem.id}` : ''
    const shareText = `🎡 İstanbul Keşif Çarkı bugün bize burayı seçti: ${selectedItem.name} (${selectedItem.district}) ⭐ ${Number(selectedItem.average_rating).toFixed(1)}!\nSen de çevir ve keşfet:`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `🎡 İstanbul Keşif Çarkı: ${selectedItem.name}`,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (e) {
        // Kullanıcı iptal etti veya desteklenmiyor, modalı aç
      }
    }
    setIsShareModalOpen(true)
  }

  const copyToClipboard = () => {
    if (!selectedItem) return
    const shareUrl = `${window.location.origin}/mekan/${selectedItem.id}`
    const text = `🎡 İstanbul Keşif Çarkı Şanslı Mekan: ${selectedItem.name} (${selectedItem.district}) ⭐ ${Number(selectedItem.average_rating).toFixed(1)}\n${shareUrl}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)

      if (user) {
        const { data } = await supabase
          .from('wheel_slots')
          .select(`
            id,
            places ( id, name, district, average_rating, categories(name, icon) )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        const items: WheelItem[] = []
        ;(data ?? []).forEach((slot: any) => {
          const p = Array.isArray(slot.places) ? slot.places[0] : slot.places
          if (p) {
            const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories
            items.push({
              id: p.id,
              name: p.name,
              district: p.district,
              average_rating: p.average_rating || 5,
              category_name: cat?.name || undefined,
              category_icon: cat?.icon || undefined,
            })
          }
        })
        setWheelItems(items)
      }
    }
    fetchData()
  }, [supabase])

  // Çark döndürme ve 100% matematiksel ibre hizalama
  const spinWheel = useCallback(() => {
    if (wheelItems.length < 2) {
      alert('Çarkı çevirebilmek için lütfen en az 2 mekan ekleyin.')
      return
    }

    if (isSpinning) return

    setIsSpinning(true)
    setSelectedItem(null)
    setTickerWobble(true)

    // 1. Kazanan mekan indeksini belirle
    const winnerIndex = Math.floor(Math.random() * wheelItems.length)
    const winningPlace = wheelItems[winnerIndex]

    // 2. Dilim açısını ve kazanan dilimin merkez açısını hesapla
    // SVG açı uzayında 0° = 3 o'clock, 90° = 6 o'clock, 180° = 9 o'clock, 270° = 12 o'clock (İbre)
    const sliceAngle = 360 / wheelItems.length
    const segmentCenterAngle = winnerIndex * sliceAngle + sliceAngle / 2

    // 3. İbrenin (270°) tam olarak kazanan dilimin merkezine oturması için gereken hedef açı
    // (segmentCenterAngle + TotalRotation) % 360 = 270 => TargetRotation % 360 = (270 - segmentCenterAngle) % 360
    const targetMod = (270 - segmentCenterAngle + 3600) % 360
    const currentMod = ((rotation % 360) + 360) % 360

    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360

    // 5 ile 8 tam tur dönme ekle
    const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360
    const finalRotation = rotation + extraSpins + delta

    setRotation(finalRotation)

    // 4. Çark dönerken tık sesleri efekti
    let tickCount = 0
    const totalTicks = 28
    const playTickSequence = () => {
      if (tickCount < totalTicks) {
        soundFX.playTick(600 + Math.random() * 80)
        tickCount++
        // Hız azaldıkça gecikme artar (ease-out simülasyonu)
        const nextDelay = 70 + Math.pow(tickCount / totalTicks, 2.5) * 280
        soundIntervalRef.current = setTimeout(playTickSequence, nextDelay)
      }
    }
    playTickSequence()

    // 5. Dönüş tamamlandığında sonucu göster
    setTimeout(() => {
      setIsSpinning(false)
      setTickerWobble(false)
      setSelectedItem(winningPlace)
      soundFX.playWin()
      launchConfetti()
      if (soundIntervalRef.current) clearTimeout(soundIntervalRef.current)
    }, 4200)
  }, [wheelItems, isSpinning, rotation])

  const removeItem = async (placeId: string) => {
    if (!user) return
    await supabase.from('wheel_slots').delete().eq('user_id', user.id).eq('place_id', placeId)
    setWheelItems(prev => prev.filter(item => item.id !== placeId))
    router.refresh()
  }

  const createRandomWheel = async () => {
    if (!user) return
    setIsRandomLoading(true)
    try {
      const { data: randomPlaces } = await supabase
        .from('places')
        .select(`
          id, name, district, average_rating,
          categories ( name, icon )
        `)
        .eq('status', 'approved')
        .order('average_rating', { ascending: false })
        .limit(8)

      if (randomPlaces && randomPlaces.length >= 2) {
        await supabase.from('wheel_slots').delete().eq('user_id', user.id)
        const slots = randomPlaces.map((place, index) => ({
          user_id: user.id,
          place_id: place.id,
          wheel_name: 'Rastgele Çark',
          position: index,
        }))
        await supabase.from('wheel_slots').insert(slots)

        const items: WheelItem[] = randomPlaces.map((p: any) => {
          const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories
          return {
            id: p.id,
            name: p.name,
            district: p.district,
            average_rating: p.average_rating || 5,
            category_name: cat?.name,
            category_icon: cat?.icon,
          }
        })

        setWheelItems(items)
        setSelectedItem(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsRandomLoading(false)
    }
  }

  const radius = 175
  const center = 200
  const sliceAngle = wheelItems.length > 0 ? 360 / wheelItems.length : 360

  const renderWheelSegments = () => {
    if (wheelItems.length === 0) return null

    return wheelItems.map((item, index) => {
      const startAngle = index * sliceAngle
      const endAngle = startAngle + sliceAngle
      const largeArc = sliceAngle > 180 ? 1 : 0

      const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180)
      const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180)
      const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180)
      const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180)

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
        'Z',
      ].join(' ')

      return (
        <g key={item.id}>
          <path
            d={pathData}
            fill={RENKLER[index % RENKLER.length]}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeOpacity="0.85"
          />
        </g>
      )
    })
  }

  const renderLabels = () => {
    if (wheelItems.length === 0) return null

    return wheelItems.map((item, index) => {
      const midAngle = index * sliceAngle + sliceAngle / 2
      const labelRadius = radius * 0.62
      const x = center + labelRadius * Math.cos((midAngle * Math.PI) / 180)
      const y = center + labelRadius * Math.sin((midAngle * Math.PI) / 180)

      const displayName = item.name.length > 14 ? item.name.substring(0, 13) + '..' : item.name

      return (
        <g key={`label-${item.id}`} transform={`rotate(${midAngle} ${x} ${y})`}>
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={wheelItems.length > 8 ? '11' : '13'}
            fontWeight="800"
            fill="#ffffff"
            style={{
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)',
              letterSpacing: '0.02em',
            }}
          >
            {displayName}
          </text>
        </g>
      )
    })
  }

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        <p className="text-gray-400 font-medium">Çark hazırlanıyor...</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-16">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-10">
        <AnimatedSection>
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-bold uppercase tracking-wider mb-2">
              🎡 Kararsız Kalanlara Özel
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              İstanbul Keşif Çarkı
            </h1>
            <p className="text-sm md:text-base text-gray-400 mt-2 max-w-lg mx-auto">
              Nereye gideceğinizi seçemiyor musunuz? Çarkı çevirin, günün şanslı mekanını kader belirlesin!
            </p>
          </div>
        </AnimatedSection>

        {user ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* SOL / MERKEZ KOLON: ÇARK VE DÖNDÜRME ALANI */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <AnimatedSection delay={0.1}>
                <div className="relative flex items-center justify-center p-4">
                  {/* Dış LED Işık Halkası & Bezel Efekti */}
                  <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] rounded-full p-3 bg-gradient-to-tr from-slate-900 via-amber-950/40 to-slate-900 border-4 border-amber-500/30 shadow-[0_0_50px_rgba(249,115,22,0.25)] flex items-center justify-center">
                    
                    {/* Çevreleyen LED Işık Noktaları */}
                    <div className="absolute inset-1 rounded-full border border-dashed border-amber-400/40 pointer-events-none" />

                    {/* Dönen SVG Çark */}
                    <motion.div
                      className="w-full h-full relative"
                      animate={{ rotate: rotation }}
                      transition={{ duration: 4.2, ease: [0.15, 0.9, 0.2, 1] }}
                    >
                      <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                        <defs>
                          <radialGradient id="centerHubGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="70%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#94a3b8" />
                          </radialGradient>
                          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
                          </filter>
                        </defs>

                        {/* Dilimler ve İsimler */}
                        {renderWheelSegments()}
                        {renderLabels()}

                        {/* Dış Çember Çerçevesi */}
                        <circle
                          cx={center}
                          cy={center}
                          r={radius}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="5"
                          strokeOpacity="0.9"
                        />

                        {/* Orta Göbek */}
                        <circle
                          cx={center}
                          cy={center}
                          r="34"
                          fill="url(#centerHubGrad)"
                          stroke="#ea580c"
                          strokeWidth="4"
                          filter="url(#shadow)"
                        />
                        <text
                          x={center}
                          y={center}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="20"
                        >
                          🎡
                        </text>
                      </svg>
                    </motion.div>

                    {/* TEPE İBRESİ (OK) - Tam 12 o'clock (270°) - Kusursuz Hizalanmış ve Animasyonlu */}
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-30 transition-transform duration-100 ${
                        tickerWobble ? 'animate-ticker' : ''
                      }`}
                    >
                      <div className="relative flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                        {/* İbre Gövdesi */}
                        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[30px] border-l-transparent border-r-transparent border-t-amber-400" />
                        {/* İbre Üst Vurgusu */}
                        <div className="absolute -top-3 w-5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border-2 border-white shadow-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>

              {/* Kontrol Butonları */}
              <AnimatedSection delay={0.2}>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 w-full max-w-md">
                  <button
                    onClick={spinWheel}
                    disabled={isSpinning || wheelItems.length < 2}
                    className="btn-primary text-base py-3.5 px-8 flex-1 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSpinning ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Çark Dönüyor...
                      </span>
                    ) : (
                      '✨ Çarkı Çevir!'
                    )}
                  </button>
                  <button
                    onClick={createRandomWheel}
                    disabled={isSpinning || isRandomLoading}
                    className="btn-secondary text-sm py-3.5 px-6 disabled:opacity-50"
                  >
                    {isRandomLoading ? 'Oluşturuluyor...' : '🎲 Rastgele Doldur'}
                  </button>
                </div>
              </AnimatedSection>

              {/* KAZANAN MEKAN KARTI (SONUÇ) */}
              <AnimatePresence>
                {selectedItem && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="mt-6 w-full max-w-md glass-panel p-6 rounded-3xl border-2 border-amber-500/50 shadow-[0_0_40px_rgba(249,115,22,0.3)] text-center relative overflow-hidden"
                  >
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                    
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase mb-2">
                      🎉 Tebrikler! Seçilen Mekan
                    </span>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                      {selectedItem.name}
                    </h2>

                    <p className="text-gray-300 text-sm mt-1.5 flex items-center justify-center gap-2">
                      <span>📍 {selectedItem.district}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">⭐ {Number(selectedItem.average_rating).toFixed(1)} Puan</span>
                      {selectedItem.category_name && (
                        <>
                          <span>•</span>
                          <span className="text-primary-300">{selectedItem.category_icon} {selectedItem.category_name}</span>
                        </>
                      )}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                      <Link
                        href={`/mekan/${selectedItem.id}`}
                        className="btn-primary text-xs py-2.5 px-4"
                      >
                        Mekanı İncele →
                      </Link>
                      <button
                        onClick={handleShare}
                        className="px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition hover:scale-105 flex items-center gap-1.5"
                      >
                        📱 Paylaş
                      </button>
                      <button
                        onClick={spinWheel}
                        className="btn-secondary text-xs py-2.5 px-4"
                      >
                        🔄 Tekrar Çevir
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PAYLAŞIM MODALI */}
              <AnimatePresence>
                {isShareModalOpen && selectedItem && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="glass-panel p-6 rounded-3xl border border-white/20 max-w-sm w-full shadow-2xl space-y-4 text-center"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <span>🎉</span> Çark Sonucunu Paylaş
                        </h3>
                        <button
                          onClick={() => setIsShareModalOpen(false)}
                          className="text-gray-400 hover:text-white text-sm p-1"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Paylaşım Kartı Önizleme */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-purple-500/20 border border-amber-500/30 text-left relative overflow-hidden">
                        <div className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                          🎡 İstanbul Keşif Çarkı
                        </div>
                        <div className="font-black text-lg text-white mt-1">
                          {selectedItem.name}
                        </div>
                        <div className="text-xs text-gray-300 mt-0.5">
                          📍 {selectedItem.district} • ⭐ {Number(selectedItem.average_rating).toFixed(1)}
                        </div>
                        <div className="mt-3 text-[10px] text-gray-400 border-t border-white/10 pt-1.5 flex items-center justify-between">
                          <span>istanbul-kesif-rehberi</span>
                          <span className="text-amber-300">Günün Şanslı Mekanı ✨</span>
                        </div>
                      </div>

                      {/* Paylaşım Seçenekleri */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                            `🎡 İstanbul Keşif Çarkı bugün bize burayı seçti: *${selectedItem.name}* (${selectedItem.district}) ⭐ ${Number(selectedItem.average_rating).toFixed(1)}!\n\nSen de dene: ${typeof window !== 'undefined' ? window.location.origin : ''}/mekan/${selectedItem.id}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-1.5"
                        >
                          <span>💬</span> WhatsApp
                        </a>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(
                            `${typeof window !== 'undefined' ? window.location.origin : ''}/mekan/${selectedItem.id}`
                          )}&text=${encodeURIComponent(
                            `🎡 İstanbul Keşif Çarkı Şanslı Mekan: ${selectedItem.name} ⭐ ${Number(selectedItem.average_rating).toFixed(1)}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-sky-600/20 border border-sky-500/40 text-sky-300 font-bold text-xs hover:bg-sky-600 hover:text-white transition flex items-center justify-center gap-1.5"
                        >
                          <span>✈️</span> Telegram
                        </a>
                      </div>

                      {/* Bağlantıyı Kopyala Butonu */}
                      <button
                        onClick={copyToClipboard}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <span>📋</span>
                        {copied ? '✅ Bağlantı Kopyalandı!' : 'Metin & Bağlantıyı Kopyala'}
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* SAĞ KOLON: ÇARKTAKİ MEKANLAR LİSTESİ */}
            <div className="lg:col-span-5">
              <AnimatedSection delay={0.3}>
                <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <span>📋</span> Çarktaki Mekanlar
                      </h3>
                      <p className="text-xs text-gray-400">Çevirme listesindeki toplam mekan sayısı</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 font-bold">
                      {wheelItems.length} / 12
                    </span>
                  </div>

                  {wheelItems.length > 0 ? (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {wheelItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-white/30"
                              style={{ backgroundColor: RENKLER[index % RENKLER.length] }}
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-gray-100 truncate">{item.name}</div>
                              <div className="text-xs text-gray-400">{item.district} • ⭐ {Number(item.average_rating).toFixed(1)}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition shrink-0 ml-2"
                            title="Çarktan Kaldır"
                          >
                            Kaldır
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4 space-y-3">
                      <div className="text-4xl">🎡</div>
                      <p className="text-sm text-gray-300 font-medium">Çarkınızda henüz mekan bulunmuyor.</p>
                      <p className="text-xs text-gray-500">
                        Mekan sayfalarından "Çarkıma Ekle" butonuna basabilir veya hemen yukarıdaki "Rastgele Doldur" butonuna tıklayabilirsiniz.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <Link
                      href="/kesfet"
                      className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
                    >
                      🔍 Yeni Mekanlar Keşfet & Ekle
                    </Link>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 glass-panel rounded-3xl max-w-md mx-auto p-8 border border-white/10">
            <div className="text-5xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-white mb-2">Giriş Yapmalısınız</h3>
            <p className="text-sm text-gray-400 mb-6">
              Çarkınıza mekan eklemek ve çarkı kişiselleştirmek için giriş yapmanız gerekmektedir.
            </p>
            <Link href="/giris" className="btn-primary inline-flex">
              Giriş Yap
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}