'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  Compass,
  Car,
  Footprints,
  TrainFront,
  MapPin,
  Zap,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Navigation,
  FolderOpen,
  ArrowRight,
  Loader2,
  Flag,
  TriangleAlert,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Tipler                                                              */
/* ------------------------------------------------------------------ */

interface Place {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
  average_rating: number
  category_id?: number | null
  category_name?: string
  category_icon?: string | null
  distanceFromUser?: number
  district?: string
}

interface CategoryItem {
  id: number
  name: string
  slug?: string
  icon?: string | null
}

interface RouteStop {
  id: string
  place: Place
  order: number
  note?: string
}

type TravelMode = 'driving' | 'walking' | 'transit'
type LatLng = [number, number]

interface RouteLeg {
  distanceKm: number
  durationMin: number
  startIdx: number // path içindeki başlangıç indeksi
  endIdx: number // path içindeki bitiş indeksi
}

interface RouteResult {
  path: LatLng[]
  legs: RouteLeg[]
  distanceKm: number
  durationMin: number
  approximate: boolean // true: yol verisi alınamadı, kuş uçuşu çizildi
  mode: TravelMode
}

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

const ISTANBUL_DISTRICTS = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu',
]

const inputClass =
  'w-full rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all'

// Rota servisleri. Kendi OSRM sunucunuz varsa .env ile değiştirin:
// NEXT_PUBLIC_ROUTING_CAR_URL=https://osrm.siteniz.com
// NEXT_PUBLIC_ROUTING_FOOT_URL=https://osrm-foot.siteniz.com
// Not: herkese açık demo sunucuların kullanım limiti vardır; yoğun trafikte kendi sunucunuzu kullanın.
const ROUTING_BASE: Record<TravelMode, string> = {
  driving: process.env.NEXT_PUBLIC_ROUTING_CAR_URL ?? 'https://routing.openstreetmap.de/routed-car',
  walking: process.env.NEXT_PUBLIC_ROUTING_FOOT_URL ?? 'https://routing.openstreetmap.de/routed-foot',
  // OSRM toplu taşıma desteklemez: araç geometrisi + tahmini süre kullanılır
  transit: process.env.NEXT_PUBLIC_ROUTING_CAR_URL ?? 'https://routing.openstreetmap.de/routed-car',
}

const MODE_META: Record<TravelMode, { label: string; emoji: string }> = {
  driving: { label: 'Araç', emoji: '🚗' },
  walking: { label: 'Yürüyüş', emoji: '🚶' },
  transit: { label: 'Toplu T.', emoji: '🚆' },
}

const ROUTE_THEME = {
  main: '#1A73E8',
  casing: '#0B3D91',
  approx: '#64748b',
}

const ROUTE_CSS = `
@keyframes route-flow-anim { to { stroke-dashoffset: -32; } }
.route-flow { animation: route-flow-anim 1.4s linear infinite; }
@keyframes user-ping-anim { 75%, 100% { transform: scale(2.4); opacity: 0; } }
.user-ping-ring { animation: user-ping-anim 1.6s cubic-bezier(0, 0, 0.2, 1) infinite; }
.route-leg-label { background: transparent !important; border: none !important; pointer-events: none; }
.route-leg-label > div {
  display: inline-block;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  padding: 3px 8px;
  border-radius: 9999px;
  background: rgba(7, 11, 20, 0.92);
  color: #e2e8f0;
  border: 1px solid rgba(26, 115, 232, 0.65);
  font: 700 11px/1.2 system-ui, sans-serif;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.route-leg-label.is-approx > div { border-color: rgba(148, 163, 184, 0.7); color: #cbd5e1; }
.route-arrow { background: transparent !important; border: none !important; pointer-events: none; }
.route-tooltip {
  background: #070b14; color: #f1f5f9; border: 1px solid #1e293b;
  border-radius: 8px; font: 600 12px system-ui, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,.4);
}
.route-tooltip::before { display: none; }
@media (prefers-reduced-motion: reduce) {
  .route-flow, .user-ping-ring { animation: none; }
}
`

/* ------------------------------------------------------------------ */
/* Yardımcı fonksiyonlar                                               */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[c]
  })
}

function extractDistrict(address?: string): string {
  if (!address) return 'Diğer'
  const lower = address.toLocaleLowerCase('tr-TR')
  for (const d of ISTANBUL_DISTRICTS) {
    if (lower.includes(d.toLocaleLowerCase('tr-TR'))) {
      return d
    }
  }
  return 'Diğer'
}

// Haversine mesafe (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function haversineKm(a: LatLng, b: LatLng): number {
  return calculateDistance(a[0], a[1], b[0], b[1])
}

function getBearingDeg([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function pathLengthKm(path: LatLng[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i])
  return total
}

// Yol boyunca her `spacingKm` mesafede (ilk nokta spacing/2'de) konum + yön üretir.
function pointsAlongPath(path: LatLng[], spacingKm: number) {
  const out: { pos: LatLng; bearing: number; at: number }[] = []
  if (path.length < 2 || spacingKm <= 0) return out

  let next = spacingKm / 2
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const segLen = haversineKm(path[i - 1], path[i])
    if (segLen === 0) continue
    while (acc + segLen >= next) {
      const t = (next - acc) / segLen
      out.push({
        pos: [
          path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t,
          path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t,
        ],
        bearing: getBearingDeg(path[i - 1], path[i]),
        at: next,
      })
      next += spacingKm
    }
    acc += segLen
  }
  return out
}

