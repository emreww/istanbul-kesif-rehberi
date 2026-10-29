'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/notifications'
import { revalidateAppCache } from '@/app/actions/admin'

const CLOSED_REPORTS_STORAGE_KEY = 'istanbul_admin_closed_reports'

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState('mekanlar')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingPlaces, setPendingPlaces] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<any[]>([])
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [closedReports, setClosedReports] = useState<any[]>([])
  const [ownershipRequests, setOwnershipRequests] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [allPhotos, setAllPhotos] = useState<any[]>([])
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null)
  const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'place' | 'review' | 'user'>('all')
  const [closedReportTypeFilter, setClosedReportTypeFilter] = useState<'all' | 'place' | 'review' | 'user'>('all')
  
  // Toplu Seçim State'leri
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([])
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const [stats, setStats] = useState({
    totalPlaces: 0,
    totalUsers: 0,
    totalReviews: 0,
    totalActiveReports: 0,
    totalClosedReports: 0,
    totalPhotos: 0,
    pendingCount: 0,
  })
  const [loading, setLoading] = useState(true)

  // Arama state'leri
  const [searchUsers, setSearchUsers] = useState('')
  const [searchReports, setSearchReports] = useState('')
  const [searchClosedReports, setSearchClosedReports] = useState('')
  const [searchPlaces, setSearchPlaces] = useState('')
  const [searchOwnership, setSearchOwnership] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  // Local storage'dan kapatılan raporları yükle
  const loadSavedClosedReports = useCallback((): any[] => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(CLOSED_REPORTS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }, [])

  const saveClosedReports = useCallback((newClosedReports: any[]) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(CLOSED_REPORTS_STORAGE_KEY, JSON.stringify(newClosedReports))
    } catch (e) {
      console.error('Failed to save closed reports:', e)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cat,allPlace,pend,totalPlace,profile,totalUser,review,totalReview,allReport] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase
        .from('places')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
        supabase
        .from('places')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
        supabase
        .from('places')
        .select('id', { count: 'exact', head: true }),
        supabase
        .from('profiles')
        .select('id, username, created_at, total_reviews, is_admin, is_banned, ban_reason')
        .order('created_at', { ascending: false })
        .limit(100),
        supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
        supabase
        .from('reviews')
        .select('id, rating, comment, created_at, user_id, place_id')
        .order('created_at', { ascending: false })
        .limit(100),
        supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true }),
        supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      ]
    )
      const cats=cat.data || []
      const allPlacesData=allPlace.data || []
      const pending=pend.data || []
      const totalPlacesCount=totalPlace.count || 0
      const profiles=profile.data || []
      const totalUsersCount=totalUser.count || 0
      const reviews=review.data || []
      const totalReviewsCount=totalReview.count || 0
      const allReports=allReport.data || []

      setCategories(cats ?? [])
      setAllPlaces(allPlacesData ?? [])
      setPendingPlaces(pending ?? [])
      setAllProfiles(profiles ?? [])
      setAllReviews(reviews ?? [])
      // Veritabanı raporlarını ve yerel arşivi ayrıştır
      const storedClosed = loadSavedClosedReports()
      const storedClosedIds = new Set(storedClosed.map((r: any) => r.id))

      const dbReports = allReports ?? []
      const activeList: any[] = []
      const closedList: any[] = [...storedClosed]

      dbReports.forEach((r: any) => {
        if (r.status === 'closed' || r.status === 'resolved' || storedClosedIds.has(r.id)) {
          if (!closedList.find((c: any) => c.id === r.id)) {
            closedList.unshift(r)
          }
        } else {
          activeList.push(r)
        }
      })

      setReports(activeList)
      setClosedReports(closedList)

      const { data: requests } = await supabase
        .from('ownership_requests')
        .select(`
          id, status, message, created_at, place_id, user_id,
          places ( id, name ),
          profiles ( username )
        `)
        .order('created_at', { ascending: false })
      setOwnershipRequests(requests ?? [])

      const { data: photosData, count: totalPhotosCount } = await supabase
        .from('photos')
        .select(`
          id, url, caption, created_at, user_id, place_id,
          profiles ( username ),
          places ( name )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100)
      setAllPhotos(photosData ?? [])

      // Son 7 günlük aktivite hesaplama
      const counts = [0, 0, 0, 0, 0, 0, 0]
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      const recentItems = [...(reviews || []), ...(profiles || []), ...(allPlacesData || []), ...(dbReports || [])]
      recentItems.forEach(item => {
        if (!item.created_at) return
        const date = new Date(item.created_at)
        const diffTime = Math.abs(now.getTime() - date.getTime())
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays >= 0 && diffDays < 7) {
          const index = 6 - diffDays
          counts[index]++
        }
      })
      // prevent all zeros chart line flatting to the top. Just add small artificial padding.
      setChartData(counts)

      setStats({
        totalPlaces: totalPlacesCount || 0,
        totalUsers: totalUsersCount || 0,
        totalReviews: totalReviewsCount || 0,
        totalActiveReports: activeList.length,
        totalClosedReports: closedList.length,
        totalPhotos: totalPhotosCount || 0,
        pendingCount: (pending ?? []).length,
      })
    } catch (err) {
      console.error('Admin data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, loadSavedClosedReports])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ownership_requests' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const newReport = payload.new as any
        setReports(prev => [newReport, ...prev])
        setStats(prev => ({ ...prev, totalActiveReports: prev.totalActiveReports + 1 }))
        addNotification('Yeni bir şikayet raporu geldi ⚠️', 'warning')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        const updated = payload.new as any
        if (updated.status === 'closed' || updated.status === 'resolved') {
          setReports(prev => prev.filter(r => r.id !== updated.id))
          setClosedReports(prev => [updated, ...prev.filter(r => r.id !== updated.id)])
        } else {
          setReports(prev => prev.map(r => r.id === updated.id ? updated : r))
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, (payload) => {
        const deletedId = (payload.old as any).id
        setReports(prev => prev.filter(r => r.id !== deletedId))
        setClosedReports(prev => prev.filter(r => r.id !== deletedId))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchData, addNotification])

  const approvePlace = async (id: string) => {
    await supabase.from('places').update({ status: 'approved' }).eq('id', id)
    setPendingPlaces(prev => prev.filter(p => p.id !== id))
    setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
    addNotification('Mekan onaylandı ✅', 'success')
    await revalidateAppCache()
    router.refresh()
  }

  const rejectPlace = async (id: string) => {
    await supabase.from('places').update({ status: 'rejected' }).eq('id', id)
    setPendingPlaces(prev => prev.filter(p => p.id !== id))
    setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }))
    addNotification('Mekan reddedildi ❌', 'warning')
    await revalidateAppCache()
    router.refresh()
  }

  const deletePlace = async (id: string) => {
    if (!confirm('Bu mekanı silmek istediğinize emin misiniz? (Bu işlem geri alınamaz)')) return
    await supabase.from('places').delete().eq('id', id)
    setAllPlaces(prev => prev.filter(p => p.id !== id))
    setStats(prev => ({ ...prev, totalPlaces: Math.max(0, prev.totalPlaces - 1) }))
    addNotification('Mekan kalıcı olarak silindi 🗑️', 'info')
    await revalidateAppCache()
    router.refresh()
  }

  const bulkApprovePending = async () => {
    if (selectedPendingIds.length === 0) return
    setBulkLoading(true)
    try {
      await supabase.from('places').update({ status: 'approved' }).in('id', selectedPendingIds)
      setPendingPlaces(prev => prev.filter(p => !selectedPendingIds.includes(p.id)))
      setStats(prev => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - selectedPendingIds.length),
        totalPlaces: prev.totalPlaces + selectedPendingIds.length,
      }))
      addNotification(`${selectedPendingIds.length} mekan toplu onaylandı! ✅`, 'success')
      setSelectedPendingIds([])
      await revalidateAppCache()
      router.refresh()
    } catch (err: any) {
      addNotification('Toplu işlem hatası: ' + err.message, 'warning')
    } finally {
      setBulkLoading(false)
    }
  }

  const bulkRejectPending = async () => {
    if (selectedPendingIds.length === 0) return
    if (!confirm(`${selectedPendingIds.length} mekanı reddetmek istediğinize emin misiniz?`)) return
    setBulkLoading(true)
    try {
      await supabase.from('places').update({ status: 'rejected' }).in('id', selectedPendingIds)
      setPendingPlaces(prev => prev.filter(p => !selectedPendingIds.includes(p.id)))
      setStats(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - selectedPendingIds.length) }))
      addNotification(`${selectedPendingIds.length} mekan reddedildi ❌`, 'warning')
      setSelectedPendingIds([])
      await revalidateAppCache()
      router.refresh()
    } catch (err: any) {
      addNotification('Toplu işlem hatası: ' + err.message, 'warning')
    } finally {
      setBulkLoading(false)
    }
  }

  const deleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id)
    setAllReviews(prev => prev.filter(r => r.id !== id))
    setStats(prev => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - 1) }))
    addNotification('Yorum silindi 🗑️', 'info')
    await revalidateAppCache()
    router.refresh()
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Bu görseli silmek istediğinize emin misiniz?')) return
    await supabase.from('photos').delete().eq('id', id)
    setAllPhotos(prev => prev.filter(p => p.id !== id))
    setStats(prev => ({ ...prev, totalPhotos: Math.max(0, prev.totalPhotos - 1) }))
    addNotification('Görsel silindi 🗑️', 'info')
    await revalidateAppCache()
    router.refresh()
  }

  const bulkDeletePhotos = async () => {
    if (selectedPhotoIds.length === 0) return
    if (!confirm(`${selectedPhotoIds.length} görseli silmek istediğinize emin misiniz?`)) return
    setBulkLoading(true)
    try {
      await supabase.from('photos').delete().in('id', selectedPhotoIds)
      setAllPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id)))
      setStats(prev => ({ ...prev, totalPhotos: Math.max(0, prev.totalPhotos - selectedPhotoIds.length) }))
      addNotification(`${selectedPhotoIds.length} görsel silindi 🗑️`, 'info')
      setSelectedPhotoIds([])
      await revalidateAppCache()
      router.refresh()
    } catch (err: any) {
      addNotification('Toplu silme hatası: ' + err.message, 'warning')
    } finally {
      setBulkLoading(false)
    }
  }

  const bulkDeleteReviews = async () => {
    if (selectedReviewIds.length === 0) return
    if (!confirm(`${selectedReviewIds.length} yorumu kalıcı olarak silmek istediğinize emin misiniz?`)) return
    setBulkLoading(true)
    try {
      await supabase.from('reviews').delete().in('id', selectedReviewIds)
      setAllReviews(prev => prev.filter(r => !selectedReviewIds.includes(r.id)))
      setStats(prev => ({ ...prev, totalReviews: Math.max(0, prev.totalReviews - selectedReviewIds.length) }))
      addNotification(`${selectedReviewIds.length} yorum silindi 🗑️`, 'info')
      setSelectedReviewIds([])
      await revalidateAppCache()
      router.refresh()
    } catch (err: any) {
      addNotification('Toplu silme hatası: ' + err.message, 'warning')
    } finally {
      setBulkLoading(false)
    }
  }

  const bulkCloseReports = async () => {
    if (selectedReportIds.length === 0) return
    setBulkLoading(true)
    try {
      const closingReports = reports.filter(r => selectedReportIds.includes(r.id)).map(r => ({
        ...r,
        status: 'closed',
        closed_at: new Date().toISOString(),
      }))

      try {
        await supabase.from('reports').update({ status: 'closed' }).in('id', selectedReportIds)
      } catch {}

      const updatedActive = reports.filter(r => !selectedReportIds.includes(r.id))
      const updatedClosed = [...closingReports, ...closedReports]

      setReports(updatedActive)
      setClosedReports(updatedClosed)
      saveClosedReports(updatedClosed)

      setStats(prev => ({
        ...prev,
        totalActiveReports: Math.max(0, prev.totalActiveReports - selectedReportIds.length),
        totalClosedReports: prev.totalClosedReports + selectedReportIds.length,
      }))

      addNotification(`${selectedReportIds.length} rapor toplu kapatıldı 📁`, 'info')
      setSelectedReportIds([])
      router.refresh()
    } catch (err: any) {
      addNotification('Toplu kapatma hatası: ' + err.message, 'warning')
    } finally {
      setBulkLoading(false)
    }
  }

  // CSV Dışa Aktarımı
  const exportReportsToCSV = () => {
    const allReps = [...reports, ...closedReports]
    if (allReps.length === 0) {
      addNotification('Dışa aktarılacak rapor bulunamadı.', 'warning')
      return
    }

    const headers = ['ID', 'Tur', 'Neden', 'Durum', 'Tarih']
    const rows = allReps.map(r => [
      `"${r.id || ''}"`,
      `"${r.report_type || ''}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${r.status === 'closed' ? 'Kapali' : 'Aktif'}"`,
      `"${r.created_at || ''}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `istanbul_raporlar_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addNotification('Raporlar CSV olarak indirildi 📥', 'success')
  }

  const approveOwnership = async (requestId: string) => {
    const request = ownershipRequests.find(r => r.id === requestId)
    if (!request) return

    const placeId = request.place_id
    if (!placeId) {
      addNotification('Mekan ID bulunamadı!', 'warning')
      return
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({ owner_id: request.user_id })
      .eq('id', placeId)

    if (updateError) {
      addNotification('Mekan sahibi atanamadı: ' + updateError.message, 'warning')
      return
    }

    const { error: requestError } = await supabase
      .from('ownership_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    if (requestError) {
      addNotification('Talep onaylanamadı: ' + requestError.message, 'warning')
      return
    }

    setOwnershipRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r)
    )
    addNotification('Sahiplik talebi onaylandı ✅', 'success')
    await revalidateAppCache()
    router.refresh()
  }

  const rejectOwnership = async (requestId: string) => {
    await supabase
      .from('ownership_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    setOwnershipRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r)
    )
    addNotification('Sahiplik talebi reddedildi ❌', 'warning')
    await revalidateAppCache()
    router.refresh()
  }

  // Rapor Kapatma (Arşive ve Kapatılanlar sekmesine taşıma)
  const closeReport = async (reportId: string) => {
    const targetReport = reports.find(r => r.id === reportId)
    if (!targetReport) return

    const closedItem = {
      ...targetReport,
      status: 'closed',
      closed_at: new Date().toISOString(),
    }

    // Supabase'de status güncellemeye çalış (varsa günceller)
    try {
      await supabase.from('reports').update({ status: 'closed' }).eq('id', reportId)
    } catch {
      // sessizce devam et
    }

    const updatedActive = reports.filter(r => r.id !== reportId)
    const updatedClosed = [closedItem, ...closedReports.filter(r => r.id !== reportId)]

    setReports(updatedActive)
    setClosedReports(updatedClosed)
    saveClosedReports(updatedClosed)

    setStats(prev => ({
      ...prev,
      totalActiveReports: Math.max(0, prev.totalActiveReports - 1),
      totalClosedReports: prev.totalClosedReports + 1,
    }))

    addNotification('Rapor kapatıldı ve arşive eklendi 📁', 'info')
    router.refresh()
  }

  // Kapatılan Raporu Tekrar Açma (Geri Aktif Etme)
  const reopenReport = async (reportId: string) => {
    const targetReport = closedReports.find(r => r.id === reportId)
    if (!targetReport) return

    const activeItem = {
      ...targetReport,
      status: 'open',
      reopened_at: new Date().toISOString(),
    }

    try {
      await supabase.from('reports').update({ status: 'open' }).eq('id', reportId)
    } catch {
      // sessizce devam et
    }

    const updatedClosed = closedReports.filter(r => r.id !== reportId)
    const updatedActive = [activeItem, ...reports.filter(r => r.id !== reportId)]

    setClosedReports(updatedClosed)
    setReports(updatedActive)
    saveClosedReports(updatedClosed)

    setStats(prev => ({
      ...prev,
      totalActiveReports: prev.totalActiveReports + 1,
      totalClosedReports: Math.max(0, prev.totalClosedReports - 1),
    }))

    addNotification('Rapor tekrar aktif duruma getirildi 🔄', 'success')
    router.refresh()
  }

  // Raporu Kalıcı Olarak Silme
  const deleteReportPermanently = async (reportId: string) => {
    if (!window.confirm('Bu raporu kalıcı olarak silmek istediğinize emin misiniz?')) {
      return
    }

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (error) {
      console.warn('DB delete warning:', error.message)
    }

    const updatedClosed = closedReports.filter(r => r.id !== reportId)
    const updatedActive = reports.filter(r => r.id !== reportId)

    setClosedReports(updatedClosed)
    setReports(updatedActive)
    saveClosedReports(updatedClosed)

    setStats(prev => ({
      ...prev,
      totalClosedReports: Math.max(0, updatedClosed.length),
      totalActiveReports: Math.max(0, updatedActive.length),
    }))

    addNotification('Rapor kalıcı olarak silindi 🗑️', 'info')
    router.refresh()
  }

  const banUser = async (userId: string) => {
    const reason = window.prompt('Engelleme sebebini yazın:')
    if (reason === null) return

    await supabase
      .from('profiles')
      .update({ is_banned: true, ban_reason: reason.trim() })
      .eq('id', userId)

    setAllProfiles(prev =>
      prev.map(p =>
        p.id === userId
          ? { ...p, is_banned: true, ban_reason: reason.trim() }
          : p
      )
    )
    addNotification('Kullanıcı engellendi ⛔', 'warning')
    router.refresh()
  }
  const handleDeleteUser= async(userId:string) =>{
    if(!confirm('Bu kullanıcıyı veri tabanından silmek istediğinize eminmisiniz?'))
    return setDeletingUserId(userId)
    try{
      const {error}=await supabase.from('profiles').delete().eq('id',userId)
      if(error) throw error
      setAllProfiles(prev => prev.filter(p=>p.id !==userId))
      setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }))
      addNotification('Kullanıcı profili silindi 🗑️', 'info')
      router.refresh()
    }
    catch(err: any){addNotification('Silme hatası: ' + err.message, 'warning')}
    finally{
      setDeletingUserId(null)
    }
  }

  const unbanUser = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ is_banned: false, ban_reason: null })
      .eq('id', userId)

    setAllProfiles(prev =>
      prev.map(p =>
        p.id === userId
          ? { ...p, is_banned: false, ban_reason: null }
          : p
      )
    )
    addNotification('Kullanıcının engeli kaldırıldı ✅', 'success')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        <p className="text-gray-400 font-medium">Yönetim verileri yükleniyor...</p>
      </div>
    )
  }

  const tabs = [
    { id: 'mekanlar', label: 'Mekan Onayları', icon: '📍', count: stats.pendingCount, color: 'text-amber-400' },
    { id: 'tum_mekanlar', label: 'Tüm Mekanlar', icon: '🏪', count: stats.totalPlaces, color: 'text-indigo-400' },
    { id: 'medya', label: 'Medya Denetimi', icon: '📸', count: stats.totalPhotos, color: 'text-pink-400' },
    { id: 'yorumlar', label: 'Yorumlar', icon: '💬', count: stats.totalReviews, color: 'text-sky-400' },
    { id: 'kullanicilar', label: 'Kullanıcılar', icon: '👥', count: stats.totalUsers, color: 'text-emerald-400' },
    { id: 'sahiplik', label: 'Sahiplik Talepleri', icon: '🏢', count: ownershipRequests.filter(r => r.status === 'pending').length, color: 'text-purple-400' },
    { id: 'raporlar', label: 'Aktif Raporlar', icon: '⚠️', count: reports.length, color: 'text-rose-400' },
    { id: 'kapatilan_raporlar', label: 'Kapatılan Raporlar', icon: '📁', count: closedReports.length, color: 'text-teal-400' },
  ]

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Kategori yok'
  }

  const formatPrice = (priceRange: number | null) => {
    if (!priceRange) return 'Belirtilmemiş'
    return '₺'.repeat(priceRange)
  }

  // Filtreleme fonksiyonları
  const filteredUsers = allProfiles.filter(profile =>
    (profile.username?.toLowerCase() || '').includes(searchUsers.toLowerCase()) ||
    (profile.id?.toLowerCase() || '').includes(searchUsers.toLowerCase())
  )

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      (report.reason?.toLowerCase() || '').includes(searchReports.toLowerCase()) ||
      (report.report_type?.toLowerCase() || '').includes(searchReports.toLowerCase()) ||
      (report.id?.toLowerCase() || '').includes(searchReports.toLowerCase())
    const matchesType = reportTypeFilter === 'all' || report.report_type === reportTypeFilter
    return matchesSearch && matchesType
  })

  const filteredClosedReports = closedReports.filter(report => {
    const matchesSearch =
      (report.reason?.toLowerCase() || '').includes(searchClosedReports.toLowerCase()) ||
      (report.report_type?.toLowerCase() || '').includes(searchClosedReports.toLowerCase()) ||
      (report.id?.toLowerCase() || '').includes(searchClosedReports.toLowerCase())
    const matchesType = closedReportTypeFilter === 'all' || report.report_type === closedReportTypeFilter
    return matchesSearch && matchesType
  })

  const filteredPendingPlaces = pendingPlaces.filter(place =>
    (place.name?.toLowerCase() || '').includes(searchPlaces.toLowerCase()) ||
    (place.district?.toLowerCase() || '').includes(searchPlaces.toLowerCase())
  )

  const filteredOwnershipRequests = ownershipRequests.filter(request => {
    const placeName = Array.isArray(request.places) ? request.places[0]?.name : request.places?.name
    const userName = Array.isArray(request.profiles) ? request.profiles[0]?.username : request.profiles?.username
    const search = searchOwnership.toLowerCase()
    return (
      (placeName?.toLowerCase() || '').includes(search) ||
      (userName?.toLowerCase() || '').includes(search) ||
      (request.status?.toLowerCase() || '').includes(search) ||
      (request.message?.toLowerCase() || '').includes(search)
    )
  })

  return (
    <div className="relative min-h-screen">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Modern Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 270 : 88 }}
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } fixed left-0 top-0 h-screen z-50 bg-slate-950/95 backdrop-blur-xl border-r border-white/10 p-3 transition-transform flex flex-col justify-between`}
      >
        <div>
          <div className="flex items-center justify-between p-3 border-b border-white/10 mb-2">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🏙️</span>
                <span className="text-base font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent whitespace-nowrap">
                  Admin Panel
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:inline-flex p-2 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition"
              title={sidebarOpen ? 'Daralt' : 'Genişlet'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white p-2"
            >
              ✕
            </button>
          </div>

          <nav className="space-y-1.5 mt-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setMobileOpen(false)
                  }}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/5 text-primary-300 border-l-4 border-primary-500 shadow-lg shadow-primary-500/10'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <span className="text-xl shrink-0">{tab.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap">{tab.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold ${tab.color}`}>
                        {tab.count}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {sidebarOpen && (
          <div className="p-3 border-t border-white/10 space-y-2">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-white transition"
            >
              <span className="text-lg">🏠</span>
              <span>Ana Sayfaya Dön</span>
            </button>
          </div>
        )}
      </motion.aside>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-[270px]' : 'lg:ml-[88px]'}`}>
        <div className="lg:hidden p-4 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
          <button
            onClick={() => setMobileOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-200 font-medium text-sm flex items-center gap-2"
          >
            ☰ Menü
          </button>
          <span className="font-bold text-gray-200">🛠️ Admin Kontrol Paneli</span>
        </div>

        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Yönetim & Denetim Paneli
              </h1>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                <span>🗓️ {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Canlı Sistem
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportReportsToCSV}
                className="px-4 py-2 rounded-full bg-teal-500/20 border border-teal-500/40 text-xs sm:text-sm font-semibold text-teal-300 hover:bg-teal-500/30 transition flex items-center gap-1.5 shadow-md"
              >
                <span>📥</span> Raporları CSV İndir
              </button>
              <button
                onClick={() => fetchData()}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-medium text-gray-200 hover:bg-white/15 hover:border-white/25 transition flex items-center gap-2"
              >
                🔄 Yenile
              </button>
            </div>
          </div>

          {/* 7 Günlük Aktivite & Trend Grafiği */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span>📈</span> Son 7 Günlük Sistem Aktivite & Trend Analizi
                </h3>
                <p className="text-xs text-gray-400">Günlük onaylar, yeni yorumlar, kullanıcı kayıtları ve rapor hareketleri</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Canlı Trend
                </span>
              </div>
            </div>

            {/* SVG Alan Grafiği */}
            <div className="relative pt-4">
              <svg viewBox="0 0 700 160" className="w-full h-36 md:h-44 overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Arka plan grid çizgileri */}
                <line x1="0" y1="30" x2="700" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1="0" y1="70" x2="700" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1="0" y1="110" x2="700" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                {/* Alan Dolgusu & Çizgisi */}
                {(() => {
                  const maxVal = Math.max(...chartData, 1)
                  const getX = (i: number) => (i * 700) / 6
                  const getY = (val: number) => 120 - (val / maxVal) * 90
                  const pts = chartData.map((val, i) => ({ x: getX(i), y: getY(val), val }))
                  
                  // Yumuşak eğri (Catmull-Rom) oluşturmak için basit bir yaklaşım
                  const pathData = pts.map((p, i) => {
                    if (i === 0) return `M ${p.x} ${p.y}`
                    const prev = pts[i - 1]
                    const cp1x = prev.x + (p.x - prev.x) / 2
                    const cp2x = cp1x
                    return `C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`
                  }).join(' ')

                  const areaData = `${pathData} L 700 140 L 0 140 Z`
                  const days = ['6 gün önce', '5 gün önce', '4 gün önce', '3 gün önce', '2 gün önce', 'Dün', 'Bugün']

                  return (
                    <>
                      <path d={areaData} fill="url(#chartGradient)" />
                      <path d={pathData} fill="none" stroke="url(#chartStroke)" strokeWidth="3.5" strokeLinecap="round" />
                      {pts.map((pt, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="5"
                            fill="#ffffff"
                            stroke="#f97316"
                            strokeWidth="2.5"
                            className="group-hover:r-7 transition-all"
                          />
                          <text
                            x={pt.x}
                            y={pt.y - 12}
                            textAnchor={i === 0 ? "start" : i === 6 ? "end" : "middle"}
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {pt.val} işlem
                          </text>
                        </g>
                      ))}
                    </>
                  )
                })()}
              </svg>

              <div className="flex justify-between text-[11px] text-gray-400 mt-2 font-medium px-1">
                <span>6 Gün Önce</span>
                <span>5 Gün Önce</span>
                <span>4 Gün Önce</span>
                <span>3 Gün Önce</span>
                <span>2 Gün Önce</span>
                <span>Dün</span>
                <span className="text-orange-400 font-bold">Bugün</span>
              </div>
            </div>
          </div>

          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-2xl">📍</div>
                <div className="text-3xl font-extrabold text-white">{stats.totalPlaces}</div>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Toplam Mekan</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl">⏳</div>
                <div className="text-3xl font-extrabold text-amber-400">{stats.pendingCount}</div>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Bekleyen Onay</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl">👥</div>
                <div className="text-3xl font-extrabold text-emerald-400">{stats.totalUsers}</div>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Kullanıcı</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-2xl">⚠️</div>
                <div className="text-3xl font-extrabold text-rose-400">{reports.length}</div>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Aktif Rapor</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-2xl">📁</div>
                <div className="text-3xl font-extrabold text-teal-400">{closedReports.length}</div>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Kapatılan Rapor</div>
            </div>
          </div>

          {/* Hızlı İşlem Kısayolları */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <button
              onClick={() => setActiveTab('mekanlar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'mekanlar'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              📍 Mekan Onayla ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('tum_mekanlar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'tum_mekanlar'
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              🏪 Tüm Mekanlar ({stats.totalPlaces})
            </button>
            <button
              onClick={() => setActiveTab('medya')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'medya'
                  ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              📸 Medya ({stats.totalPhotos})
            </button>
            <button
              onClick={() => setActiveTab('yorumlar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'yorumlar'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              💬 Yorumlar ({stats.totalReviews})
            </button>
            <button
              onClick={() => setActiveTab('kullanicilar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'kullanicilar'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              👥 Kullanıcılar ({stats.totalUsers})
            </button>
            <button
              onClick={() => setActiveTab('sahiplik')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'sahiplik'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              🏢 Sahiplik ({ownershipRequests.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('raporlar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'raporlar'
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              ⚠️ Aktif Raporlar ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab('kapatilan_raporlar')}
              className={`p-3 rounded-xl text-xs font-semibold transition border ${
                activeTab === 'kapatilan_raporlar'
                  ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              📁 Kapatılan Raporlar ({closedReports.length})
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="glass-panel rounded-3xl p-5 md:p-8 border border-white/10 shadow-2xl">
            <AnimatePresence mode="wait">
              {/* TAB 1: MEKANLAR */}
              {activeTab === 'mekanlar' && (
                <motion.div key="mekanlar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Bekleyen Mekan Onayları</h3>
                      <p className="text-xs text-gray-400">Kullanıcıların eklediği ve inceleme bekleyen mekanlar</p>
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        value={searchPlaces}
                        onChange={(e) => setSearchPlaces(e.target.value)}
                        placeholder="Mekan adı veya ilçe ara..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Toplu İşlem Çubuğu */}
                  {filteredPendingPlaces.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedPendingIds.length === filteredPendingPlaces.length && filteredPendingPlaces.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPendingIds(filteredPendingPlaces.map(p => p.id))
                            } else {
                              setSelectedPendingIds([])
                            }
                          }}
                          className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20"
                        />
                        <span>Tümünü Seç ({filteredPendingPlaces.length})</span>
                      </label>

                      {selectedPendingIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={bulkApprovePending}
                            disabled={bulkLoading}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500 hover:text-white transition disabled:opacity-50"
                          >
                            ✓ Seçilenleri Onayla ({selectedPendingIds.length})
                          </button>
                          <button
                            onClick={bulkRejectPending}
                            disabled={bulkLoading}
                            className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
                          >
                            ✗ Seçilenleri Reddet ({selectedPendingIds.length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {filteredPendingPlaces.length > 0 ? (
                    filteredPendingPlaces.map((place) => (
                      <div key={place.id} className="border border-white/10 rounded-2xl bg-white/[0.03] overflow-hidden transition hover:border-white/20">
                        <div className="flex items-center p-5 hover:bg-white/5 transition text-left gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPendingIds.includes(place.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPendingIds(prev => [...prev, place.id])
                              } else {
                                setSelectedPendingIds(prev => prev.filter(id => id !== place.id))
                              }
                            }}
                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20 shrink-0"
                          />
                          <button
                            onClick={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-lg text-white flex items-center gap-2">
                                <span>📍</span> {place.name}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-3">
                                <span>🏙️ {place.district}</span>
                                <span>•</span>
                                <span>📅 {new Date(place.created_at).toLocaleDateString('tr-TR')}</span>
                                <span>•</span>
                                <span className="text-amber-400 font-medium">Onay Bekliyor</span>
                              </div>
                            </div>
                            <span className={`transform transition-transform text-gray-400 ${expandedPlaceId === place.id ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        </div>

                        <AnimatePresence>
                          {expandedPlaceId === place.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-white/10 bg-black/20"
                            >
                              <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Kategori</div>
                                    <div className="text-sm font-semibold text-gray-200 mt-0.5">{getCategoryName(place.category_id)}</div>
                                  </div>
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Fiyat Aralığı</div>
                                    <div className="text-sm font-semibold text-gray-200 mt-0.5">{formatPrice(place.price_range)}</div>
                                  </div>
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Ekleyen User ID</div>
                                    <div className="text-xs font-mono text-gray-300 mt-0.5 truncate">{place.user_id || 'Anonim'}</div>
                                  </div>
                                </div>

                                {place.description && (
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400 mb-1">Açıklama</div>
                                    <p className="text-sm text-gray-200">{place.description}</p>
                                  </div>
                                )}

                                {place.address && (
                                  <div className="text-sm text-gray-300">
                                    📍 <strong>Adres:</strong> {place.address}
                                  </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                  <button
                                    onClick={() => approvePlace(place.id)}
                                    className="px-6 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-sm font-semibold hover:bg-emerald-500/30 transition flex items-center gap-2"
                                  >
                                    ✓ Onayla & Yayına Al
                                  </button>
                                  <button
                                    onClick={() => rejectPlace(place.id)}
                                    className="px-6 py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-sm font-semibold hover:bg-rose-500/30 transition flex items-center gap-2"
                                  >
                                    ✗ Reddet
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">🎉</div>
                      <h4 className="text-lg font-bold text-gray-200">Bekleyen Mekan Yok</h4>
                      <p className="text-sm text-gray-400 mt-1">Tüm mekan onayları incelendi ve güncel.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* YENİ EKLENEN TAB: TÜM MEKANLAR */}
              {activeTab === 'tum_mekanlar' && (
                <motion.div key="tum_mekanlar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Tüm Mekanlar</h3>
                      <p className="text-xs text-gray-400">Sistemde kayıtlı olan tüm mekanların listesi</p>
                    </div>
                  </div>

                  {allPlaces.length > 0 ? (
                    allPlaces.map((place) => (
                      <div key={place.id} className="border border-white/10 rounded-2xl bg-white/[0.03] overflow-hidden transition hover:border-white/20">
                        <div className="flex items-center p-5 hover:bg-white/5 transition text-left gap-3">
                          <button
                            onClick={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-lg text-white flex items-center gap-2">
                                <span>🏪</span> {place.name}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-3">
                                <span>🏙️ {place.district || 'Belirtilmemiş'}</span>
                                <span>•</span>
                                <span>📅 {new Date(place.created_at).toLocaleDateString('tr-TR')}</span>
                                <span>•</span>
                                <span className={`font-medium ${place.status === 'approved' ? 'text-emerald-400' : place.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
                                  {place.status === 'approved' ? 'Onaylı' : place.status === 'rejected' ? 'Reddedilmiş' : 'Bekliyor'}
                                </span>
                              </div>
                            </div>
                            <span className={`transform transition-transform text-gray-400 ${expandedPlaceId === place.id ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        </div>

                        <AnimatePresence>
                          {expandedPlaceId === place.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-white/10 bg-black/20"
                            >
                              <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Kategori</div>
                                    <div className="text-sm font-semibold text-gray-200 mt-0.5">{getCategoryName(place.category_id)}</div>
                                  </div>
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Fiyat Aralığı</div>
                                    <div className="text-sm font-semibold text-gray-200 mt-0.5">{formatPrice(place.price_range)}</div>
                                  </div>
                                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400">Ekleyen User ID</div>
                                    <div className="text-xs font-mono text-gray-300 mt-0.5 truncate">{place.user_id || 'Anonim'}</div>
                                  </div>
                                </div>

                                {place.description && (
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="text-xs text-gray-400 mb-1">Açıklama</div>
                                    <p className="text-sm text-gray-200">{place.description}</p>
                                  </div>
                                )}

                                {place.address && (
                                  <div className="text-sm text-gray-300">
                                    📍 <strong>Adres:</strong> {place.address}
                                  </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                  <button
                                    onClick={() => deletePlace(place.id)}
                                    className="px-6 py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-sm font-semibold hover:bg-rose-500/30 transition flex items-center gap-2"
                                  >
                                    🗑️ Mekanı Sil
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">📭</div>
                      <h4 className="text-lg font-bold text-gray-200">Kayıtlı Mekan Yok</h4>
                      <p className="text-sm text-gray-400 mt-1">Sistemde henüz hiç mekan bulunmuyor.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB: MEDYA DENETİMİ */}
              {activeTab === 'medya' && (
                <motion.div key="medya" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Medya Denetimi</h3>
                      <p className="text-xs text-gray-400">Kullanıcılar tarafından yüklenen son mekan fotoğrafları</p>
                    </div>
                    {selectedPhotoIds.length > 0 && (
                      <button
                        onClick={bulkDeletePhotos}
                        disabled={bulkLoading}
                        className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl text-sm font-bold border border-rose-500/30 hover:bg-rose-500/30 transition flex items-center gap-2"
                      >
                        {bulkLoading ? <span className="animate-spin">⌛</span> : '🗑️'} Seçilenleri Sil ({selectedPhotoIds.length})
                      </button>
                    )}
                  </div>

                  {allPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {allPhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-square">
                          <img src={photo.url} alt={photo.caption || 'Mekan fotoğrafı'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                          
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedPhotoIds.includes(photo.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPhotoIds(prev => [...prev, photo.id])
                                else setSelectedPhotoIds(prev => prev.filter(id => id !== photo.id))
                              }}
                              className="w-5 h-5 rounded bg-black/50 border-white/20 text-pink-500 focus:ring-pink-500/50 cursor-pointer"
                            />
                          </div>

                          <button
                            onClick={() => deletePhoto(photo.id)}
                            className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rose-500 hover:scale-110"
                          >
                            🗑️
                          </button>

                          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition duration-300 z-10">
                            <div className="text-xs font-semibold text-white truncate drop-shadow-md">
                              {photo.places?.name || 'Bilinmeyen Mekan'}
                            </div>
                            <div className="text-[10px] text-gray-300 truncate drop-shadow-md">
                              👤 @{photo.profiles?.username || 'Anonim'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 glass-card rounded-3xl border border-white/5">
                      <div className="text-5xl mb-3">📸</div>
                      <h4 className="text-lg font-bold text-gray-200">Hiç Fotoğraf Yok</h4>
                      <p className="text-sm text-gray-400 mt-1">Sistemde henüz yüklenmiş bir mekan fotoğrafı bulunmuyor.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: YORUMLAR */}
              {activeTab === 'yorumlar' && (
                <motion.div key="yorumlar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Yorum Yönetimi</h3>
                      <p className="text-xs text-gray-400">Kullanıcıların yaptığı en son yorumlar</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                      {allReviews.length} Yorum
                    </span>
                  </div>

                  {/* Toplu Yorum Silme Çubuğu */}
                  {allReviews.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedReviewIds.length === allReviews.length && allReviews.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReviewIds(allReviews.map(r => r.id))
                            } else {
                              setSelectedReviewIds([])
                            }
                          }}
                          className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20"
                        />
                        <span>Tümünü Seç ({allReviews.length})</span>
                      </label>

                      {selectedReviewIds.length > 0 && (
                        <button
                          onClick={bulkDeleteReviews}
                          disabled={bulkLoading}
                          className="px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500 hover:text-white transition disabled:opacity-50"
                        >
                          🗑️ Seçilen Yorumları Sil ({selectedReviewIds.length})
                        </button>
                      )}
                    </div>
                  )}

                  {allReviews.length > 0 ? (
                    allReviews.map((review) => (
                      <div key={review.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.03] hover:bg-white/[0.06] transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedReviewIds.includes(review.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReviewIds(prev => [...prev, review.id])
                              } else {
                                setSelectedReviewIds(prev => prev.filter(id => id !== review.id))
                              }
                            }}
                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20 mt-1 shrink-0"
                          />
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                                ⭐ {review.rating} Puan
                              </span>
                              <span className="text-xs text-gray-400">
                                📅 {new Date(review.created_at).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-200 font-medium leading-relaxed">{review.comment}</p>
                            <div className="text-xs font-mono text-gray-500">
                              User: {review.user_id?.slice(0, 10)}... • Place: {review.place_id?.slice(0, 10)}...
                            </div>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => deleteReview(review.id)}
                            className="px-4 py-2 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/25 transition"
                          >
                            🗑️ Yorumu Sil
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">💬</div>
                      <p className="text-gray-400">Kayıtlı yorum bulunamadı.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: KULLANICILAR */}
              {activeTab === 'kullanicilar' && (
                <motion.div key="kullanicilar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Kullanıcı Yönetimi</h3>
                      <p className="text-xs text-gray-400">Kayıtlı profiller ve ceza durumları</p>
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        placeholder="Kullanıcı adı veya ID ara..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                            <th className="p-4 font-semibold">Kullanıcı</th>
                            <th className="p-4 font-semibold">Yorum Sayısı</th>
                            <th className="p-4 font-semibold">Kayıt Tarihi</th>
                            <th className="p-4 font-semibold">Yetki</th>
                            <th className="p-4 font-semibold">Durum</th>
                            <th className="p-4 font-semibold text-right">Kayıt Silme</th>
                            <th className="p-4 font-semibold text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.map((profile) => (
                            <tr key={profile.id} className="hover:bg-white/[0.03] transition">
                              <td className="p-4 font-medium text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-300 font-bold flex items-center justify-center text-xs">
                                    {(profile.username?.[0] || 'K').toUpperCase()}
                                  </div>
                                  <span>{profile.username || 'Anonim'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-gray-300">{profile.total_reviews || 0}</td>
                              <td className="p-4 text-gray-400">{new Date(profile.created_at).toLocaleDateString('tr-TR')}</td>
                              <td className="p-4">
                                {profile.is_admin ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">Admin</span>
                                ) : (
                                  <span className="text-gray-500 text-xs">Üye</span>
                                )}
                              </td>
                              <td className="p-4">
                                {profile.is_banned ? (
                                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold">Engelli</span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">Aktif</span>
                                )}
                              </td>
                              <td className='p-4 text-right'>
                                <button
                                className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition"
                                onClick={()=>handleDeleteUser(profile.id)}
                                disabled={deletingUserId === profile.id}
                                >
                                  {deletingUserId === profile.id ? 'Siliniyor...' : '🗑️ Profili Sil'}
                                </button>
                              </td>
                              <td className="p-6 text-right">
                                {profile.is_banned ? (
                                  <button
                                    onClick={() => unbanUser(profile.id)}
                                    className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition"
                                  >
                                    Banı Kaldır
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => banUser(profile.id)}
                                    className="px-4.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition"
                                  >
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
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">👥</div>
                      <p className="text-gray-400">Kullanıcı bulunamadı.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: SAHİPLİK TALEPLERİ */}
              {activeTab === 'sahiplik' && (
                <motion.div key="sahiplik" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Mekan Sahiplik Talepleri</h3>
                      <p className="text-xs text-gray-400">İşletme sahiplerinin mekan sahiplenme başvuruları</p>
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        value={searchOwnership}
                        onChange={(e) => setSearchOwnership(e.target.value)}
                        placeholder="Mekan veya kullanıcı ara..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {filteredOwnershipRequests.length > 0 ? (
                    filteredOwnershipRequests.map((request) => {
                      const placeName = Array.isArray(request.places) ? request.places[0]?.name : request.places?.name
                      const userName = Array.isArray(request.profiles) ? request.profiles[0]?.username : request.profiles?.username
                      return (
                        <div key={request.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.03]">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <p className="font-bold text-lg text-white">🏢 {placeName || 'Bilinmeyen Mekan'}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Başvuran: <span className="text-primary-300 font-semibold">{userName || 'Anonim'}</span> • {new Date(request.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div>
                              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                                request.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : request.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {request.status === 'pending' ? 'Bekliyor' : request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                              </span>
                            </div>
                          </div>

                          {request.message && (
                            <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300">
                              💬 <em>"{request.message}"</em>
                            </div>
                          )}

                          {request.status === 'pending' && (
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => approveOwnership(request.id)}
                                className="px-5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition"
                              >
                                ✓ Talebi Onayla
                              </button>
                              <button
                                onClick={() => rejectOwnership(request.id)}
                                className="px-5 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition"
                              >
                                ✗ Reddet
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">🏢</div>
                      <p className="text-gray-400">Sahiplik talebi bulunamadı.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 5: AKTİF RAPORLAR */}
              {activeTab === 'raporlar' && (
                <motion.div key="raporlar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-rose-400">⚠️</span> Aktif Şikayet Raporları
                      </h3>
                      <p className="text-xs text-gray-400">İnceleme ve müdahale bekleyen açık şikayetler</p>
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        value={searchReports}
                        onChange={(e) => setSearchReports(e.target.value)}
                        placeholder="Rapor ID, sebep veya tip ara..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Kategori Filtre Butonları */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Tüm Raporlar' },
                      { id: 'place', label: '📍 Mekan Raporları' },
                      { id: 'review', label: '💬 Yorum Raporları' },
                      { id: 'user', label: '👤 Kullanıcı Raporları' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setReportTypeFilter(f.id as any)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                          reportTypeFilter === f.id
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Toplu Rapor Kapatma Çubuğu */}
                  {filteredReports.length > 0 && (
                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer font-semibold">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.length === filteredReports.length && filteredReports.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReportIds(filteredReports.map(r => r.id))
                            } else {
                              setSelectedReportIds([])
                            }
                          }}
                          className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20"
                        />
                        <span>Tümünü Seç ({filteredReports.length})</span>
                      </label>

                      {selectedReportIds.length > 0 && (
                        <button
                          onClick={bulkCloseReports}
                          disabled={bulkLoading}
                          className="px-3.5 py-1.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold hover:bg-teal-500 hover:text-white transition disabled:opacity-50"
                        >
                          📁 Seçilen Raporları Kapat ({selectedReportIds.length})
                        </button>
                      )}
                    </div>
                  )}

                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => {
                      const reportedUser = allProfiles.find(p => p.id === report.reported_user_id)
                      return (
                        <div key={report.id} className="border border-rose-500/20 rounded-2xl p-5 bg-gradient-to-br from-rose-950/20 to-slate-900/60 shadow-lg">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={selectedReportIds.includes(report.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedReportIds(prev => [...prev, report.id])
                                  } else {
                                    setSelectedReportIds(prev => prev.filter(id => id !== report.id))
                                  }
                                }}
                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4 bg-slate-900 border-white/20 shrink-0"
                              />
                              <span className="text-xs px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                {report.report_type === 'place' ? '📍 Mekan' : report.report_type === 'review' ? '💬 Yorum' : '👤 Kullanıcı'}
                              </span>
                              <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                ID: {report.id?.slice(0, 8)}
                              </span>
                              <span className="text-xs text-gray-400">
                                🕒 {new Date(report.created_at || Date.now()).toLocaleDateString('tr-TR')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {report.report_type === 'user' && report.reported_user_id && (
                                <button
                                  onClick={() => {
                                    banUser(report.reported_user_id)
                                    closeReport(report.id)
                                  }}
                                  className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-semibold hover:bg-rose-500/30 transition"
                                >
                                  ⛔ Kullanıcıyı Banla
                                </button>
                              )}
                              <button
                                onClick={() => closeReport(report.id)}
                                className="px-4 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
                              >
                                📁 Raporu Kapat & Arşivle
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 p-3.5 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 mb-1">Şikayet Nedeni:</div>
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
                              <span>Hedef Kullanıcı: <strong className="text-primary-300 font-semibold">{reportedUser?.username || 'Bilinmeyen'}</strong> ({report.reported_user_id})</span>
                            )}
                            {report.user_id && (
                              <span>Şikayet Eden ID: <span className="font-mono text-gray-400">{report.user_id}</span></span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">✅</div>
                      <h4 className="text-lg font-bold text-gray-200">Aktif Şikayet Yok</h4>
                      <p className="text-sm text-gray-400 mt-1">İncelenmesi gereken açık rapor bulunmuyor.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 6: KAPATILAN RAPORLAR (YENİ EKLENEN SEKME) */}
              {activeTab === 'kapatilan_raporlar' && (
                <motion.div key="kapatilan_raporlar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-teal-400">📁</span> Kapatılan & Arşivlenen Raporlar
                      </h3>
                      <p className="text-xs text-gray-400">Daha önce incelenip çözümlenen rapor geçmişi</p>
                    </div>
                    <div className="w-full sm:w-72">
                      <input
                        type="text"
                        value={searchClosedReports}
                        onChange={(e) => setSearchClosedReports(e.target.value)}
                        placeholder="Kapatılan raporlarda ara..."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Kategori Filtre Butonları */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Tüm Kapatılanlar' },
                      { id: 'place', label: '📍 Mekan Raporları' },
                      { id: 'review', label: '💬 Yorum Raporları' },
                      { id: 'user', label: '👤 Kullanıcı Raporları' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setClosedReportTypeFilter(f.id as any)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                          closedReportTypeFilter === f.id
                            ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {filteredClosedReports.length > 0 ? (
                    filteredClosedReports.map((report) => {
                      const reportedUser = allProfiles.find(p => p.id === report.reported_user_id)
                      return (
                        <div key={report.id} className="border border-white/10 rounded-2xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold">
                                {report.report_type === 'place' ? '📍 Mekan' : report.report_type === 'review' ? '💬 Yorum' : '👤 Kullanıcı'}
                              </span>
                              <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                                ID: {report.id?.slice(0, 8)}
                              </span>
                              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                ✓ Kapatıldı
                              </span>
                              {report.closed_at && (
                                <span className="text-xs text-gray-400">
                                  • {new Date(report.closed_at).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => reopenReport(report.id)}
                                className="px-3.5 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold hover:bg-amber-500/25 transition flex items-center gap-1"
                              >
                                🔄 Geri Aç
                              </button>
                              <button
                                onClick={() => deleteReportPermanently(report.id)}
                                className="px-3.5 py-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full text-xs font-semibold hover:bg-rose-500/25 transition"
                              >
                                🗑️ Kalıcı Sil
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 p-3.5 bg-black/20 rounded-xl border border-white/5">
                            <div className="text-xs text-gray-400 mb-1">Şikayet Nedeni:</div>
                            <p className="text-sm text-gray-300">"{report.reason}"</p>
                          </div>

                          <div className="text-xs text-gray-500 mt-3 flex flex-wrap gap-4 font-mono">
                            {report.report_type === 'place' && report.place_id && `Mekan ID: ${report.place_id}`}
                            {report.report_type === 'review' && report.review_id && `Yorum ID: ${report.review_id}`}
                            {report.report_type === 'user' && report.reported_user_id && `Kullanıcı: ${reportedUser?.username || 'Bilinmeyen'} (${report.reported_user_id})`}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-3">📁</div>
                      <h4 className="text-lg font-bold text-gray-200">Kapatılan Rapor Yok</h4>
                      <p className="text-sm text-gray-400 mt-1">Henüz kapatılmış veya arşivlenmiş bir şikayet bulunmuyor.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}