'use client'

import { useMemo, useState } from 'react'

export interface DailyActivityPoint {
  date: string        // 'YYYY-MM-DD'
  shortLabel: string  // '19 Kas'
  fullLabel: string   // '19 Kasım 2026 Perşembe'
  total: number
  places: number
  reviews: number
  users: number
  reports: number
}

interface ActivityTrendChartProps {
  data: DailyActivityPoint[]
  onSelectCategory?: (category: 'places' | 'reviews' | 'users' | 'reports', date: string) => void
}

type SeriesKey = 'total' | 'places' | 'reviews' | 'users' | 'reports'

const SERIES_META: Record<
  SeriesKey,
  { label: string; color: string; badgeClass: string }
> = {
  total:   { label: 'Toplam',     color: '#fbbf24', badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
  places:  { label: 'Mekanlar',   color: '#f59e0b', badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  reviews: { label: 'Yorumlar',   color: '#38bdf8', badgeClass: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
  users:   { label: 'Üyeler',     color: '#34d399', badgeClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
  reports: { label: 'Raporlar',   color: '#fb7185', badgeClass: 'bg-rose-400/15 text-rose-300 border-rose-400/30' },
}

export function ActivityTrendChart({ data, onSelectCategory }: ActivityTrendChartProps) {
  const [activeSeries, setActiveSeries] = useState<SeriesKey>('total')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const summary = useMemo(() => {
    const sum = data.reduce((acc, d) => acc + d[activeSeries], 0)
    const avg = data.length ? (sum / data.length).toFixed(1) : '0'
    const peak = data.reduce<DailyActivityPoint | null>(
      (best, d) => (!best || d[activeSeries] > best[activeSeries] ? d : best),
      null
    )
    return { sum, avg, peak }
  }, [data, activeSeries])

  const inspectedIndex = hoveredIndex ?? selectedIndex ?? (data.length ? data.length - 1 : null)
  const inspectedPoint = inspectedIndex !== null ? data[inspectedIndex] ?? null : null

  const width = 760
  const height = 185
  const padLeft = 36
  const padRight = 20
  const padTop = 22
  const padBottom = 32
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxVal = Math.max(...data.map((d) => d[activeSeries]), 1)

  const points = data.map((d, i) => {
    const val = d[activeSeries]
    const x = padLeft + (data.length > 1 ? (i * plotW) / (data.length - 1) : plotW / 2)
    const y = padTop + plotH - (val / maxVal) * plotH
    return { x, y, val, point: d, index: i }
  })

  const smoothLinePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = points[i - 1]
      const cp1x = prev.x + (p.x - prev.x) / 2
      return `C ${cp1x} ${prev.y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`
    })
    .join(' ')

  const areaPath =
    points.length > 0
      ? `${smoothLinePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`
      : ''

  const yTicks = [maxVal, Math.round(maxVal / 2), 0]
  const strokeColor = SERIES_META[activeSeries].color

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden shadow-xl space-y-5">
      {/* Üst Başlık ve Özet Metrikler */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span>📈</span> Son {data.length || 7} Günlük Aktivite Trendi
            </h3>
            <span className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-bold border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Canlı Trend
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Günlük ortalama: <strong className="text-gray-200">{summary.avg}</strong> • En yoğun gün:{' '}
            <strong className="text-amber-300">
              {summary.peak ? `${summary.peak.shortLabel} (${summary.peak[activeSeries]})` : '-'}
            </strong>
          </p>
        </div>

        {/* Seri Seçici Butonlar */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SERIES_META) as SeriesKey[]).map((key) => {
            const meta = SERIES_META[key]
            const isSelected = activeSeries === key
            const dayTotal = data.reduce((acc, item) => acc + item[key], 0)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSeries(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? meta.badgeClass + ' shadow-sm'
                    : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08] hover:text-gray-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span>{meta.label}</span>
                <span className="opacity-80 font-mono text-[11px]">{dayTotal}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grafik + Gün Detay Paneli */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
        <div className="xl:col-span-8 min-w-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-44 md:h-48 select-none overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="adminAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Yatay Grid ve Y Ekseni Etiketleri */}
            {yTicks.map((tick, idx) => {
              const y = padTop + (idx * plotH) / 2
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#9ca3af"
                    fontSize="10"
                    className="font-mono"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}

            {/* Dikey Aktif Gün Rehber Çizgisi */}
            {inspectedIndex !== null && points[inspectedIndex] && (
              <line
                x1={points[inspectedIndex].x}
                y1={padTop}
                x2={points[inspectedIndex].x}
                y2={padTop + plotH}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="3 3"
              />
            )}

            {/* Alan ve Eğri */}
            {areaPath && <path d={areaPath} fill="url(#adminAreaGrad)" className="transition-all duration-300" />}
            {smoothLinePath && (
              <path
                d={smoothLinePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="3"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            )}

            {/* Noktalar ve Geniş Tıklama/Hover Alanları */}
            {points.map((p) => {
              const isHighlighted = inspectedIndex === p.index
              return (
                <g
                  key={p.point.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(p.index)}
                  onClick={() => setSelectedIndex(p.index)}
                >
                  {/* Dokunma/hover kolaylığı için görünmez geniş hedef */}
                  <rect
                    x={p.x - plotW / (data.length * 1.6)}
                    y={padTop}
                    width={Math.max(24, plotW / Math.max(data.length, 1))}
                    height={plotH + padBottom}
                    fill="transparent"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHighlighted ? 6 : 4}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? 3 : 2}
                    className="transition-all duration-150"
                  />
                  {isHighlighted && (
                    <text
                      x={p.x}
                      y={Math.max(12, p.y - 11)}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {p.val}
                    </text>
                  )}
                  <text
                    x={p.x}
                    y={height - 8}
                    textAnchor="middle"
                    fill={p.index === data.length - 1 ? '#fbbf24' : isHighlighted ? '#e5e7eb' : '#9ca3af'}
                    fontSize="10.5"
                    fontWeight={p.index === data.length - 1 || isHighlighted ? '700' : '500'}
                  >
                    {p.index === data.length - 1 ? 'Bugün' : p.point.shortLabel}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Seçili / Hover Edilen Günün Kırılım Kartı */}
        <div className="xl:col-span-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
          {inspectedPoint ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-400">Gün Detayı</div>
                  <div className="text-sm font-bold text-white">{inspectedPoint.fullLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-amber-300 tabular-nums">
                    {inspectedPoint.total}
                  </div>
                  <div className="text-[10px] text-gray-400">toplam kayıt</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ['places', '📍 Mekan', inspectedPoint.places],
                    ['reviews', '💬 Yorum', inspectedPoint.reviews],
                    ['users', '👤 Üye', inspectedPoint.users],
                    ['reports', '⚠️ Rapor', inspectedPoint.reports],
                  ] as const
                ).map(([catKey, catLabel, count]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => onSelectCategory?.(catKey, inspectedPoint.date)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/5 transition text-left cursor-pointer"
                  >
                    <span className="text-gray-300 font-medium">{catLabel}</span>
                    <span className="font-bold text-white tabular-nums">{count}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400 py-8 text-center">Gösterilecek veri bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  )
}