// Rota geometrisi üzerinde her durağa en yakın indeksi (ileri yönlü) bulur.
function snapIndices(path: LatLng[], points: LatLng[]): number[] {
  const idx: number[] = []
  let from = 0
  points.forEach((p, k) => {
    if (k === 0) {
      idx.push(0)
      return
    }
    if (k === points.length - 1) {
      idx.push(path.length - 1)
      return
    }
    let best = from
    let bestDist = Infinity
    for (let i = from; i < path.length; i++) {
      const d = (path[i][0] - p[0]) ** 2 + (path[i][1] - p[1]) ** 2
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    idx.push(best)
    from = best
  })
  return idx
}

function estimateDurationMinutes(distanceKm: number, mode: TravelMode, osrmDurationSec?: number): number {
  if (mode !== 'transit' && typeof osrmDurationSec === 'number') {
    return Math.max(1, Math.round(osrmDurationSec / 60))
  }
  if (mode === 'walking') return Math.max(1, Math.round((distanceKm / 4.8) * 60))
  if (mode === 'driving') return Math.max(1, Math.round((distanceKm / 30) * 60))
  return Math.max(2, Math.round((distanceKm / 20) * 60 + 6))
}

function formatDuration(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)} sa ${min % 60} dk`
  return `${min} dk`
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function buildFallbackRoute(points: LatLng[], mode: TravelMode): RouteResult {
  const legs: RouteLeg[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const km = haversineKm(points[i], points[i + 1])
    legs.push({
      distanceKm: km,
      durationMin: estimateDurationMinutes(km, mode),
      startIdx: i,
      endIdx: i + 1,
    })
  }
  return {
    path: points,
    legs,
    distanceKm: legs.reduce((s, l) => s + l.distanceKm, 0),
    durationMin: legs.reduce((s, l) => s + l.durationMin, 0),
    approximate: true,
    mode,
  }
}

/* ------------------------------------------------------------------ */
/* Sayfa                                                               */
/* ------------------------------------------------------------------ */

export default function RoutePlannerPage() {
  const supabase = useMemo(() => createClient(), [])

  // Stateler
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [categoryRawPlaces, setCategoryRawPlaces] = useState<Place[]>([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [selectedStops, setSelectedStops] = useState<RouteStop[]>([])
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [startFromUser, setStartFromUser] = useState(false)
  const [isRoutingLoading, setIsRoutingLoading] = useState(false)
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)

  // Leaflet refleri
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const leafletLibRef = useRef<any>(null)
  const routeRendererRef = useRef<any>(null)
  const routeCacheRef = useRef<Map<string, RouteResult>>(new Map())
  const sidebarOpenRef = useRef(isSidebarOpen)

  useEffect(() => {
    sidebarOpenRef.current = isSidebarOpen
  }, [isSidebarOpen])

  // Mobil ekran tespiti
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [])

  // Sidebar açılıp kapandığında harita boyutunu yenile
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize?.()
    }, 320)
    return () => clearTimeout(timer)
  }, [isSidebarOpen, leafletLoaded])

  // Kullanıcı Konumu
  const handleGetUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum servisini desteklemiyor.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(coords)
        setIsLocating(false)

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 14, { animate: true })
        }
      },
      (err) => {
        console.warn('Konum alınamadı:', err.message)
        setIsLocating(false)
        alert('Konumunuza erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // İlk açılışta sessiz konum kontrolü
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000 }
      )
    }
  }, [])

  // Konum yoksa "konumdan başla" kapanır
  useEffect(() => {
    if (!userLocation) setStartFromUser(false)
  }, [userLocation])

  // Durak Ekle
  const handleAddStop = useCallback((place: Place) => {
    setSelectedStops((prev) => {
      if (prev.some((s) => s.place.id === place.id)) return prev
      const newStop: RouteStop = {
        id: `${place.id}-${Date.now()}`,
        place,
        order: prev.length + 1,
      }
      return [...prev, newStop]
    })
  }, [])

  // Kategorileri Yükle
  useEffect(() => {
    let isCancelled = false

    async function fetchCategories() {
      try {
        setLoadingCategories(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, icon')
          .order('id')

        if (error) {
          console.error('Kategoriler çekilemedi:', error.message)
          return
        }

        if (!isCancelled && data) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Kategori yükleme hatası:', err)
      } finally {
        if (!isCancelled) setLoadingCategories(false)
      }
    }

    fetchCategories()
    return () => {
      isCancelled = true
    }
  }, [supabase])

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => Number(c.id) === Number(selectedCategoryId)) ?? null,
    [categories, selectedCategoryId]
  )

  // Seçili Kategoriye Göre Her İlçeden En Yüksek Yıldızlı Mekanları Çek
  useEffect(() => {
    let isCancelled = false

    async function fetchPlacesByCategory() {
      if (!selectedCategoryId) {
        setCategoryRawPlaces([])
        setLoadingPlaces(false)
        return
      }

      try {
        setLoadingPlaces(true)
        const { data, error } = await supabase
          .from('places')
          .select('id, name, address, latitude, longitude, average_rating, category_id')
          .eq('status', 'approved')
          .eq('category_id', selectedCategoryId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('average_rating', { ascending: false })
          .limit(5000)

        if (error) {
          console.error('Kategori mekanları çekilemedi:', error.message)
          if (!isCancelled) setCategoryRawPlaces([])
          return
        }

        const mapped: Place[] = (data ?? [])
          .filter((item: any) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
          .map((item: any) => ({
            id: String(item.id),
            name: item.name,
            address: item.address || '',
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            average_rating: Number(item.average_rating ?? 0),
            category_id: Number(item.category_id),
            category_name: selectedCategoryObj?.name,
            category_icon: selectedCategoryObj?.icon ?? null,
            district: extractDistrict(item.address),
          }))

        const byDistrict = new Map<string, Place[]>()
        for (const place of mapped) {
          const dist = place.district || 'Diğer'
          const bucket = byDistrict.get(dist) ?? []
          bucket.push(place)
          byDistrict.set(dist, bucket)
        }

        const districtBuckets = Array.from(byDistrict.values()).map((bucket) =>
          bucket.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
        )

        const interleavedTopByDistrict: Place[] = []
        let maxLen = 0
        for (const bucket of districtBuckets) {
          if (bucket.length > maxLen) maxLen = bucket.length
        }

        for (let rank = 0; rank < maxLen; rank++) {
          const roundItems: Place[] = []
          for (const bucket of districtBuckets) {
            if (rank < bucket.length) {
              roundItems.push(bucket[rank])
            }
          }
          roundItems.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
          interleavedTopByDistrict.push(...roundItems)
        }

        if (!isCancelled) {
          setCategoryRawPlaces(interleavedTopByDistrict)
        }
      } catch (err) {
        console.error('Mekan sorgu hatası:', err)
        if (!isCancelled) setCategoryRawPlaces([])
      } finally {
        if (!isCancelled) setLoadingPlaces(false)
      }
    }

    fetchPlacesByCategory()
    return () => {
      isCancelled = true
    }
  }, [supabase, selectedCategoryId, selectedCategoryObj?.name, selectedCategoryObj?.icon])

  // Mesafe ve arama filtresi uygulanmış kategori mekanları
  const categoryPlaces = useMemo(() => {
    if (!selectedCategoryId) return []

    const q = searchQuery.trim().toLowerCase()
    const withDist = categoryRawPlaces.map((place) => ({
      ...place,
      distanceFromUser: userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, place.latitude, place.longitude)
        : undefined,
    }))

    if (!q) return withDist

    return withDist.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q))
    )
  }, [categoryRawPlaces, selectedCategoryId, searchQuery, userLocation])

  // Rota noktaları: (opsiyonel) kullanıcı konumu + duraklar
  const routePoints = useMemo<LatLng[]>(() => {
    const pts: LatLng[] = []
    if (startFromUser && userLocation) pts.push([userLocation.lat, userLocation.lng])
    selectedStops.forEach((s) => pts.push([s.place.latitude, s.place.longitude]))
    return pts
  }, [selectedStops, startFromUser, userLocation])

  // Sıra değişimi cluster'ı etkilemesin diye sıralanmış id anahtarı
  const selectedKey = useMemo(
    () => selectedStops.map((s) => s.place.id).sort().join(','),
    [selectedStops]
  )

  // En yakın komşu algoritması ile durak sıralama
  const handleSortByProximity = useCallback(() => {
    if (selectedStops.length <= 1) return

    const startPoint =
      startFromUser && userLocation
        ? userLocation
        : { lat: selectedStops[0].place.latitude, lng: selectedStops[0].place.longitude }

    const remaining = [...selectedStops]
    const sorted: RouteStop[] = []
    let currentPoint = startPoint

    while (remaining.length > 0) {
      let nearestIdx = 0
      let minDistance = Infinity

      for (let i = 0; i < remaining.length; i++) {
        const p = remaining[i].place
        const dist = calculateDistance(currentPoint.lat, currentPoint.lng, p.latitude, p.longitude)
        if (dist < minDistance) {
          minDistance = dist
          nearestIdx = i
        }
      }

      const nextStop = remaining.splice(nearestIdx, 1)[0]
      sorted.push(nextStop)
      currentPoint = { lat: nextStop.place.latitude, lng: nextStop.place.longitude }
    }

    setSelectedStops(sorted.map((item, idx) => ({ ...item, order: idx + 1 })))
  }, [selectedStops, userLocation, startFromUser])

  /* ---------------------------------------------------------------- */
  /* Leaflet başlatma                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let isMounted = true

    async function initMap() {
      if (typeof window === 'undefined') return
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')

      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return
      leafletLibRef.current = L

      const map = (L.map as any)(mapContainerRef.current, {
        center: [41.0082, 28.9784],
        zoom: 12,
        zoomControl: false,
        preferCanvas: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        tap: false,
        dragging: true,
        bounceAtZoomLimits: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenZooming: false,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Rota için ayrı katman (pane) + SVG renderer:
      // canvas yerine SVG kullanıldığı için çizgi animasyonu (CSS) ve tooltip çalışır,
      // pane sayesinde rota her zaman pinlerin altında, karoların üstünde kalır.
      map.createPane('routePane')
      map.getPane('routePane').style.zIndex = '450'
      routeRendererRef.current = L.svg({ pane: 'routePane', padding: 0.5 })

      setTimeout(() => {
        map.invalidateSize?.()
      }, 150)

      mapInstanceRef.current = map
      setLeafletLoaded(true)
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /* Kullanıcı konumu pini                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !userLocation) return

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }

    const userIcon = L.divIcon({
      className: 'custom-user-location-pin',
      html: `
        <div style="position: relative; width: 22px; height: 22px;">
          <div class="user-ping-ring" style="
            position: absolute;
            width: 22px;
            height: 22px;
            background: rgba(59, 130, 246, 0.35);
            border-radius: 50%;
          "></div>
          <div style="
            position: relative;
            width: 14px;
            height: 14px;
            top: 4px;
            left: 4px;
            background: #2563eb;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(37,99,235,0.7);
          "></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })

    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      zIndexOffset: 2000,
    }).addTo(map)

    marker.bindPopup(`
      <div style="font-family: sans-serif; color: #0f172a; padding: 4px; text-align: center;">
        <h4 style="margin:2px 0 0 0; font-size:13px; font-weight:800; color:#2563eb;">ŞU ANKİ KONUMUNUZ</h4>
      </div>
    `)

    userMarkerRef.current = marker
  }, [userLocation, leafletLoaded])

  /* ---------------------------------------------------------------- */
  /* Kategori mekanları (cluster)                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !leafletLoaded) return
    if (!selectedCategoryId || categoryPlaces.length === 0) return

    const selectedPlaceIds = new Set(selectedKey ? selectedKey.split(',') : [])

    const markersCluster = L.markerClusterGroup({
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
      animate: true,
      animateAddingMarkers: false,
      maxClusterRadius: 45,
      disableClusteringAtZoom: 16,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount()
        let cClass = 'cluster-small'
        let size = 36
        if (count > 25) {
          cClass = 'cluster-medium'
          size = 42
        }
        if (count > 100) {
          cClass = 'cluster-large'
          size = 48
        }

        return L.divIcon({
          html: `<div class="cluster-inner ${cClass}"><span>${count}</span></div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(size, size),
        })
      },
    })

    const unselectedMarkersList: any[] = []

    categoryPlaces.forEach((place) => {
      if (selectedPlaceIds.has(place.id)) return

      const smallIcon = L.divIcon({
        className: 'custom-unselected-pin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: #09090b;
            border: 2.5px solid #ef4444;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.55), 0 0 8px rgba(239, 68, 68, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
          ">📍</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([place.latitude, place.longitude], { icon: smallIcon })

      const distText =
        typeof place.distanceFromUser === 'number'
          ? `<span style="color:#d97706; font-weight:600;"> • ${place.distanceFromUser.toFixed(1)} km</span>`
          : ''

      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #0f172a; padding: 4px; min-width: 175px;">
          <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700;">${escapeHtml(place.name)}</h4>
          <p style="margin:0 0 8px 0; font-size:12px; color:#64748b;">${escapeHtml(place.address || '')}${distText} • ★ ${Number(place.average_rating).toFixed(1)}</p>
          <button data-place-id="${escapeHtml(place.id)}" class="js-add-stop-btn" style="
            background: #f59e0b;
            color: #090d16;
            border: none;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
          ">+ Rotaya Ekle</button>
        </div>
      `)

      marker.on('popupopen', (e: any) => {
        const popupEl = e.popup?.getElement()
        const btn = popupEl?.querySelector('.js-add-stop-btn') as HTMLButtonElement | null
        if (btn) {
          btn.onclick = () => {
            handleAddStop(place)
            map.closePopup()
          }
        }
      })

      unselectedMarkersList.push(marker)
    })

    if (unselectedMarkersList.length > 0) {
      markersCluster.addLayers(unselectedMarkersList)
      map.addLayer(markersCluster)

      if (!selectedKey) {
        const bounds = markersCluster.getBounds()
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 })
        }
      }
    }

    return () => {
      try {
        map.removeLayer(markersCluster)
      } catch {
        /* harita zaten kaldırılmış olabilir */
      }
    }
  }, [categoryPlaces, selectedCategoryId, selectedKey, leafletLoaded, handleAddStop])

  /* ---------------------------------------------------------------- */
  /* Durak pinleri                                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !leafletLoaded) return

    const layer = L.layerGroup()

    selectedStops.forEach((stop, idx) => {
      const active = activeStopIndex === idx
      const stopIcon = L.divIcon({
        className: 'custom-route-pin',
        html: `
          <div style="
            position: relative;
            background: ${active ? 'linear-gradient(135deg, #ffffff, #fde68a)' : 'linear-gradient(135deg, #fbbf24, #d97706)'};
            color: #090d16;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg) scale(${active ? 1.18 : 1});
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(245, 158, 11, ${active ? 0.8 : 0.45});
            border: 2px solid ${active ? '#f59e0b' : '#ffffff'};
            cursor: pointer;
          ">
            <span style="transform: rotate(45deg); font-weight: 800; font-size: 13px;">${idx + 1}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28],
      })

      const marker = L.marker([stop.place.latitude, stop.place.longitude], {
        icon: stopIcon,
        zIndexOffset: 1000 + idx,
        title: stop.place.name,
      })

      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
          <div style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase;">DURAK #${idx + 1}</div>
          <h4 style="margin:2px 0 4px 0; font-size:14px; font-weight:700;">${escapeHtml(stop.place.name)}</h4>
          <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">${escapeHtml(stop.place.address || '')}</p>
        </div>
      `)

      marker.on('click', () => setActiveStopIndex(idx))
      marker.addTo(layer)
    })

    layer.addTo(map)

    return () => {
      try {
        map.removeLayer(layer)
      } catch {
        /* noop */
      }
    }
  }, [selectedStops, activeStopIndex, leafletLoaded])

  // Tek durak eklenince o noktaya odaklan
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !leafletLoaded || selectedStops.length !== 1) return
    const p = selectedStops[0].place
    map.setView([p.latitude, p.longitude], Math.max(map.getZoom(), 14), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStops.length, leafletLoaded])

  /* ---------------------------------------------------------------- */
  /* Rota verisi (OSRM) — debounce + iptal + önbellek + zaman aşımı    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (routePoints.length < 2) {
      setRouteResult(null)
      setIsRoutingLoading(false)
      return
    }

    const key = `${travelMode}|${routePoints.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(';')}`
    const cached = routeCacheRef.current.get(key)
    if (cached) {
      setRouteResult(cached)
      setIsRoutingLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    setIsRoutingLoading(true)

    const debounceId = setTimeout(async () => {
      timeoutId = setTimeout(() => controller.abort(), 9000)
      try {
        const coordsQuery = routePoints.map(([lat, lng]) => `${lng},${lat}`).join(';')
        const url = `${ROUTING_BASE[travelMode]}/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson&steps=false`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const route = data?.routes?.[0]
        if (data?.code !== 'Ok' || !route) throw new Error('Rota bulunamadı')

        const path: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])

        // Durakların yol üzerindeki (snap edilmiş) konumları → bacak (leg) sınırları
        const snapped: LatLng[] =
          Array.isArray(data.waypoints) && data.waypoints.length === routePoints.length
            ? data.waypoints.map((w: any) => [w.location[1], w.location[0]] as LatLng)
            : routePoints
        const idx = snapIndices(path, snapped)

        const legs: RouteLeg[] = (route.legs ?? []).map((leg: any, i: number) => {
          const km = leg.distance / 1000
          return {
            distanceKm: km,
            durationMin: estimateDurationMinutes(km, travelMode, leg.duration),
            startIdx: idx[i],
            endIdx: idx[i + 1],
          }
        })

        const result: RouteResult = {
          path,
          legs,
          distanceKm: route.distance / 1000,
          durationMin: legs.reduce((s, l) => s + l.durationMin, 0),
          approximate: false,
          mode: travelMode,
        }

        if (cancelled) return
        routeCacheRef.current.set(key, result)
        setRouteResult(result)
      } catch (err) {
        if (cancelled) return
        console.warn('Rota servisine ulaşılamadı, kuş uçuşu gösteriliyor:', err)
        setRouteResult(buildFallbackRoute(routePoints, travelMode))
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        if (!cancelled) setIsRoutingLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(debounceId)
      if (timeoutId) clearTimeout(timeoutId)
      controller.abort()
    }
  }, [routePoints, travelMode])

  /* ---------------------------------------------------------------- */
  /* Rota çizimi                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !leafletLoaded || !routeResult || routeResult.path.length < 2) return

    const { path, legs, mode, approximate } = routeResult
    const renderer = routeRendererRef.current
    const common = {
      pane: 'routePane',
      renderer,
      lineCap: 'round',
      lineJoin: 'round',
    }
    const layers: any[] = []
    const baseWeight = mode === 'driving' ? 6 : 5
    const mainColor = approximate ? ROUTE_THEME.approx : ROUTE_THEME.main

    // 1) Dış gölge (casing) — yürüyüşte noktalı çizgiyle çakışmasın diye yok
    if (mode !== 'walking') {
      layers.push(
        L.polyline(path, {
          ...common,
          color: approximate ? '#334155' : ROUTE_THEME.casing,
          weight: baseWeight + 5,
          opacity: 0.35,
          interactive: false,
        })
      )
    }

    // 2) Ana çizgi
    layers.push(
      L.polyline(path, {
        ...common,
        color: mainColor,
        weight: mode === 'walking' ? 7 : baseWeight,
        opacity: 0.96,
        dashArray:
          mode === 'walking' ? '1 13' : mode === 'transit' || approximate ? '14 10' : undefined,
        interactive: false,
      })
    )

    // 3) Akan yön animasyonu (sadece gerçek araç rotasında)
    if (mode === 'driving' && !approximate) {
      layers.push(
        L.polyline(path, {
          ...common,
          color: '#ffffff',
          weight: 2,
          opacity: 0.85,
          dashArray: '2 14',
          className: 'route-flow',
          interactive: false,
        })
      )
    }

    // 4) Her bacak için: tooltip alanı, süre/mesafe etiketi, yön okları
    legs.forEach((leg, i) => {
      const seg = path.slice(leg.startIdx, leg.endIdx + 1)
      if (seg.length < 2) return

      const summary = `${i + 1}. etap · ${formatDistance(leg.distanceKm)} · ${formatDuration(leg.durationMin)}`
      const hit = L.polyline(seg, {
        ...common,
        color: '#000000',
        weight: 18,
        opacity: 0,
        interactive: true,
      })
      hit.bindTooltip(summary, { sticky: true, direction: 'top', className: 'route-tooltip' })
      layers.push(hit)

      const segKm = pathLengthKm(seg)
      if (segKm <= 0) return

      // Orta nokta etiketi
      if (legs.length <= 12) {
        const mid = pointsAlongPath(seg, segKm)[0]
        if (mid) {
          layers.push(
            L.marker(mid.pos, {
              interactive: false,
              keyboard: false,
              zIndexOffset: 600,
              icon: L.divIcon({
                className: `route-leg-label${approximate ? ' is-approx' : ''}`,
                html: `<div>${MODE_META[mode].emoji} ${formatDistance(leg.distanceKm)} · ${formatDuration(leg.durationMin)}</div>`,
                iconSize: [0, 0],
              }),
            })
          )
        }
      }

      // Yön okları — mesafeye göre aralıklı, etiketle çakışmaz
      if (segKm >= 0.4) {
        const spacing = Math.min(Math.max(segKm / 5, 0.35), 2.5)
        const clearance = Math.max(0.15, segKm * 0.08)
        pointsAlongPath(seg, spacing).forEach((a) => {
          if (Math.abs(a.at - segKm / 2) < clearance) return
          layers.push(
            L.marker(a.pos, {
              interactive: false,
              keyboard: false,
              zIndexOffset: 400,
              icon: L.divIcon({
                className: 'route-arrow',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                html: `<div style="width:20px;height:20px;transform:rotate(${a.bearing}deg);">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="9" fill="${mainColor}" stroke="#ffffff" stroke-width="1.6"/>
                    <path d="M6 12.5 L10 6.5 L14 12.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>`,
              }),
            })
          )
        })
      }
    })

    const group = L.layerGroup(layers).addTo(map)

    return () => {
      try {
        map.removeLayer(group)
      } catch {
        /* noop */
      }
    }
  }, [routeResult, leafletLoaded])

  // Yeni rota geldiğinde görünüm: panel/mobil sheet alanını hesaba katarak sığdır
  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !leafletLoaded || !routeResult || routeResult.path.length < 2) return

    const isMobile = window.innerWidth < 768
    const bottomPad = isMobile
      ? Math.min((sidebarOpenRef.current ? window.innerHeight * 0.8 : 56) + 24, window.innerHeight * 0.5)
      : 48

    map.fitBounds(L.latLngBounds(routeResult.path), {
      paddingTopLeft: [48, 64],
      paddingBottomRight: [48, bottomPad],
      maxZoom: 16,
      animate: true,
    })
  }, [routeResult, leafletLoaded])

  /* ---------------------------------------------------------------- */
  /* Handlerlar                                                        */
  /* ---------------------------------------------------------------- */

  const handleRemoveStop = useCallback((index: number) => {
    setSelectedStops((prev) => {
      const filtered = prev.filter((_, i) => i !== index)
      return filtered.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
    setActiveStopIndex((prev) => (prev === index ? null : prev))
  }, [])

  const handleMoveStop = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    setSelectedStops((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIndex]
      copy[targetIndex] = temp
      return copy.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
    setActiveStopIndex(targetIndex)
  }, [])

  const handleFocusPlace = useCallback((lat: number, lng: number, index: number) => {
    setActiveStopIndex(index)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true })
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [])

  const handleOpenInGoogleMaps = useCallback(() => {
    if (routePoints.length === 0) return
    const fmt = (p: LatLng) => `${p[0]},${p[1]}`

    if (routePoints.length === 1) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${fmt(routePoints[0])}`,
        '_blank',
        'noopener,noreferrer'
      )
      return
    }

    const origin = fmt(routePoints[0])
    const destination = fmt(routePoints[routePoints.length - 1])

    let middle = routePoints.slice(1, -1)
    if (middle.length > 9) {
      alert('Google Maps en fazla 9 ara durak destekler; ilk 9 ara durak gönderildi.')
      middle = middle.slice(0, 9)
    }
    const waypoints = middle.length
      ? `&waypoints=${encodeURIComponent(middle.map(fmt).join('|'))}`
      : ''

    const mode = travelMode === 'walking' ? 'walking' : travelMode === 'transit' ? 'transit' : 'driving'
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=${mode}`,
      '_blank',
      'noopener,noreferrer'
    )
  }, [routePoints, travelMode])

  // Sidebar'daki durak öncesi bacak bilgisi
  const getLegBeforeStop = useCallback(
    (idx: number): RouteLeg | null => {
      if (!routeResult) return null
      const legIndex = startFromUser && userLocation ? idx : idx - 1
      return legIndex >= 0 ? routeResult.legs[legIndex] ?? null : null
    },
    [routeResult, startFromUser, userLocation]
  )

  const hasRoute = routePoints.length >= 2

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-[#070b14] text-slate-100 flex flex-col md:flex-row">
      <style>{ROUTE_CSS}</style>

      {/* SOL / ALT PANEL */}
      <div
        className={`fixed md:relative inset-x-0 bottom-0 z-30 transition-all duration-300 flex flex-col bg-[#0c1220]/95 backdrop-blur-xl border-t md:border-t-0 md:border-r border-slate-800/90 shadow-2xl ${
          isSidebarOpen
            ? 'h-[80dvh] md:h-full w-full md:w-[420px] lg:w-[460px]'
            : 'h-14 md:h-full w-full md:w-0 md:overflow-hidden'
        }`}
      >
        {/* Panel Header & Mobil Tutamaç */}
        <div
          className="p-3 md:p-4 border-b border-slate-800/80 bg-[#070b14]/80 cursor-pointer md:cursor-default"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setIsSidebarOpen((prev) => !prev)
            }
          }}
        >
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2 md:hidden" />

          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
                <Compass className="w-4 h-4" strokeWidth={2} />
              </div>
              <h1 className="font-serif text-base md:text-lg text-white">Rota Planlayıcı</h1>
              {selectedStops.length > 0 && (
                <span className="md:hidden px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-semibold">
                  {selectedStops.length} Durak
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/kesfet"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
              >
                <span>Mekanlar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                className="md:hidden text-slate-400 hover:text-white p-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSidebarOpen((prev) => !prev)
                }}
              >
                {isSidebarOpen ? <X className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Seyahat Modu Seçici */}
          <div
            className={`${isSidebarOpen ? 'block' : 'hidden md:block'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 mb-3">
              {(
                [
                  { mode: 'driving', Icon: Car },
                  { mode: 'walking', Icon: Footprints },
                  { mode: 'transit', Icon: TrainFront },
                ] as { mode: TravelMode; Icon: typeof Car }[]
              ).map(({ mode, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTravelMode(mode)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    travelMode === mode
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>{MODE_META[mode].label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGetUserLocation}
                disabled={isLocating}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                  userLocation
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/30'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-amber-400/40'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{isLocating ? 'Konum...' : userLocation ? 'Konum Aktif' : 'Konum Bul'}</span>
              </button>

              {userLocation && (
                <button
                  type="button"
                  onClick={() => setStartFromUser((v) => !v)}
                  title="Rotayı bulunduğum konumdan başlat"
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                    startFromUser
                      ? 'bg-sky-500/25 text-sky-200 border-sky-400/50'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-sky-400/40'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Konumdan Başla</span>
                </button>
              )}

              {selectedStops.length >= 2 && (
                <button
                  type="button"
                  onClick={handleSortByProximity}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Akıllı Sırala</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panel Gövdesi */}
        {isSidebarOpen && (
          <>
            {/* Kategori Seçimi ve Kategori İçi Arama */}
            <div className="p-3 md:p-4 border-b border-slate-800/80 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Kategori Seçin
                </label>
                <select
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null
                    setSelectedCategoryId(val)
                    setSearchQuery('')
                  }}
                  disabled={loadingCategories}
                  className={inputClass}
                >
                  <option value="">
                    {loadingCategories ? 'Kategoriler yükleniyor...' : 'Kategori seçiniz (Harita boş başlar)'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategoryId && (
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`${selectedCategoryObj?.name || 'Kategori'} içinde ara...`}
                    className={`${inputClass} pl-9 pr-8`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
              {!selectedCategoryId ? (
                <div className="text-center py-6 px-4 bg-slate-900/60 border border-slate-800/90 rounded-2xl">
                  <div className="w-11 h-11 mx-auto mb-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
                    <FolderOpen className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Önce Bir Kategori Seçin</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                    Başlangıçta harita boş durur. Yukarıdan kategori seçtiğinizde o kategorideki mekanlar listelenir ve haritada görünür.
                  </p>
                </div>
              ) : loadingPlaces ? (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>{selectedCategoryObj?.name || 'Kategori'} mekanları yükleniyor...</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2 px-1">
                    <span className="inline-flex items-center gap-1.5 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                      <span>
                        {selectedCategoryObj?.name} ({categoryPlaces.length})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(null)
                        setSearchQuery('')
                      }}
                      className="text-slate-400 hover:text-amber-300 transition cursor-pointer"
                    >
                      Kategoriyi Kapat
                    </button>
                  </div>

                  {categoryPlaces.length === 0 ? (
                    <div className="text-center py-6 px-3 text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800/80">
                      Bu kategoride kayıtlı mekan bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      <AnimatePresence initial={false}>
                        {categoryPlaces.map((place) => {
                          const isAdded = selectedStops.some((s) => s.place.id === place.id)
                          return (
                            <motion.div
                              key={place.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="p-2.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-400/40 rounded-xl transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs md:text-sm font-semibold text-white truncate">
                                  {place.name}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline shrink-0" />
                                  <span>{Number(place.average_rating).toFixed(1)}</span>
                                  {place.district && place.district !== 'Diğer' ? (
                                    <span>• {place.district}</span>
                                  ) : null}
                                  {place.address ? <span>• {place.address}</span> : null}
                                  {typeof place.distanceFromUser === 'number' && (
                                    <span className="text-amber-400 font-semibold">
                                      • {place.distanceFromUser.toFixed(1)} km
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={isAdded}
                                onClick={() => handleAddStop(place)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                                  isAdded
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 cursor-default'
                                    : 'bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 cursor-pointer'
                                }`}
                              >
                                {isAdded ? 'Eklendi' : '+ Ekle'}
                              </button>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* Seçili Rota Durakları */}
              {selectedStops.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2 px-1">
                    <span>ROTADAKİ DURAKLAR ({selectedStops.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStops([])
                        setActiveStopIndex(null)
                      }}
                      className="text-red-400 hover:text-red-300 transition cursor-pointer"
                    >
                      Temizle
                    </button>
                  </div>

                  <div className="space-y-1">
                    {selectedStops.map((stop, idx) => {
                      const leg = getLegBeforeStop(idx)
                      return (
                        <div key={stop.id}>
                          {/* Önceki duraktan bu durağa mesafe / süre */}
                          {leg && routeResult && (
                            <div className="flex items-center gap-2 pl-[11px] py-1 text-[11px] font-semibold text-sky-300/90">
                              <span className="block w-px h-4 bg-sky-400/40" />
                              <span>
                                {MODE_META[routeResult.mode].emoji} {formatDistance(leg.distanceKm)} ·{' '}
                                {formatDuration(leg.durationMin)}
                                {startFromUser && userLocation && idx === 0 ? ' · konumunuzdan' : ''}
                              </span>
                            </div>
                          )}

                          <motion.div
                            layout
                            className={`p-2.5 md:p-3 rounded-xl border transition-all ${
                              activeStopIndex === idx
                                ? 'bg-amber-400/10 border-amber-400/40 shadow-lg'
                                : 'bg-slate-900/75 border-slate-800/90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>

                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() =>
                                  handleFocusPlace(stop.place.latitude, stop.place.longitude, idx)
                                }
                              >
                                <h4 className="text-xs md:text-sm font-semibold text-white truncate">
                                  {stop.place.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {stop.place.address}
                                </p>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveStop(idx, 'up')}
                                  className="p-1 text-slate-400 hover:text-amber-300 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === selectedStops.length - 1}
                                  onClick={() => handleMoveStop(idx, 'down')}
                                  className="p-1 text-slate-400 hover:text-amber-300 disabled:opacity-20 cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(idx)}
                                  className="p-1 text-slate-400 hover:text-red-400 ml-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {hasRoute && (
              <div className="p-3 md:p-4 border-t border-slate-800/80 bg-[#070b14]/90">
                <div
                  className={`flex items-center justify-between mb-2.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs transition-opacity ${
                    isRoutingLoading ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  <div>
                    <span className="text-slate-400">
                      Toplam Mesafe{routeResult?.approximate ? ' (kuş uçuşu)' : ''}
                    </span>
                    <p className="font-bold text-white mt-0.5">
                      {routeResult ? formatDistance(routeResult.distanceKm) : '...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">
                      Tahmini Süre ({selectedStops.length > 0 ? routePoints.length - 1 : 0} etap)
                    </span>
                    <p className="font-bold text-amber-400 mt-0.5">
                      {routeResult ? formatDuration(routeResult.durationMin) : '...'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenInGoogleMaps}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-semibold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition cursor-pointer"
                >
                  <Navigation className="w-4 h-4" strokeWidth={2.2} />
                  <span>Google Maps ile Başlat</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* DESKTOP PANEL AÇ/KAPA BUTONU */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="hidden md:flex my-auto -ml-3 z-30 h-10 w-7 bg-[#0c1220] text-slate-300 hover:text-amber-300 rounded-r-lg border border-slate-800 items-center justify-center shadow-lg transition shrink-0 cursor-pointer"
        title={isSidebarOpen ? 'Paneli Gizle' : 'Paneli Göster'}
      >
        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* HARİTA */}
      <div className="flex-1 h-full w-full relative z-10">
        <div ref={mapContainerRef} className="w-full h-full" />

        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-200 border border-slate-800/90 shadow-lg flex items-center gap-2 pointer-events-auto bg-[#0c1220]/90 backdrop-blur-md">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedCategoryId ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>
              {selectedCategoryId
                ? `${categoryPlaces.length} Mekan (${selectedCategoryObj?.name || 'Kategori'})`
                : 'Kategori Seçilmedi'}
            </span>
          </div>

          {isRoutingLoading && (
            <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-amber-300 border border-amber-400/25 shadow-lg flex items-center gap-1.5 pointer-events-auto bg-[#0c1220]/90 backdrop-blur-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Rota Hesaplanıyor...</span>
            </div>
          )}

          {!isRoutingLoading && routeResult?.approximate && (
            <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-200 border border-slate-600/60 shadow-lg flex items-center gap-1.5 pointer-events-auto bg-[#0c1220]/90 backdrop-blur-md">
              <TriangleAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Yol verisine ulaşılamadı, kuş uçuşu gösteriliyor</span>
            </div>
          )}

          {!isRoutingLoading && routeResult && !routeResult.approximate && routeResult.mode === 'transit' && (
            <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-200 border border-slate-700/80 shadow-lg flex items-center gap-1.5 pointer-events-auto bg-[#0c1220]/90 backdrop-blur-md">
              <TrainFront className="w-3.5 h-3.5 text-sky-400" />
              <span>Toplu taşıma süresi tahminidir</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}