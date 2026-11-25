'use client'

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/notifications'
import { revalidateAppCache } from '@/app/actions/admin'
import { useConfirm } from '@/components/admin/ConfirmDialog'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { AuditLogTab } from '@/components/admin/AuditLogTab'
import { logAdminAction, type AuditEntry } from '@/lib/admin/audit'
import { hasRole, TAB_MIN_ROLE, type AdminRole } from '@/lib/admin/roles'

/* ───────────────────────── Types ───────────────────────── */
type TabId =
  | 'mekanlar' | 'tum_mekanlar' | 'medya' | 'yorumlar'
  | 'kullanicilar' | 'sahiplik' | 'raporlar' | 'kapatilan_raporlar'
  | 'audit_log'

export interface CurrentAdmin {
  id: string
  username: string | null
  role: AdminRole
}

type ReportType = 'place' | 'review' | 'user'
type ReportFilter = 'all' | ReportType

interface Category { id: number; name: string }
interface Place {
  id: string; name: string; district?: string; description?: string
  address?: string; category_id?: number; price_range?: number | null
  user_id?: string; created_by?: string; owner_id?: string | null
  status?: string; created_at: string
}
interface Profile {
  id: string; username?: string; created_at: string
  total_reviews?: number; is_admin?: boolean; is_banned?: boolean; ban_reason?: string | null
}
interface Review {
  id: string; rating: number; comment?: string; created_at: string
  user_id?: string; place_id?: string
}
interface Report {
  id: string; report_type: ReportType; reason?: string; status?: string
  created_at?: string; closed_at?: string; reopened_at?: string
  user_id?: string; place_id?: string; review_id?: string; reported_user_id?: string
}
interface OwnershipRequest {
  id: string; status: string; message?: string; created_at: string
  place_id?: string; user_id?: string
  place_name?: string | null
  username?: string | null
}
interface Photo {
  id: string; url: string; caption?: string; created_at: string
  user_id?: string; place_id?: string
  profiles?: { username: string }[] | null
  places?: { name: string }[] | null
}
interface Stats {
  totalPlaces: number; totalUsers: number; totalReviews: number
  totalActiveReports: number; totalClosedReports: number
  totalPhotos: number; pendingCount: number
}

interface DailyActivityPoint {
  date: string
  shortLabel: string
  fullLabel: string
  total: number
  places: number
  reviews: number
  users: number
  reports: number
}

type SeriesKey = 'total' | 'places' | 'reviews' | 'users' | 'reports'

/* ──────────────────── Constants ──────────────────── */
const CLOSED_REPORTS_STORAGE_KEY = 'istanbul_admin_closed_reports'

const TABS: { id: TabId; label: string; icon: string; color: string; group: 'content' | 'system' }[] = [
  { id: 'mekanlar',           label: 'Mekan Onayları',  icon: '📍', color: 'text-amber-400',   group: 'content' },
  { id: 'tum_mekanlar',       label: 'Tüm Mekanlar',    icon: '🏪', color: 'text-indigo-400',  group: 'content' },
  { id: 'medya',              label: 'Medya Denetimi',  icon: '📸', color: 'text-pink-400',    group: 'content' },
  { id: 'yorumlar',           label: 'Yorumlar',        icon: '💬', color: 'text-sky-400',     group: 'content' },
  { id: 'kullanicilar',       label: 'Kullanıcılar',    icon: '👥', color: 'text-emerald-400', group: 'content' },
  { id: 'sahiplik',           label: 'Sahiplik',        icon: '🏢', color: 'text-purple-400',  group: 'content' },
  { id: 'raporlar',           label: 'Aktif Raporlar',  icon: '⚠️', color: 'text-rose-400',    group: 'content' },
  { id: 'kapatilan_raporlar', label: 'Kapatılanlar',    icon: '📁', color: 'text-teal-400',    group: 'content' },
  { id: 'audit_log',          label: 'İşlem Geçmişi',   icon: '📋', color: 'text-amber-300',   group: 'system'  },
]

const SERIES_META: Record<
  SeriesKey,
  { label: string; color: string; badgeClass: string }
