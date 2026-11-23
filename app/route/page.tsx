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
} from 'lucide-react'

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
  const [isRoutingLoading, setIsRoutingLoading] = useState(false)
  const [realRouteStats, setRealRouteStats] = useState<{ distanceKm: number; durationMin: number } | null>(null)

  // Leaflet refleri
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const clusterGroupRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const leafletLibRef = useRef<any>(null)

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

  // Haversine mesafe hesabı (km)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  // Seyahat moduna göre tahmini süre (dakika)
  const estimateDurationMinutes = useCallback((distanceKm: number, mode: TravelMode, osrmDurationSec?: number) => {
    if (mode === 'driving' && typeof osrmDurationSec === 'number') {
      return Math.max(1, Math.round(osrmDurationSec / 60))
    }
    if (mode === 'walking') {
      return Math.max(1, Math.round((distanceKm / 4.8) * 60))
    }
    return Math.max(2, Math.round((distanceKm / 20) * 60 + 6))
  }, [])

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
  }, [categoryRawPlaces, selectedCategoryId, searchQuery, userLocation, calculateDistance])

  // En yakın komşu algoritması ile durak sıralama
  const handleSortByProximity = useCallback(() => {
    if (selectedStops.length <= 1) return

    const startPoint = userLocation
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
  }, [selectedStops, userLocation, calculateDistance])

  // Leaflet Başlatma
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

  // Kullanıcı Konumu Pini
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
          <div style="
            position: absolute;
            width: 22px;
            height: 22px;
            background: rgba(59, 130, 246, 0.35);
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
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

  // Marker, Cluster ve Rota Güncelleme
  useEffect(() => {
    const L = leafletLibRef.current
    const map = mapInstanceRef.current
    if (!L || !map || !leafletLoaded) return

    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current)
      clusterGroupRef.current = null
    }

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current)
      polylineRef.current = null
    }

    const selectedPlaceIds = new Set(selectedStops.map((s) => s.place.id))

    if (selectedCategoryId && categoryPlaces.length > 0) {
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
            <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700;">${place.name}</h4>
            <p style="margin:0 0 8px 0; font-size:12px; color:#64748b;">${place.address || ''}${distText} • ★ ${Number(place.average_rating).toFixed(1)}</p>
            <button data-place-id="${place.id}" class="js-add-stop-btn" style="
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
        clusterGroupRef.current = markersCluster

        if (selectedStops.length === 0) {
          const bounds = markersCluster.getBounds()
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 })
          }
        }
      }
    }

    const routeCoords: [number, number][] = []

    selectedStops.forEach((stop, idx) => {
      routeCoords.push([stop.place.latitude, stop.place.longitude])

      const stopIcon = L.divIcon({
        className: 'custom-route-pin',
        html: `
          <div style="
            position: relative;
            background: linear-gradient(135deg, #fbbf24, #d97706);
            color: #090d16;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
            border: 2px solid #ffffff;
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
      }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
          <div style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase;">DURAK #${idx + 1}</div>
          <h4 style="margin:2px 0 4px 0; font-size:14px; font-weight:700;">${stop.place.name}</h4>
          <p style="margin:0 0 6px 0; font-size:12px; color:#64748b;">${stop.place.address || ''}</p>
        </div>
      `)

      markersRef.current.push(marker)
    })

    let isCancelled = false

    const applyPolyline = (path: [number, number][], distanceKm: number, durationMin: number) => {
      const polyline = L.polyline(path, {
        color: '#fbbf24',
        weight: travelMode === 'driving' ? 6 : 5,
        opacity: 0.92,
        dashArray: travelMode === 'walking' ? '8, 8' : travelMode === 'transit' ? '12, 6' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      polylineRef.current = polyline
      setRealRouteStats({ distanceKm, durationMin })
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
    }

    const fallbackDirectPolyline = (coords: [number, number][]) => {
      let totalKm = 0
      for (let i = 0; i < coords.length - 1; i++) {
        totalKm += calculateDistance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
      }
      const roundedKm = Number(totalKm.toFixed(1))
      applyPolyline(coords, roundedKm, estimateDurationMinutes(roundedKm, travelMode))
    }

    if (routeCoords.length >= 2) {
      setIsRoutingLoading(true)

      const osrmProfile = travelMode === 'walking' ? 'foot' : 'driving'
      const coordsQuery = routeCoords.map(([lat, lng]) => `${lng},${lat}`).join(';')
      const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordsQuery}?overview=full&geometries=geojson`

      fetch(osrmUrl)
        .then((res) => res.json())
        .then((data) => {
          if (isCancelled) return

          if (data && data.routes && data.routes[0]) {
            const routeData = data.routes[0]
            const path: [number, number][] = routeData.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            )
            const distKm = Number((routeData.distance / 1000).toFixed(1))
            const durMin = estimateDurationMinutes(distKm, travelMode, routeData.duration)
            applyPolyline(path, distKm, durMin)
          } else {
            fallbackDirectPolyline(routeCoords)
          }
        })
        .catch(() => {
          if (!isCancelled) fallbackDirectPolyline(routeCoords)
        })
        .finally(() => {
          if (!isCancelled) setIsRoutingLoading(false)
        })
    } else if (routeCoords.length === 1) {
      setRealRouteStats(null)
      setIsRoutingLoading(false)
      map.setView(routeCoords[0], 14, { animate: true })
    } else {
      setRealRouteStats(null)
      setIsRoutingLoading(false)
    }

    return () => {
      isCancelled = true
    }
  }, [categoryPlaces, selectedCategoryId, selectedStops, travelMode, leafletLoaded, handleAddStop, calculateDistance, estimateDurationMinutes])

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
    if (selectedStops.length === 0) return

    if (selectedStops.length === 1) {
      const p = selectedStops[0].place
      window.open(`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`, '_blank')
      return
    }

    const origin = `${selectedStops[0].place.latitude},${selectedStops[0].place.longitude}`
    const destination = `${selectedStops[selectedStops.length - 1].place.latitude},${selectedStops[selectedStops.length - 1].place.longitude}`

    let waypoints = ''
    if (selectedStops.length > 2) {
      const intermediate = selectedStops.slice(1, -1)
      waypoints = `&waypoints=${intermediate.map((s) => `${s.place.latitude},${s.place.longitude}`).join('|')}`
    }

    const mode = travelMode === 'walking' ? 'walking' : travelMode === 'transit' ? 'transit' : 'driving'
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=${mode}`
    window.open(url, '_blank')
  }, [selectedStops, travelMode])

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-[#070b14] text-slate-100 flex flex-col md:flex-row">
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
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  travelMode === 'driving'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Car className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Araç</span>
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  travelMode === 'walking'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Yürüyüş</span>
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('transit')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  travelMode === 'transit'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrainFront className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Toplu T.</span>
              </button>
            </div>

            <div className="flex gap-2">
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

                  <div className="space-y-2">
                    {selectedStops.map((stop, idx) => (
                      <motion.div
                        key={stop.id}
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
                            onClick={() => handleFocusPlace(stop.place.latitude, stop.place.longitude, idx)}
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedStops.length >= 2 && (
              <div className="p-3 md:p-4 border-t border-slate-800/80 bg-[#070b14]/90">
                <div className="flex items-center justify-between mb-2.5 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Toplam Mesafe</span>
                    <p className="font-bold text-white mt-0.5">
                      {realRouteStats ? `${realRouteStats.distanceKm} km` : '...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Tahmini Süre</span>
                    <p className="font-bold text-amber-400 mt-0.5">
                      {realRouteStats
                        ? realRouteStats.durationMin >= 60
                          ? `${Math.floor(realRouteStats.durationMin / 60)}s ${realRouteStats.durationMin % 60}dk`
                          : `${realRouteStats.durationMin} dk`
                        : '...'}
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
        </div>
      </div>
    </div>
  )
}