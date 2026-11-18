'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Play,
  Square,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react'

interface LogEntry {
  id: string
  name: string
  district: string
  category: string
  imageUrl: string | null
  source: string
  time: string
}

export default function ScraperDashboardPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState({ total: 0, checked: 0, found: 0 })
  const [statusText, setStatusText] = useState('Hazır — Başlatmak için butona basın')
  const runningRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/scrape-images')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {}
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const startScraping = async () => {
    if (runningRef.current) return
    runningRef.current = true
    setIsRunning(true)
    setStatusText('Tarama devam ediyor...')

    while (runningRef.current) {
      try {
        const res = await fetch('/api/admin/scrape-images', { method: 'POST' })
        const data = await res.json()

        if (data.error) {
          setStatusText(`Hata: ${data.error}`)
          break
        }

        if (data.logs && data.logs.length > 0) {
          setLogs((prev) => [...prev.slice(-150), ...data.logs])
          await fetchStats()
        }

        if (data.done) {
          setStatusText('Tüm hedef mekanlar başarıyla tarandı!')
          break
        }
      } catch {
        setStatusText('Bağlantı hatası oluştu, 3 sn sonra tekrar deneniyor...')
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    runningRef.current = false
    setIsRunning(false)
  }

  const stopScraping = () => {
    runningRef.current = false
    setIsRunning(false)
    setStatusText('Kullanıcı tarafından durduruldu.')
  }

  const recentFoundImages = logs.filter((l) => l.imageUrl).slice(-6).reverse()

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ÜST BAŞLIK & KONTROLLER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
              <Terminal className="w-4 h-4" />
              <span>İstanbul Keşif Bot Konsolu</span>
            </div>
            <h1 className="font-serif text-3xl text-white">Otomatik Mekan Fotoğraf Tarayıcı</h1>
            <p className="text-sm text-slate-400 mt-1">{statusText}</p>
          </div>

          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                onClick={startScraping}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-sm px-6 py-3 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Taramayı Başlat</span>
              </button>
            ) : (
              <button
                onClick={stopScraping}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 font-semibold text-sm px-6 py-3 hover:bg-rose-500/30 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-rose-300" />
                <span>Durdur</span>
              </button>
            )}

            <button
              onClick={() => setLogs([])}
              title="Logları Temizle"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white p-3 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* İSTATİSTİK KUTULARI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Toplam Onaylı Mekan</div>
            <div className="font-serif text-3xl text-white mt-1">
              {stats.total.toLocaleString('tr-TR')}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Taranan Mekan</div>
            <div className="font-serif text-3xl text-sky-400 mt-1">
              {stats.checked.toLocaleString('tr-TR')}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Fotoğrafı Bulunan</div>
            <div className="font-serif text-3xl text-amber-400 mt-1">
              {stats.found.toLocaleString('tr-TR')}
            </div>
          </div>
        </div>

        {/* ANA İÇERİK: CANLI LOG TERMİNALİ + SON BULUNAN FOTOĞRAFLAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SOL: CANLI LOGLAR */}
          <div className="lg:col-span-7 rounded-2xl bg-[#04070d] border border-slate-800 overflow-hidden flex flex-col h-[520px]">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span>canli-log-akisi.log</span>
              </div>
              {isRunning && (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>İşleniyor...</span>
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2.5">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Henüz log kaydı yok. Yukarıdan "Taramayı Başlat" butonuna tıkla.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={`${log.id}-${i}`}
                    className="flex items-start gap-2.5 border-b border-slate-900 pb-2"
                  >
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    {log.imageUrl ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-200">
                        <span className="font-semibold text-white">{log.name}</span>{' '}
                        <span className="text-slate-400">
                          ({log.district} • {log.category})
                        </span>
                      </div>
                      {log.imageUrl ? (
                        <div className="text-emerald-400 truncate mt-0.5">
                          ✓ [{log.source}] {log.imageUrl}
                        </div>
                      ) : (
                        <div className="text-slate-500 mt-0.5">
                          — Görsel bulunamadı, kategori görseli atanacak
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* SAĞ: CANLI BULUNAN GÖRSEL ÖNİZLEMELERİ */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/50 border border-slate-800 p-5 h-[520px] flex flex-col">
            <div className="flex items-center gap-2 text-sm font-medium text-white mb-4">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Son Eşleşen Fotoğraflar (Canlı)</span>
            </div>

            {recentFoundImages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 px-6">
                Tarama başladığında bulunan mekan fotoğrafları burada anlık olarak önizlenecek.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
                {recentFoundImages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800"
                  >
                    <div className="aspect-[16/10] bg-slate-900 relative">
                      <img
                        src={item.imageUrl!}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-amber-300">
                        {item.source}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-medium text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{item.district}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}