> = {
  total:   { label: 'Toplam',   color: '#fbbf24', badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
  places:  { label: 'Mekanlar', color: '#f59e0b', badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  reviews: { label: 'Yorumlar', color: '#38bdf8', badgeClass: 'bg-sky-400/15 text-sky-300 border-sky-400/30' },
  users:   { label: 'Üyeler',   color: '#34d399', badgeClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
  reports: { label: 'Raporlar', color: '#fb7185', badgeClass: 'bg-rose-400/15 text-rose-300 border-rose-400/30' },
}

const motionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
} as const

/* ──────────────────── Reusable UI ──────────────────── */

function SectionHeader({
  title, subtitle, badge, action,
}: { title: string; subtitle?: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-semibold">
              {badge}
            </span>
          )}
        </h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center py-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
      <div className="text-5xl mb-3 opacity-80">{icon}</div>
      <h4 className="text-base font-bold text-gray-200">{title}</h4>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
    </div>
  )
}

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden group hover:border-white/20 transition">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${accent} opacity-10 blur-2xl group-hover:opacity-20 transition`} />
      <div className="flex items-start justify-between relative">
        <div className={`w-11 h-11 rounded-xl ${accent} flex items-center justify-center text-xl`}>{icon}</div>
        <div className="text-3xl font-extrabold text-white tabular-nums">{value}</div>
      </div>
      <div className="text-[11px] font-semibold text-gray-400 mt-3 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function Badge({
  variant = 'neutral', children,
}: { variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    neutral: 'bg-white/5 text-gray-300 border-white/10',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  }
  return (
    <span className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-bold border ${styles[variant]}`}>
      {children}
    </span>
  )
}

function BulkBar({ count, children }: { count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="sticky top-2 z-20 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-amber-400/30 shadow-lg shadow-amber-400/5 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 text-xs text-amber-200 font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        {count} öğe seçildi
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </motion.div>
  )
}

function FilterPills<T extends string>({
  options, value, onChange, accent = 'rose',
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; accent?: 'rose' | 'teal' }) {
  const activeClass = accent === 'rose'
    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
    : 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
            value === o.id ? activeClass : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PlaceAccordion({
  place, expanded, onToggle, categoryName, priceLabel, actions, checkbox, statusBadge,
}: {
  place: Place; expanded: boolean; onToggle: () => void
  categoryName: string; priceLabel: string
  actions: React.ReactNode; checkbox?: React.ReactNode; statusBadge?: React.ReactNode
}) {
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.03] overflow-hidden transition hover:border-white/20">
      <div className="flex items-center p-4 md:p-5 hover:bg-white/5 transition text-left gap-3">
        {checkbox}
        <button type="button" onClick={onToggle} className="w-full flex items-center justify-between cursor-pointer gap-2">
          <div className="space-y-1 text-left min-w-0">
            <div className="font-bold text-lg text-white flex items-center gap-2 truncate">
              <span>{place.status === 'pending' ? '📍' : '🏪'}</span>
              <span className="truncate">{place.name}</span>
            </div>
            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
              <span>🏙️ {place.district || 'Belirtilmemiş'}</span>
              <span className="text-gray-600">•</span>
              <span>📅 {new Date(place.created_at).toLocaleDateString('tr-TR')}</span>
              {statusBadge && <><span className="text-gray-600">•</span>{statusBadge}</>}
            </div>
          </div>
          <span className={`transform transition-transform text-gray-400 shrink-0 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/10 bg-black/20"
          >
            <div className="p-4 md:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide">Kategori</div>
                  <div className="text-sm font-semibold text-gray-200 mt-0.5">{categoryName}</div>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide">Fiyat Aralığı</div>
                  <div className="text-sm font-semibold text-gray-200 mt-0.5">{priceLabel}</div>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide">Ekleyen User</div>
                  <div className="text-xs font-mono text-gray-300 mt-0.5 truncate">
                    {place.created_by || place.user_id || 'Anonim'}
                  </div>
                </div>
              </div>
              {place.description && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Açıklama</div>
                  <p className="text-sm text-gray-200 leading-relaxed">{place.description}</p>
                </div>
              )}
              {place.address && (
                <div className="text-sm text-gray-300">📍 <strong>Adres:</strong> {place.address}</div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">{actions}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActivityTrendChart({
  data,
  onSelectCategory,
}: {
  data: DailyActivityPoint[]
  onSelectCategory?: (category: 'places' | 'reviews' | 'users' | 'reports', date: string) => void
}) {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span>📈</span> Son {data.length || 7} Günlük Aktivite Trendi
            </h3>
            <Badge variant="success">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Canlı Trend
            </Badge>
          </div>
          <p className="text-xs text-gray-400">
            Günlük ortalama: <strong className="text-gray-200">{summary.avg}</strong> • En yoğun gün:{' '}
            <strong className="text-amber-300">
              {summary.peak ? `${summary.peak.shortLabel} (${summary.peak[activeSeries]})` : '-'}
            </strong>
          </p>
        </div>

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

            {points.map((p) => {
              const isHighlighted = inspectedIndex === p.index
              return (
                <g
                  key={p.point.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(p.index)}
                  onClick={() => setSelectedIndex(p.index)}
                >
                  <rect
                    x={p.x - plotW / (Math.max(data.length, 1) * 1.6)}
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

/* ──────────────────── Main ──────────────────── */

export default function AdminTabs({ currentAdmin }: { currentAdmin: CurrentAdmin }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()
  const { confirm, prompt } = useConfirm()

  const [activeTab, setActiveTab] = useState<TabId>('mekanlar')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null)

  const [pendingPlaces, setPendingPlaces] = useState<Place[]>([])
  const [allPlaces, setAllPlaces] = useState<Place[]>([])
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [closedReports, setClosedReports] = useState<Report[]>([])
  const [ownershipRequests, setOwnershipRequests] = useState<OwnershipRequest[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allPhotos, setAllPhotos] = useState<Photo[]>([])
  const [dailySeries, setDailySeries] = useState<DailyActivityPoint[]>([])

  const [reportTypeFilter, setReportTypeFilter] = useState<ReportFilter>('all')
  const [closedReportTypeFilter, setClosedReportTypeFilter] = useState<ReportFilter>('all')

  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([])
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])

  const [searchUsers, setSearchUsers] = useState('')
  const [searchReports, setSearchReports] = useState('')
  const [searchClosedReports, setSearchClosedReports] = useState('')
  const [searchPlaces, setSearchPlaces] = useState('')
  const [searchOwnership, setSearchOwnership] = useState('')

  const [stats, setStats] = useState<Stats>({
    totalPlaces: 0, totalUsers: 0, totalReviews: 0,
    totalActiveReports: 0, totalClosedReports: 0,
    totalPhotos: 0, pendingCount: 0,
  })

  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditLoaded, setAuditLoaded] = useState(false)

  /* ── Persistence ── */
  const loadSavedClosedReports = useCallback((): Report[] => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(CLOSED_REPORTS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  }, [])

  const saveClosedReports = useCallback((list: Report[]) => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(CLOSED_REPORTS_STORAGE_KEY, JSON.stringify(list)) }
    catch (e) { console.error('Failed to save closed reports:', e) }
  }, [])

  /* ── Fetch ── */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [cat, allPlace, pend, totalPlace, profile, totalUser, review, totalReview, allReport, rawRequestsRes, photosRes] =
        await Promise.all([
          supabase.from('categories').select('*'),
          supabase.from('places').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('places').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
          supabase.from('places').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('reviews').select('id, rating, comment, created_at, user_id, place_id').order('created_at', { ascending: false }).limit(100),
          supabase.from('reviews').select('id', { count: 'exact', head: true }),
          supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('ownership_requests').select('id, status, message, created_at, place_id, user_id').order('created_at', { ascending: false }),
          supabase.from('photos').select(`id, url, caption, created_at, user_id, place_id, profiles ( username ), places ( name )`, { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        ])

      const cats = (cat.data || []) as Category[]
      const allPlacesData = (allPlace.data || []) as Place[]
      const pending = (pend.data || []) as Place[]
      const profiles = (profile.data || []) as Profile[]
      const reviews = (review.data || []) as Review[]
      const allReports = (allReport.data || []) as Report[]
      const rawRequests = (rawRequestsRes.data || []) as Array<{
        id: string; status: string; message?: string; created_at: string
        place_id?: string; user_id?: string
      }>

      const placeNameById = new Map<string, string>()
      allPlacesData.forEach((p) => placeNameById.set(p.id, p.name))

      const usernameById = new Map<string, string>()
      profiles.forEach((u) => {
        if (u.username) usernameById.set(u.id, u.username)
      })

      const missingPlaceIds = Array.from(
        new Set(rawRequests.map((r) => r.place_id).filter((id): id is string => Boolean(id) && !placeNameById.has(id!)))
      )
      if (missingPlaceIds.length > 0) {
        const { data: extraPlaces } = await supabase.from('places').select('id, name').in('id', missingPlaceIds)
        ;(extraPlaces || []).forEach((p: { id: string; name: string }) => placeNameById.set(p.id, p.name))
      }

      const missingUserIds = Array.from(
        new Set(rawRequests.map((r) => r.user_id).filter((id): id is string => Boolean(id) && !usernameById.has(id!)))
      )
      if (missingUserIds.length > 0) {
        const { data: extraProfiles } = await supabase.from('profiles').select('id, username').in('id', missingUserIds)
        ;(extraProfiles || []).forEach((u: { id: string; username?: string }) => {
          if (u.username) usernameById.set(u.id, u.username)
        })
      }

      const enrichedRequests: OwnershipRequest[] = rawRequests.map((r) => ({
        ...r,
        place_name: r.place_id ? placeNameById.get(r.place_id) ?? null : null,
        username: r.user_id ? usernameById.get(r.user_id) ?? null : null,
      }))

      setCategories(cats)
      setAllPlaces(allPlacesData)
      setPendingPlaces(pending)
      setAllProfiles(profiles)
      setAllReviews(reviews)
      setOwnershipRequests(enrichedRequests)
      setAllPhotos((photosRes.data ?? []) as Photo[])

      const storedClosed = loadSavedClosedReports()
      const storedClosedIds = new Set(storedClosed.map((r) => r.id))
      const activeList: Report[] = []
      const closedList: Report[] = [...storedClosed]

      allReports.forEach((r) => {
        if (r.status === 'closed' || r.status === 'resolved' || storedClosedIds.has(r.id)) {
          if (!closedList.find((c) => c.id === r.id)) closedList.unshift(r)
        } else activeList.push(r)
      })

      setReports(activeList)
      setClosedReports(closedList)

      const tz = 'Europe/Istanbul'
      const toDayKey = (iso: string) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso))

      const buckets = new Map<string, DailyActivityPoint>()
      const now = new Date()

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const key = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
        buckets.set(key, {
          date: key,
          shortLabel: d.toLocaleDateString('tr-TR', { timeZone: tz, day: 'numeric', month: 'short' }),
          fullLabel: d.toLocaleDateString('tr-TR', {
            timeZone: tz,
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          }),
          total: 0,
          places: 0,
          reviews: 0,
          users: 0,
          reports: 0,
        })
      }

      const addToBucket = (iso: string | undefined, key: 'places' | 'reviews' | 'users' | 'reports') => {
        if (!iso) return
        const bucket = buckets.get(toDayKey(iso))
        if (!bucket) return
        bucket[key] += 1
        bucket.total += 1
      }

      allPlacesData.forEach((p) => addToBucket(p.created_at, 'places'))
      reviews.forEach((r) => addToBucket(r.created_at, 'reviews'))
      profiles.forEach((u) => addToBucket(u.created_at, 'users'))
      allReports.forEach((rep) => addToBucket(rep.created_at, 'reports'))

      setDailySeries(Array.from(buckets.values()))

      setStats({
        totalPlaces: totalPlace.count || 0,
        totalUsers: totalUser.count || 0,
        totalReviews: totalReview.count || 0,
        totalActiveReports: activeList.length,
        totalClosedReports: closedList.length,
        totalPhotos: photosRes.count || 0,
        pendingCount: pending.length,
      })
    } catch (err) {
      console.error('Admin data fetch error:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [supabase, loadSavedClosedReports])

  useEffect(() => { void fetchData(false) }, [fetchData])

  /* ── Realtime ── */
  useEffect(() => {
    const channel = supabase
      .channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, () => void fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => void fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ownership_requests' }, () => void fetchData(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const newReport = payload.new as Report
        setReports((prev) => [newReport, ...prev])
        setStats((prev) => ({ ...prev, totalActiveReports: prev.totalActiveReports + 1 }))
        addNotification('Yeni bir şikayet raporu geldi ⚠️', 'warning')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        const updated = payload.new as Report
        if (updated.status === 'closed' || updated.status === 'resolved') {
          setReports((prev) => prev.filter((r) => r.id !== updated.id))
          setClosedReports((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)])
        } else {
          setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, (payload) => {
        const deletedId = (payload.old as { id?: string })?.id
        if (!deletedId) return
        setReports((prev) => prev.filter((r) => r.id !== deletedId))
        setClosedReports((prev) => prev.filter((r) => r.id !== deletedId))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [supabase, fetchData, addNotification])

  /* ── Audit lazy load ── */
  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setAuditLog((data ?? []) as AuditEntry[])
      setAuditLoaded(true)
    } catch (err) {
      addNotification('Audit log yüklenemedi: ' + (err as Error).message, 'warning')
    } finally {
      setAuditLoading(false)
    }
  }, [supabase, addNotification])

  useEffect(() => {
    if (activeTab === 'audit_log' && !auditLoaded && hasRole(currentAdmin.role, 'admin')) {
      void fetchAuditLog()
    }
  }, [activeTab, auditLoaded, currentAdmin.role, fetchAuditLog])

  useEffect(() => {
    const visible = TABS.filter((t) => hasRole(currentAdmin.role, TAB_MIN_ROLE[t.id]))
    if (!visible.find((t) => t.id === activeTab)) {
      setActiveTab(visible[0]?.id ?? 'mekanlar')
    }
  }, [currentAdmin.role, activeTab])

  /* ── Helpers ── */
  const refresh = async () => { await revalidateAppCache(); router.refresh() }

  const toggleInArray = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string, checked: boolean) => {
    setter((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }
  const toggleAll = (setter: React.Dispatch<React.SetStateAction<string[]>>, ids: string[], checked: boolean) => {
    setter(checked ? ids : [])
  }
  const log = (params: Omit<Parameters<typeof logAdminAction>[0], 'supabase' | 'adminId' | 'adminUsername'>) =>
    logAdminAction({
      supabase,
      adminId: currentAdmin.id,
      adminUsername: currentAdmin.username,
      ...params,
    })

  /* ── Place actions ── */
  const approvePlace = async (id: string) => {
    const place = pendingPlaces.find((p) => p.id === id)
    const { error } = await supabase.from('places').update({ status: 'approved', is_verified: true }).eq('id', id)
    if (error) return addNotification('Onaylama hatası: ' + error.message, 'warning')
    setPendingPlaces((prev) => prev.filter((p) => p.id !== id))
    setAllPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p)))
    setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
    await log({ action: 'approve_place', targetType: 'place', targetId: id, targetName: place?.name })
    addNotification('Mekan onaylandı ✅', 'success')
    await refresh()
  }

  const rejectPlace = async (id: string) => {
    const place = pendingPlaces.find((p) => p.id === id)
    const { error } = await supabase.from('places').update({ status: 'rejected' }).eq('id', id)
    if (error) return addNotification('Reddetme hatası: ' + error.message, 'warning')
    setPendingPlaces((prev) => prev.filter((p) => p.id !== id))
    setAllPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p)))
    setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
    await log({ action: 'reject_place', targetType: 'place', targetId: id, targetName: place?.name })
    addNotification('Mekan reddedildi ❌', 'warning')
    await refresh()
  }

  const deletePlace = async (id: string) => {
    const place = allPlaces.find((p) => p.id === id)
    const ok = await confirm({
      title: 'Mekanı kalıcı olarak sil?',
      description: `"${place?.name ?? 'Bu mekan'}" ve tüm ilişkili veriler geri alınamaz şekilde silinecek.`,
      confirmLabel: 'Kalıcı Sil',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('places').delete().eq('id', id)
    if (error) return addNotification('Silme hatası: ' + error.message, 'warning')
    setAllPlaces((prev) => prev.filter((p) => p.id !== id))
    setPendingPlaces((prev) => prev.filter((p) => p.id !== id))
    setStats((prev) => ({ ...prev, totalPlaces: Math.max(0, prev.totalPlaces - 1) }))
    await log({ action: 'delete_place', targetType: 'place', targetId: id, targetName: place?.name })
    addNotification('Mekan kalıcı olarak silindi 🗑️', 'info')
    await refresh()
  }

  const bulkApprovePending = async () => {
    if (!selectedPendingIds.length) return
    setBulkLoading(true)
    try {
      const { error } = await supabase.from('places').update({ status: 'approved', is_verified: true }).in('id', selectedPendingIds)
      if (error) throw error
      setPendingPlaces((prev) => prev.filter((p) => !selectedPendingIds.includes(p.id)))
      setAllPlaces((prev) => prev.map((p) => (selectedPendingIds.includes(p.id) ? { ...p, status: 'approved' } : p)))
      setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - selectedPendingIds.length) }))
      await log({
        action: 'bulk_approve_places', targetType: 'place',
        details: { count: selectedPendingIds.length, ids: selectedPendingIds },
      })
      addNotification(`${selectedPendingIds.length} mekan toplu onaylandı! ✅`, 'success')
      setSelectedPendingIds([])
      await refresh()
    } catch (err) { addNotification('Toplu işlem hatası: ' + (err as Error).message, 'warning') }
    finally { setBulkLoading(false) }
  }

  const bulkRejectPending = async () => {
    if (!selectedPendingIds.length) return
    const ok = await confirm({
      title: `${selectedPendingIds.length} mekanı reddet?`,
      description: 'Seçili mekanlar kullanıcıya gösterilmeyecek.',
      confirmLabel: 'Reddet',
      variant: 'danger',
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      const { error } = await supabase.from('places').update({ status: 'rejected' }).in('id', selectedPendingIds)
      if (error) throw error
      setPendingPlaces((prev) => prev.filter((p) => !selectedPendingIds.includes(p.id)))
      setAllPlaces((prev) => prev.map((p) => (selectedPendingIds.includes(p.id) ? { ...p, status: 'rejected' } : p)))
      setStats((prev) => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - selectedPendingIds.length) }))
      await log({
        action: 'bulk_reject_places', targetType: 'place',
        details: { count: selectedPendingIds.length, ids: selectedPendingIds },
      })
      addNotification(`${selectedPendingIds.length} mekan reddedildi ❌`, 'warning')
      setSelectedPendingIds([])
      await refresh()
    } catch (err) { addNotification('Toplu işlem hatası: ' + (err as Error).message, 'warning') }
    finally { setBulkLoading(false) }
  }

  /* ── Reviews ── */
  const deleteReview = async (id: string) => {
    const review = allReviews.find((r) => r.id === id)
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) return addNotification('Yorum silinemedi: ' + error.message, 'warning')
    setAllReviews((prev) => prev.filter((r) => r.id !== id))
    setStats((prev) => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - 1) }))
    await log({
      action: 'delete_review', targetType: 'review', targetId: id,
      targetName: review?.comment?.slice(0, 60) ?? null,
    })
    addNotification('Yorum silindi 🗑️', 'info')
    await refresh()
  }

  const bulkDeleteReviews = async () => {
    if (!selectedReviewIds.length) return
    const ok = await confirm({
      title: `${selectedReviewIds.length} yorumu sil?`,
      description: 'Seçili yorumlar kalıcı olarak silinecek.',
      confirmLabel: 'Kalıcı Sil',
      variant: 'danger',
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      const { error } = await supabase.from('reviews').delete().in('id', selectedReviewIds)
      if (error) throw error
      setAllReviews((prev) => prev.filter((r) => !selectedReviewIds.includes(r.id)))
      setStats((prev) => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - selectedReviewIds.length) }))
      await log({
        action: 'bulk_delete_reviews', targetType: 'review',
        details: { count: selectedReviewIds.length, ids: selectedReviewIds },
      })
      addNotification(`${selectedReviewIds.length} yorum silindi 🗑️`, 'info')
      setSelectedReviewIds([])
      await refresh()
    } catch (err) { addNotification('Toplu silme hatası: ' + (err as Error).message, 'warning') }
    finally { setBulkLoading(false) }
  }

  /* ── Photos ── */
  const deletePhoto = async (id: string) => {
    const photo = allPhotos.find((p) => p.id === id)
    const ok = await confirm({
      title: 'Bu görseli sil?',
      description: 'Görsel kalıcı olarak silinecek.',
      confirmLabel: 'Sil',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('photos').delete().eq('id', id)
    if (error) return addNotification('Görsel silinemedi: ' + error.message, 'warning')
    setAllPhotos((prev) => prev.filter((p) => p.id !== id))
    setStats((prev) => ({ ...prev, totalPhotos: Math.max(0, prev.totalPhotos - 1) }))
    await log({
      action: 'delete_photo', targetType: 'photo', targetId: id,
      targetName: photo?.places?.[0]?.name ?? null,
    })
    addNotification('Görsel silindi 🗑️', 'info')
    await refresh()
  }

  const bulkDeletePhotos = async () => {
    if (!selectedPhotoIds.length) return
    const ok = await confirm({
      title: `${selectedPhotoIds.length} görseli sil?`,
      description: 'Seçili görseller kalıcı olarak silinecek.',
      confirmLabel: 'Kalıcı Sil',
      variant: 'danger',
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      const { error } = await supabase.from('photos').delete().in('id', selectedPhotoIds)
      if (error) throw error
      setAllPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)))
      setStats((prev) => ({ ...prev, totalPhotos: Math.max(0, prev.totalPhotos - selectedPhotoIds.length) }))
      await log({
        action: 'bulk_delete_photos', targetType: 'photo',
        details: { count: selectedPhotoIds.length, ids: selectedPhotoIds },
      })
      addNotification(`${selectedPhotoIds.length} görsel silindi 🗑️`, 'info')
      setSelectedPhotoIds([])
      await refresh()
    } catch (err) { addNotification('Toplu silme hatası: ' + (err as Error).message, 'warning') }
    finally { setBulkLoading(false) }
  }

  /* ── Reports ── */
  const closeReport = async (reportId: string) => {
    const target = reports.find((r) => r.id === reportId)
    if (!target) return
    const { error } = await supabase.from('reports').update({ status: 'closed' }).eq('id', reportId)
    if (error) console.warn('Close report DB warning:', error.message)
    const closedItem: Report = { ...target, status: 'closed', closed_at: new Date().toISOString() }
    const updatedActive = reports.filter((r) => r.id !== reportId)
    const updatedClosed = [closedItem, ...closedReports.filter((r) => r.id !== reportId)]
    setReports(updatedActive)
    setClosedReports(updatedClosed)
    saveClosedReports(updatedClosed)
    setStats((prev) => ({
      ...prev,
      totalActiveReports: Math.max(0, prev.totalActiveReports - 1),
      totalClosedReports: prev.totalClosedReports + 1,
    }))
    await log({
      action: 'close_report', targetType: 'report', targetId: reportId,
      targetName: target.reason?.slice(0, 60) ?? null,
      details: { report_type: target.report_type },
    })
    addNotification('Rapor kapatıldı ve arşive eklendi 📁', 'info')
    router.refresh()
  }

  const bulkCloseReports = async () => {
    if (!selectedReportIds.length) return
    const ok = await confirm({
      title: `${selectedReportIds.length} raporu kapat?`,
      description: 'Seçili raporlar arşive taşınacak.',
      confirmLabel: 'Kapat & Arşivle',
      variant: 'default',
    })
    if (!ok) return
    setBulkLoading(true)
    try {
      const targets = reports.filter((r) => selectedReportIds.includes(r.id))
      const closingReports: Report[] = targets.map((r) => ({
        ...r, status: 'closed', closed_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('reports').update({ status: 'closed' }).in('id', selectedReportIds)
      if (error) console.warn('Report bulk close DB warning:', error.message)
      const updatedActive = reports.filter((r) => !selectedReportIds.includes(r.id))
      const updatedClosed = [...closingReports, ...closedReports]
      setReports(updatedActive)
      setClosedReports(updatedClosed)
      saveClosedReports(updatedClosed)
      setStats((prev) => ({
        ...prev,
        totalActiveReports: Math.max(0, prev.totalActiveReports - selectedReportIds.length),
        totalClosedReports: prev.totalClosedReports + selectedReportIds.length,
      }))
      await log({
        action: 'bulk_close_reports', targetType: 'report',
        details: { count: selectedReportIds.length, ids: selectedReportIds },
      })
      addNotification(`${selectedReportIds.length} rapor toplu kapatıldı 📁`, 'info')
      setSelectedReportIds([])
      router.refresh()
    } catch (err) { addNotification('Toplu kapatma hatası: ' + (err as Error).message, 'warning') }
    finally { setBulkLoading(false) }
  }

  const reopenReport = async (reportId: string) => {
    const target = closedReports.find((r) => r.id === reportId)
    if (!target) return
    const activeItem: Report = { ...target, status: 'open', reopened_at: new Date().toISOString() }
    const { error } = await supabase.from('reports').update({ status: 'open' }).eq('id', reportId)
    if (error) console.warn('Reopen report DB warning:', error.message)
    const updatedClosed = closedReports.filter((r) => r.id !== reportId)
    const updatedActive = [activeItem, ...reports.filter((r) => r.id !== reportId)]
    setClosedReports(updatedClosed)
    setReports(updatedActive)
    saveClosedReports(updatedClosed)
    setStats((prev) => ({
      ...prev,
      totalActiveReports: prev.totalActiveReports + 1,
      totalClosedReports: Math.max(0, prev.totalClosedReports - 1),
    }))
    await log({ action: 'reopen_report', targetType: 'report', targetId: reportId })
    addNotification('Rapor tekrar aktif duruma getirildi 🔄', 'success')
    router.refresh()
  }

  const deleteReportPermanently = async (reportId: string) => {
    const ok = await confirm({
      title: 'Raporu kalıcı olarak sil?',
      description: 'Bu işlem geri alınamaz.',
      confirmLabel: 'Kalıcı Sil',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('reports').delete().eq('id', reportId)
    if (error) console.warn('DB delete warning:', error.message)
    const updatedClosed = closedReports.filter((r) => r.id !== reportId)
    const updatedActive = reports.filter((r) => r.id !== reportId)
    setClosedReports(updatedClosed)
    setReports(updatedActive)
    saveClosedReports(updatedClosed)
    setStats((prev) => ({
      ...prev,
      totalClosedReports: updatedClosed.length,
      totalActiveReports: updatedActive.length,
    }))
    await log({ action: 'delete_report', targetType: 'report', targetId: reportId })
    addNotification('Rapor kalıcı olarak silindi 🗑️', 'info')
    router.refresh()
  }

  const exportReportsToCSV = async () => {
    const allReps = [...reports, ...closedReports]
    if (!allReps.length) return addNotification('Dışa aktarılacak rapor bulunamadı.', 'warning')
    const headers = ['ID', 'Tur', 'Neden', 'Durum', 'Tarih']
    const rows = allReps.map((r) => [
      `"${r.id || ''}"`, `"${r.report_type || ''}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${r.status === 'closed' ? 'Kapali' : 'Aktif'}"`,
      `"${r.created_at || ''}"`,
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `istanbul_raporlar_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    await log({ action: 'export_csv', targetType: 'system', details: { totalReports: allReps.length } })
    addNotification('Raporlar CSV olarak indirildi 📥', 'success')
  }

  /* ── Ownership ── */
  const approveOwnership = async (requestId: string) => {
    const request = ownershipRequests.find((r) => r.id === requestId)
    if (!request?.place_id || !request?.user_id) {
      return addNotification('Sahiplik talebinde mekan veya kullanıcı bilgisi eksik!', 'warning')
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({ owner_id: request.user_id, is_verified: true })
      .eq('id', request.place_id)

    if (updateError) {
      return addNotification('Mekan sahibi atanamadı: ' + updateError.message, 'warning')
    }

    const { error: reqErr } = await supabase
      .from('ownership_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    if (reqErr) {
      return addNotification('Talep onaylanamadı: ' + reqErr.message, 'warning')
    }

    setOwnershipRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    )
    setAllPlaces((prev) =>
      prev.map((p) => (p.id === request.place_id ? { ...p, owner_id: request.user_id } : p))
    )

    await log({
      action: 'approve_ownership',
      targetType: 'ownership',
      targetId: requestId,
      targetName: request.place_name ?? null,
      details: { place_id: request.place_id, user_id: request.user_id },
    })

    addNotification('Sahiplik talebi onaylandı ✅', 'success')
    await refresh()
  }

  const rejectOwnership = async (requestId: string) => {
    const request = ownershipRequests.find((r) => r.id === requestId)
    const { error } = await supabase
      .from('ownership_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (error) {
      return addNotification('Reddetme hatası: ' + error.message, 'warning')
    }

    setOwnershipRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r))
    )

    await log({
      action: 'reject_ownership',
      targetType: 'ownership',
      targetId: requestId,
      targetName: request?.place_name ?? null,
    })

    addNotification('Sahiplik talebi reddedildi ❌', 'warning')
    await refresh()
  }

  /* ── Users ── */
  const banUser = async (userId: string): Promise<boolean> => {
    const target = allProfiles.find((p) => p.id === userId)
    const reason = await prompt({
      title: 'Kullanıcıyı engelle',
      description: 'Bu kullanıcı giriş yapamayacak ve içerik üretemeyecek.',
      inputLabel: 'Engelleme sebebi',
      placeholder: 'örn. spam, küfür, sahte hesap...',
      required: true,
      confirmLabel: 'Engelle',
      variant: 'warning',
      multiline: true,
      maxLength: 300,
    })
    if (reason === null) return false
    const { error } = await supabase.from('profiles').update({ is_banned: true, ban_reason: reason }).eq('id', userId)
    if (error) { addNotification('Engelleme hatası: ' + error.message, 'warning'); return false }
    setAllProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, is_banned: true, ban_reason: reason } : p)))
    await log({
      action: 'ban_user', targetType: 'user', targetId: userId,
      targetName: target?.username, details: { reason },
    })
    addNotification('Kullanıcı engellendi ⛔', 'warning')
    router.refresh()
    return true
  }

  const unbanUser = async (userId: string) => {
    const target = allProfiles.find((p) => p.id === userId)
    const { error } = await supabase.from('profiles').update({ is_banned: false, ban_reason: null }).eq('id', userId)
    if (error) return addNotification('Engel kaldırma hatası: ' + error.message, 'warning')
    setAllProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, is_banned: false, ban_reason: null } : p)))
    await log({ action: 'unban_user', targetType: 'user', targetId: userId, targetName: target?.username })
    addNotification('Kullanıcının engeli kaldırıldı ✅', 'success')
    router.refresh()
  }

  const handleDeleteUser = async (userId: string) => {
    const target = allProfiles.find((p) => p.id === userId)
    const ok = await confirm({
      title: 'Kullanıcıyı sil?',
      description: `"${target?.username ?? 'Bu kullanıcı'}" profili kalıcı olarak silinecek.`,
      confirmLabel: 'Profili Sil',
      variant: 'danger',
    })
    if (!ok) return
    setDeletingUserId(userId)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
      setAllProfiles((prev) => prev.filter((p) => p.id !== userId))
      setStats((prev) => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }))
      await log({
        action: 'delete_user', targetType: 'user', targetId: userId, targetName: target?.username,
      })
      addNotification('Kullanıcı profili silindi 🗑️', 'info')
      router.refresh()
    } catch (err) { addNotification('Silme hatası: ' + (err as Error).message, 'warning') }
    finally { setDeletingUserId(null) }
  }

  /* ── Derived ── */
  const getCategoryName = (id?: number) => categories.find((c) => c.id === id)?.name || 'Kategori yok'
  const formatPrice = (p?: number | null) => (!p ? 'Belirtilmemiş' : '₺'.repeat(p))

  const filteredUsers = allProfiles.filter((p) =>
    (p.username?.toLowerCase() || '').includes(searchUsers.toLowerCase()) ||
    (p.id?.toLowerCase() || '').includes(searchUsers.toLowerCase())
  )

  const filteredReports = reports.filter((r) => {
    const q = searchReports.toLowerCase()
    const match = (r.reason?.toLowerCase() || '').includes(q) ||
      (r.report_type?.toLowerCase() || '').includes(q) ||
      (r.id?.toLowerCase() || '').includes(q)
    return match && (reportTypeFilter === 'all' || r.report_type === reportTypeFilter)
  })

  const filteredClosedReports = closedReports.filter((r) => {
    const q = searchClosedReports.toLowerCase()
    const match = (r.reason?.toLowerCase() || '').includes(q) ||
      (r.report_type?.toLowerCase() || '').includes(q) ||
      (r.id?.toLowerCase() || '').includes(q)
    return match && (closedReportTypeFilter === 'all' || r.report_type === closedReportTypeFilter)
  })

  const filteredPendingPlaces = pendingPlaces.filter((p) =>
    (p.name?.toLowerCase() || '').includes(searchPlaces.toLowerCase()) ||
    (p.district?.toLowerCase() || '').includes(searchPlaces.toLowerCase())
  )

  const filteredOwnershipRequests = ownershipRequests.filter((req) => {
    const q = searchOwnership.toLowerCase()
    return (req.place_name?.toLowerCase() || '').includes(q) ||
      (req.username?.toLowerCase() || '').includes(q) ||
      (req.status?.toLowerCase() || '').includes(q) ||
      (req.message?.toLowerCase() || '').includes(q)
  })

  const tabCount = (id: TabId): number => {
    const map: Record<TabId, number> = {
      mekanlar: stats.pendingCount,
      tum_mekanlar: stats.totalPlaces,
      medya: stats.totalPhotos,
      yorumlar: stats.totalReviews,
      kullanicilar: stats.totalUsers,
      sahiplik: ownershipRequests.filter((r) => r.status === 'pending').length,
      raporlar: reports.length,
      kapatilan_raporlar: closedReports.length,
      audit_log: auditLog.length,
    }
    return map[id] ?? 0
  }

  const visibleTabs = TABS.filter((t) => hasRole(currentAdmin.role, TAB_MIN_ROLE[t.id]))

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
        <p className="text-gray-400 font-medium">Yönetim verileri yükleniyor...</p>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="relative min-h-screen">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 270 : 88 }}
        className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed left-0 top-0 h-screen z-50 bg-slate-950/95 backdrop-blur-xl border-r border-white/10 p-3 transition-transform flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between p-3 border-b border-white/10 mb-2">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🏙️</span>
                <span className="text-base font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent whitespace-nowrap">
                  Admin Panel
                </span>
              </div>
            )}
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:inline-flex p-2 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer">
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <button type="button" onClick={() => setMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-2 cursor-pointer">✕</button>
          </div>

          <nav className="space-y-1.5 mt-3">
            {visibleTabs.map((tab, i) => {
              const isActive = activeTab === tab.id
              const count = tabCount(tab.id)
              const prev = visibleTabs[i - 1]
              const showDivider = tab.group === 'system' && prev?.group !== 'system'
              return (
                <Fragment key={tab.id}>
                  {showDivider && sidebarOpen && (
                    <div className="pt-3 pb-1">
                      <div className="border-t border-white/10 mb-2" />
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-3">
                        Sistem
                      </div>
                    </div>
                  )}
                  <button type="button"
                    onClick={() => { setActiveTab(tab.id); setMobileOpen(false) }}
                    className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400/15 text-amber-300 border-l-4 border-amber-400 shadow-lg shadow-amber-400/10'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-xl shrink-0">{tab.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{tab.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold ${tab.color}`}>
                          {count}
                        </span>
                      </>
                    )}
                  </button>
                </Fragment>
              )
            })}
          </nav>
        </div>

        {sidebarOpen && (
          <div className="p-3 border-t border-white/10 space-y-2">
            <button type="button" onClick={() => router.push('/')}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-white transition cursor-pointer">
              <span className="text-lg">🏠</span><span>Ana Sayfaya Dön</span>
            </button>
          </div>
        )}
      </motion.aside>

      {/* Main */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-[270px]' : 'lg:ml-[88px]'}`}>
        <div className="lg:hidden p-4 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
          <button type="button" onClick={() => setMobileOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-200 font-medium text-sm flex items-center gap-2 cursor-pointer">
            ☰ Menü
          </button>
          <span className="font-bold text-gray-200 text-sm">🛠️ Admin</span>
        </div>

        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Yönetim & Denetim Paneli
              </h1>
              <p className="text-sm text-gray-400 flex flex-wrap items-center gap-2">
                <span>🗓️ {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="text-gray-600">•</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Canlı Sistem
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 pr-3 md:pr-4 md:border-r md:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold text-sm">
                  {(currentAdmin.username?.[0] || 'A').toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-white leading-tight">
                    {currentAdmin.username || 'Yönetici'}
                  </div>
                  <RoleBadge role={currentAdmin.role} className="mt-0.5" />
                </div>
              </div>
              <button type="button" onClick={exportReportsToCSV}
                className="px-4 py-2 rounded-full bg-teal-500/15 border border-teal-500/40 text-xs sm:text-sm font-semibold text-teal-300 hover:bg-teal-500/25 transition flex items-center gap-1.5 cursor-pointer">
                📥 CSV İndir
              </button>
              <button type="button" onClick={() => void fetchData(false)}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-gray-200 hover:bg-white/15 hover:border-white/25 transition flex items-center gap-2 cursor-pointer">
                🔄 Yenile
              </button>
            </div>
          </header>

          {/* Chart */}
          <ActivityTrendChart
            data={dailySeries}
            onSelectCategory={(category) => {
              const tabMap: Record<typeof category, TabId> = {
                places: 'mekanlar',
                reviews: 'yorumlar',
                users: 'kullanicilar',
                reports: 'raporlar',
              }
              setActiveTab(tabMap[category])
            }}
          />

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <StatCard icon="📍" label="Toplam Mekan" value={stats.totalPlaces} accent="bg-indigo-500/20 text-indigo-300" />
            <StatCard icon="⏳" label="Bekleyen Onay" value={stats.pendingCount} accent="bg-amber-500/20 text-amber-300" />
            <StatCard icon="👥" label="Kullanıcı" value={stats.totalUsers} accent="bg-emerald-500/20 text-emerald-300" />
            <StatCard icon="⚠️" label="Aktif Rapor" value={reports.length} accent="bg-rose-500/20 text-rose-300" />
            <div className="col-span-2 lg:col-span-1">
              <StatCard icon="📁" label="Kapatılan Rapor" value={closedReports.length} accent="bg-teal-500/20 text-teal-300" />
            </div>
          </div>

          {/* Quick tabs (audit_log hariç) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {visibleTabs.filter((t) => t.id !== 'audit_log').map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`p-2.5 rounded-xl text-[11px] font-semibold transition border cursor-pointer truncate ${
                  activeTab === tab.id
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
                title={tab.label}
              >
                {tab.icon} {tab.label} ({tabCount(tab.id)})
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="glass-panel rounded-3xl p-5 md:p-8 border border-white/10 shadow-2xl">
            <AnimatePresence mode="wait">

              {/* ── PENDING PLACES ── */}
              {activeTab === 'mekanlar' && (
                <motion.div key="mekanlar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Bekleyen Mekan Onayları" subtitle="Kullanıcıların eklediği ve inceleme bekleyen mekanlar" badge={`${filteredPendingPlaces.length} adet`}
                    action={<input type="text" value={searchPlaces} onChange={(e) => setSearchPlaces(e.target.value)}
                      placeholder="Mekan adı veya ilçe ara..." className="input-field w-full sm:w-72" />} />

                  {filteredPendingPlaces.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input type="checkbox"
                          checked={selectedPendingIds.length === filteredPendingPlaces.length && filteredPendingPlaces.length > 0}
                          onChange={(e) => toggleAll(setSelectedPendingIds, filteredPendingPlaces.map((p) => p.id), e.target.checked)}
                          className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20" />
                        <span>Tümünü Seç ({filteredPendingPlaces.length})</span>
                      </label>
                    </div>
                  )}
                  <AnimatePresence>
                    {selectedPendingIds.length > 0 && (
                      <BulkBar count={selectedPendingIds.length}>
                        <button type="button" onClick={bulkApprovePending} disabled={bulkLoading}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500 hover:text-white transition disabled:opacity-50 cursor-pointer">
                          ✓ Onayla ({selectedPendingIds.length})
                        </button>
                        <button type="button" onClick={bulkRejectPending} disabled={bulkLoading}
                          className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500 hover:text-white transition disabled:opacity-50 cursor-pointer">
                          ✗ Reddet
                        </button>
                      </BulkBar>
                    )}
                  </AnimatePresence>

                  {filteredPendingPlaces.length > 0 ? (
                    <div className="space-y-3">
                      {filteredPendingPlaces.map((place) => (
                        <PlaceAccordion key={place.id} place={place}
                          expanded={expandedPlaceId === place.id}
                          onToggle={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                          categoryName={getCategoryName(place.category_id)}
                          priceLabel={formatPrice(place.price_range)}
                          checkbox={
                            <input type="checkbox" checked={selectedPendingIds.includes(place.id)}
                              onChange={(e) => toggleInArray(setSelectedPendingIds, place.id, e.target.checked)}
                              className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20 shrink-0" />
                          }
                          actions={
                            <>
                              <button type="button" onClick={() => approvePlace(place.id)}
                                className="px-6 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-sm font-semibold hover:bg-emerald-500/30 transition cursor-pointer">
                                ✓ Onayla & Yayına Al
                              </button>
                              <button type="button" onClick={() => rejectPlace(place.id)}
                                className="px-6 py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-sm font-semibold hover:bg-rose-500/30 transition cursor-pointer">
                                ✗ Reddet
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="🎉" title="Bekleyen Mekan Yok" description="Tüm mekan onayları incelendi ve güncel." />
                  )}
                </motion.div>
              )}

              {/* ── ALL PLACES ── */}
              {activeTab === 'tum_mekanlar' && (
                <motion.div key="tum_mekanlar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Tüm Mekanlar" subtitle="Sistemde kayıtlı olan tüm mekanların listesi" badge={`${allPlaces.length} adet`} />
                  {allPlaces.length > 0 ? (
                    <div className="space-y-3">
                      {allPlaces.map((place) => (
                        <PlaceAccordion key={place.id} place={place}
                          expanded={expandedPlaceId === place.id}
                          onToggle={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                          categoryName={getCategoryName(place.category_id)}
                          priceLabel={formatPrice(place.price_range)}
                          statusBadge={
                            <Badge variant={place.status === 'approved' ? 'success' : place.status === 'rejected' ? 'danger' : 'warning'}>
                              {place.status === 'approved' ? 'Onaylı' : place.status === 'rejected' ? 'Reddedilmiş' : 'Bekliyor'}
                            </Badge>
                          }
                          actions={
                            <button type="button" onClick={() => deletePlace(place.id)}
                              className="px-6 py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-sm font-semibold hover:bg-rose-500/30 transition cursor-pointer">
                              🗑️ Mekanı Sil
                            </button>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="📭" title="Kayıtlı Mekan Yok" description="Sistemde henüz hiç mekan bulunmuyor." />
                  )}
                </motion.div>
              )}

              {/* ── MEDIA ── */}
              {activeTab === 'medya' && (
                <motion.div key="medya" {...motionProps} className="space-y-4">
                  <SectionHeader title="Medya Denetimi" subtitle="Kullanıcılar tarafından yüklenen son mekan fotoğrafları" badge={`${allPhotos.length} adet`} />
                  <BulkBar count={selectedPhotoIds.length}>
                    <button type="button" onClick={bulkDeletePhotos} disabled={bulkLoading}
                      className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500 hover:text-white transition disabled:opacity-50 cursor-pointer">
                      🗑️ Seçilenleri Sil ({selectedPhotoIds.length})
                    </button>
                  </BulkBar>

                  {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                      {allPhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-square">
                          <img src={photo.url} alt={photo.caption || 'Mekan fotoğrafı'} loading="lazy"
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 group-hover:opacity-100 transition pointer-events-none" />
                          <div className="absolute top-2 left-2 z-10">
                            <input type="checkbox" checked={selectedPhotoIds.includes(photo.id)}
                              onChange={(e) => toggleInArray(setSelectedPhotoIds, photo.id, e.target.checked)}
                              className="w-5 h-5 rounded bg-black/60 border-white/20 text-pink-500 focus:ring-pink-500/50 cursor-pointer" />
                          </div>
                          <button type="button" onClick={() => deletePhoto(photo.id)}
                            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rose-500 hover:scale-110 cursor-pointer">
                            🗑️
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                            <div className="text-xs font-semibold text-white truncate">
                              {photo.places?.[0]?.name || 'Bilinmeyen Mekan'}
                            </div>
                            <div className="text-[10px] text-gray-300 truncate">
                              👤 @{photo.profiles?.[0]?.username || 'Anonim'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="📸" title="Hiç Fotoğraf Yok" description="Sistemde henüz yüklenmiş bir mekan fotoğrafı bulunmuyor." />
                  )}
                </motion.div>
              )}

              {/* ── REVIEWS ── */}
              {activeTab === 'yorumlar' && (
                <motion.div key="yorumlar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Yorum Yönetimi" subtitle="Kullanıcıların yaptığı en son yorumlar" badge={`${allReviews.length} yorum`} />
                  {allReviews.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input type="checkbox"
                          checked={selectedReviewIds.length === allReviews.length && allReviews.length > 0}
                          onChange={(e) => toggleAll(setSelectedReviewIds, allReviews.map((r) => r.id), e.target.checked)}
                          className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20" />
                        <span>Tümünü Seç ({allReviews.length})</span>
                      </label>
                    </div>
                  )}
                  <BulkBar count={selectedReviewIds.length}>
                    <button type="button" onClick={bulkDeleteReviews} disabled={bulkLoading}
                      className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500 hover:text-white transition disabled:opacity-50 cursor-pointer">
                      🗑️ Seçilenleri Sil ({selectedReviewIds.length})
                    </button>
                  </BulkBar>

                  {allReviews.length > 0 ? (
                    <div className="space-y-3">
                      {allReviews.map((review) => (
                        <div key={review.id}
                          className="border border-white/10 rounded-2xl p-4 bg-white/[0.03] hover:bg-white/[0.06] transition flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <input type="checkbox" checked={selectedReviewIds.includes(review.id)}
                              onChange={(e) => toggleInArray(setSelectedReviewIds, review.id, e.target.checked)}
                              className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20 mt-1 shrink-0" />
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="warning">⭐ {review.rating} Puan</Badge>
                                <span className="text-xs text-gray-400">📅 {new Date(review.created_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <p className="text-sm text-gray-200 font-medium leading-relaxed">{review.comment}</p>
                              <div className="text-[11px] font-mono text-gray-500 truncate">
                                User: {review.user_id?.slice(0, 10)}... • Place: {review.place_id?.slice(0, 10)}...
                              </div>
                            </div>
                          </div>
                          <button type="button" onClick={() => deleteReview(review.id)}
                            className="px-4 py-2 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/25 transition cursor-pointer shrink-0">
                            🗑️ Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="💬" title="Yorum Yok" description="Kayıtlı yorum bulunamadı." />
                  )}
                </motion.div>
              )}

              {/* ── USERS ── */}
              {activeTab === 'kullanicilar' && (
                <motion.div key="kullanicilar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Kullanıcı Yönetimi" subtitle="Kayıtlı profiller ve ceza durumları" badge={`${filteredUsers.length} kişi`}
                    action={<input type="text" value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)}
                      placeholder="Kullanıcı adı veya ID ara..." className="input-field w-full sm:w-72" />} />

                  {filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider">
                            <th className="p-4 font-semibold">Kullanıcı</th>
                            <th className="p-4 font-semibold">Yorum</th>
                            <th className="p-4 font-semibold">Kayıt</th>
                            <th className="p-4 font-semibold">Yetki</th>
                            <th className="p-4 font-semibold">Durum</th>
                            <th className="p-4 font-semibold text-right">Sil</th>
                            <th className="p-4 font-semibold text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.map((profile) => (
                            <tr key={profile.id} className="hover:bg-white/[0.03] transition">
                              <td className="p-4 font-medium text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-amber-400/15 text-amber-300 font-bold flex items-center justify-center text-xs">
                                    {(profile.username?.[0] || 'K').toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[140px]">{profile.username || 'Anonim'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-300">{profile.total_reviews || 0}</td>
                              <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(profile.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="p-4">
                                {profile.is_admin ? <Badge variant="success">Admin</Badge> : <span className="text-gray-500 text-xs">Üye</span>}
                              </td>
                              <td className="p-4">
                                {profile.is_banned ? <Badge variant="danger">Engelli</Badge> : <Badge variant="success">Aktif</Badge>}
                              </td>
                              <td className="p-4 text-right">
                                <button type="button" onClick={() => handleDeleteUser(profile.id)} disabled={deletingUserId === profile.id}
                                  className="px-3 py-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full text-xs font-semibold hover:bg-rose-500/25 transition disabled:opacity-50 cursor-pointer whitespace-nowrap">
                                  {deletingUserId === profile.id ? 'Siliniyor...' : '🗑️ Sil'}
                                </button>
                              </td>
                              <td className="p-4 text-right">
                                {profile.is_banned ? (
                                  <button type="button" onClick={() => unbanUser(profile.id)}
                                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition cursor-pointer whitespace-nowrap">
                                    Banı Kaldır
                                  </button>
                                ) : (
                                  <button type="button" onClick={() => banUser(profile.id)}
                                    className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition cursor-pointer whitespace-nowrap">
                                    Banla
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState icon="👥" title="Kullanıcı Yok" description="Kullanıcı bulunamadı." />
                  )}
                </motion.div>
              )}

              {/* ── OWNERSHIP ── */}
              {activeTab === 'sahiplik' && (
                <motion.div key="sahiplik" {...motionProps} className="space-y-4">
                  <SectionHeader title="Mekan Sahiplik Talepleri" subtitle="İşletme sahiplerinin mekan sahiplenme başvuruları"
                    action={<input type="text" value={searchOwnership} onChange={(e) => setSearchOwnership(e.target.value)}
                      placeholder="Mekan veya kullanıcı ara..." className="input-field w-full sm:w-72" />} />

                  {filteredOwnershipRequests.length > 0 ? (
                    <div className="space-y-3">
                      {filteredOwnershipRequests.map((request) => (
                        <div key={request.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.03]">
                          <div className="flex items-start justify-between flex-wrap gap-3">
                            <div>
                              <p className="font-bold text-lg text-white">🏢 {request.place_name || 'Bilinmeyen Mekan'}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Başvuran: <span className="text-amber-300 font-semibold">{request.username || 'Anonim'}</span>
                                <span className="mx-2">•</span>
                                {new Date(request.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <Badge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'}>
                              {request.status === 'pending' ? 'Bekliyor' : request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                            </Badge>
                          </div>
                          {request.message && (
                            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300 italic">
                              💬 "{request.message}"
                            </div>
                          )}
                          {request.status === 'pending' && (
                            <div className="flex gap-2 mt-4">
                              <button type="button" onClick={() => approveOwnership(request.id)}
                                className="px-5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition cursor-pointer">
                                ✓ Onayla
                              </button>
                              <button type="button" onClick={() => rejectOwnership(request.id)}
                                className="px-5 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition cursor-pointer">
                                ✗ Reddet
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="🏢" title="Sahiplik Talebi Yok" description="İncelenecek sahiplik talebi bulunmuyor." />
                  )}
                </motion.div>
              )}

              {/* ── ACTIVE REPORTS ── */}
              {activeTab === 'raporlar' && (
                <motion.div key="raporlar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Aktif Şikayet Raporları" subtitle="İnceleme ve müdahale bekleyen açık şikayetler" badge={`${filteredReports.length} aktif`}
                    action={<input type="text" value={searchReports} onChange={(e) => setSearchReports(e.target.value)}
                      placeholder="Rapor ID, sebep veya tip ara..." className="input-field w-full sm:w-72" />} />

                  <FilterPills accent="rose" value={reportTypeFilter} onChange={setReportTypeFilter}
                    options={[
                      { id: 'all', label: 'Tümü' },
                      { id: 'place', label: '📍 Mekan' },
                      { id: 'review', label: '💬 Yorum' },
                      { id: 'user', label: '👤 Kullanıcı' },
                    ]} />

                  {filteredReports.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input type="checkbox"
                          checked={selectedReportIds.length === filteredReports.length && filteredReports.length > 0}
                          onChange={(e) => toggleAll(setSelectedReportIds, filteredReports.map((r) => r.id), e.target.checked)}
                          className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20" />
                        <span>Tümünü Seç ({filteredReports.length})</span>
                      </label>
                    </div>
                  )}
                  <BulkBar count={selectedReportIds.length}>
                    <button type="button" onClick={bulkCloseReports} disabled={bulkLoading}
                      className="px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-500 hover:text-white transition disabled:opacity-50 cursor-pointer">
                      📁 Kapat ({selectedReportIds.length})
                    </button>
                  </BulkBar>

                  {filteredReports.length > 0 ? (
                    <div className="space-y-3">
                      {filteredReports.map((report) => {
                        const reportedUser = allProfiles.find((p) => p.id === report.reported_user_id)
                        return (
                          <div key={report.id}
                            className="border border-rose-500/20 rounded-2xl p-5 bg-gradient-to-br from-rose-950/20 to-slate-900/60 shadow-lg">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input type="checkbox" checked={selectedReportIds.includes(report.id)}
                                  onChange={(e) => toggleInArray(setSelectedReportIds, report.id, e.target.checked)}
                                  className="rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-slate-900 border-white/20 shrink-0" />
                                <Badge variant="danger">
                                  {report.report_type === 'place' ? '📍 Mekan' : report.report_type === 'review' ? '💬 Yorum' : '👤 Kullanıcı'}
                                </Badge>
                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">ID: {report.id?.slice(0, 8)}</span>
                                <span className="text-xs text-gray-400">🕒 {new Date(report.created_at || Date.now()).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {report.report_type === 'user' && report.reported_user_id && (
                                  <button type="button"
                                    onClick={async () => {
                                      const banned = await banUser(report.reported_user_id!)
                                      if (banned) await closeReport(report.id)
                                    }}
                                    className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition cursor-pointer">
                                    ⛔ Banla & Kapat
                                  </button>
                                )}
                                <button type="button" onClick={() => closeReport(report.id)}
                                  className="px-4 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition cursor-pointer">
                                  📁 Kapat & Arşivle
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 p-3.5 bg-white/5 rounded-xl border border-white/5">
                              <div className="text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Şikayet Nedeni</div>
                              <p className="text-sm text-gray-200 font-medium">"{report.reason}"</p>
                            </div>
                            <div className="text-xs text-gray-400 mt-3 flex flex-wrap gap-4">
                              {report.report_type === 'place' && report.place_id && (
                                <span>Mekan ID: <strong className="text-gray-300 font-mono">{report.place_id}</strong></span>
                              )}
                              {report.report_type === 'review' && report.review_id && (
                                <span>Yorum ID: <strong className="text-gray-300 font-mono">{report.review_id}</strong></span>
                              )}
                              {report.report_type === 'user' && report.reported_user_id && (
                                <span>Hedef: <strong className="text-amber-300">{reportedUser?.username || 'Bilinmeyen'}</strong></span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState icon="✅" title="Aktif Şikayet Yok" description="İncelenmesi gereken açık rapor bulunmuyor." />
                  )}
                </motion.div>
              )}

              {/* ── CLOSED REPORTS ── */}
              {activeTab === 'kapatilan_raporlar' && (
                <motion.div key="kapatilan_raporlar" {...motionProps} className="space-y-4">
                  <SectionHeader title="Kapatılan & Arşivlenen Raporlar" subtitle="Daha önce incelenip çözümlenen rapor geçmişi" badge={`${filteredClosedReports.length} arşiv`}
                    action={<input type="text" value={searchClosedReports} onChange={(e) => setSearchClosedReports(e.target.value)}
                      placeholder="Kapatılan raporlarda ara..." className="input-field w-full sm:w-72" />} />

                  <FilterPills accent="teal" value={closedReportTypeFilter} onChange={setClosedReportTypeFilter}
                    options={[
                      { id: 'all', label: 'Tümü' },
                      { id: 'place', label: '📍 Mekan' },
                      { id: 'review', label: '💬 Yorum' },
                      { id: 'user', label: '👤 Kullanıcı' },
                    ]} />

                  {filteredClosedReports.length > 0 ? (
                    <div className="space-y-3">
                      {filteredClosedReports.map((report) => {
                        const reportedUser = allProfiles.find((p) => p.id === report.reported_user_id)
                        return (
                          <div key={report.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="info">
                                  {report.report_type === 'place' ? '📍 Mekan' : report.report_type === 'review' ? '💬 Yorum' : '👤 Kullanıcı'}
                                </Badge>
                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">ID: {report.id?.slice(0, 8)}</span>
                                <Badge variant="success">✓ Kapatıldı</Badge>
                                {report.closed_at && (
                                  <span className="text-xs text-gray-400">• {new Date(report.closed_at).toLocaleDateString('tr-TR')}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button type="button" onClick={() => reopenReport(report.id)}
                                  className="px-3.5 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold hover:bg-amber-500/25 transition cursor-pointer">
                                  🔄 Geri Aç
                                </button>
                                <button type="button" onClick={() => deleteReportPermanently(report.id)}
                                  className="px-3.5 py-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full text-xs font-semibold hover:bg-rose-500/25 transition cursor-pointer">
                                  🗑️ Sil
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 p-3.5 bg-black/20 rounded-xl border border-white/5">
                              <div className="text-[11px] text-gray-400 mb-1 uppercase tracking-wide">Şikayet Nedeni</div>
                              <p className="text-sm text-gray-300">"{report.reason}"</p>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-3 flex flex-wrap gap-4 font-mono">
                              {report.report_type === 'place' && report.place_id && <span>Mekan ID: {report.place_id}</span>}
                              {report.report_type === 'review' && report.review_id && <span>Yorum ID: {report.review_id}</span>}
                              {report.report_type === 'user' && report.reported_user_id && (
                                <span>Kullanıcı: {reportedUser?.username || 'Bilinmeyen'} ({report.reported_user_id})</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState icon="📁" title="Kapatılan Rapor Yok" description="Henüz kapatılmış veya arşivlenmiş bir şikayet bulunmuyor." />
                  )}
                </motion.div>
              )}

              {/* ── AUDIT LOG ── */}
              {activeTab === 'audit_log' && (
                <motion.div key="audit_log" {...motionProps}>
                  <AuditLogTab
                    entries={auditLog}
                    loading={auditLoading}
                    onRefresh={() => { setAuditLoaded(false); void fetchAuditLog() }}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}