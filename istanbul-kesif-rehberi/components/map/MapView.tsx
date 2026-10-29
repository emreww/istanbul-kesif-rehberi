'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface MapPlace {
  id: string
  name: string
  district?: string
  address?: string
  latitude: number
  longitude: number
  average_rating?: number
  total_reviews?: number
  categories?: { name: string; icon?: string } | { name: string; icon?: string }[]
}

interface MapViewProps {
  places: MapPlace[]
}

export default function MapView({ places }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const clusterGroupRef = useRef<unknown>(null)
  const userMarkerRef = useRef<unknown>(null)
  const leafletLibRef = useRef<unknown>(null)

  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // 1. Leaflet & MarkerCluster Dinamik Yükleme
  useEffect(() => {
    let isMounted = true

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return

      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')

      if (!isMounted) return
      leafletLibRef.current = L

      if (mapInstanceRef.current) return

      // İstanbul Merkez
      const map = L.map(mapContainerRef.current, {
        center: [41.0082, 28.9784],
        zoom: 12,
        zoomControl: false,
        preferCanvas: true, // GPU Destekli Canvas Hızlandırma
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenZooming: false,
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Kullanıcı Konumunu Alma İşlevi
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

        const map = mapInstanceRef.current as any
        if (map) {
          map.setView([coords.lat, coords.lng], 14, { animate: true })
        }
      },
      (err) => {
        console.warn('Konum alınamadı:', err.message)
        setIsLocating(false)
        alert('Konumunuza erişilemedi.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // 2. Kullanıcı Konumu Harita Pini (Pulse Animasyonlu)
  useEffect(() => {
    const L = leafletLibRef.current as any
    const map = mapInstanceRef.current as any
    if (!L || !map || !userLocation) return

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current as any)
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
        <span style="font-size: 16px;">📍</span>
        <h4 style="margin:2px 0 0 0; font-size:13px; font-weight:800; color:#2563eb;">ŞU ANKİ KONUMUNUZ</h4>
      </div>
    `)

    userMarkerRef.current = marker
  }, [userLocation, mapReady])

  // 3. Mekan Pinlerini ve Cluster (Kümeleme) Oluşturma
  useEffect(() => {
    const L = leafletLibRef.current as any
    const map = mapInstanceRef.current as any
    if (!L || !map || !mapReady) return

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current as any)
      clusterGroupRef.current = null
    }

    // 2. Koddaki Kümeleme Mantığı
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

    const markersList: any[] = []
    const bounds: [number, number][] = []

    places.forEach((place) => {
      if (!place.latitude || !place.longitude) return

      bounds.push([place.latitude, place.longitude])

      const category = Array.isArray(place.categories) ? place.categories[0] : place.categories
      const iconEmoji = category?.icon || '📍'

      const customPinIcon = L.divIcon({
        className: 'custom-unselected-pin',
        html: `
          <div style="
            background: #1e293b;
            border: 2px solid #f97316;
            color: #f97316;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            cursor: pointer;
            transition: transform 0.2s;
          ">${iconEmoji}</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([place.latitude, place.longitude], { icon: customPinIcon })

      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #0f172a; padding: 4px; min-width: 170px;">
          <div style="font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase;">${category?.name || 'MEKAN'}</div>
          <h4 style="margin:2px 0 4px 0; font-size:14px; font-weight:700;">${place.name}</h4>
          <p style="margin:0 0 8px 0; font-size:12px; color:#64748b;">
            ${place.district || ''} • ⭐ ${Number(place.average_rating || 5).toFixed(1)} ${place.total_reviews ? `(${place.total_reviews} yorum)` : ''}
          </p>
          <a href="/mekan/${place.id}" style="
            display: block;
            text-align: center;
            background: #f97316;
            color: white;
            text-decoration: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
          ">Mekanı İncele →</a>
        </div>
      `)

      markersList.push(marker)
    })

    markersCluster.addLayers(markersList)
    map.addLayer(markersCluster)
    clusterGroupRef.current = markersCluster

    // Filtrelenen tüm mekanların görünmesi için harita sınırlarını otomatik ayarla
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [places, mapReady])

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Harita Konteynırı */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Harita Üstü Kontroller & Rozetler */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
        <div className="glass-panel px-3 py-1.5 rounded-full text-xs font-semibold text-gray-200 border border-white/10 shadow-lg flex items-center gap-2 pointer-events-auto bg-gray-900/80 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{places.length} Mekan Haritada</span>
        </div>

        <button
          onClick={handleGetUserLocation}
          disabled={isLocating}
          className="pointer-events-auto py-1.5 px-3 rounded-full text-xs font-semibold bg-gray-900/80 backdrop-blur-md text-gray-200 border border-white/10 hover:bg-white/10 transition shadow-lg flex items-center gap-1.5"
        >
          <span>📍</span>
          {isLocating ? 'Konum Alınıyor...' : userLocation ? 'Konumun Aktif ✓' : 'Konumumu Bul'}
        </button>
      </div>
    </div>
  )
}