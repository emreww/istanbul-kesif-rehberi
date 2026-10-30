'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useNotificationStore } from '@/store/notifications'
import ReportModal from '@/components/report/ReportModal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Review {
  id: string
  rating: number
  comment: string
  like_count: number
  created_at: string
  user_id: string | null
  profiles?: any
  review_photos?: any[]
}

interface Reply {
  id: string
  review_id: string
  comment: string
  created_at: string
  user_id: string
  like_count: number
  profiles?: any
  review_reply_photos?: any[]
}

export default function ReviewSection({ placeId }: { placeId: string }) {
  const [activeTab, setActiveTab] = useState<'site' | 'google'>('site')
  const [reviews, setReviews] = useState<Review[]>([])
  const [repliesByReview, setRepliesByReview] = useState<{ [key: string]: Reply[] }>({})
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({})
  const [showReplyInput, setShowReplyInput] = useState<{ [key: string]: boolean }>({})
  const [replyPhotoFile, setReplyPhotoFile] = useState<{ [key: string]: File | null }>({})
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState('')
  const [editingRating, setEditingRating] = useState(0)
  const [editingHoverRating, setEditingHoverRating] = useState(0)

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editingReplyComment, setEditingReplyComment] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<any>(null)
  const { addNotification } = useNotificationStore()

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, like_count, created_at, user_id,
        profiles ( username, avatar_url, total_reviews ),
        review_photos ( id, url, caption )
      `)
      .eq('place_id', placeId)

    if (data) {
      const sorted = [...data].sort((a, b) => {
        const aUser = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
        const bUser = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
        const aTotal = aUser?.total_reviews || 0
        const bTotal = bUser?.total_reviews || 0
        if (bTotal !== aTotal) return bTotal - aTotal
        if ((b.like_count || 0) !== (a.like_count || 0)) return (b.like_count || 0) - (a.like_count || 0)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setReviews(sorted)

      const reviewIds = sorted.map(r => r.id)
      if (reviewIds.length > 0) {
        const { data: repliesData } = await supabase
          .from('review_replies')
          .select(`
            id, review_id, comment, created_at, user_id, like_count,
            profiles ( username, avatar_url ),
            review_reply_photos ( id, url, caption )
          `)
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })

        const repliesMap: { [key: string]: Reply[] } = {}
        ;(repliesData ?? []).forEach((reply: any) => {
          if (!repliesMap[reply.review_id]) repliesMap[reply.review_id] = []
          repliesMap[reply.review_id].push(reply)
        })
        setRepliesByReview(repliesMap)
      } else {
        setRepliesByReview({})
      }
    }
  }, [supabase, placeId])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)
      await fetchReviews()

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      const channel = supabase
        .channel(`reviews-${placeId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reviews', filter: `place_id=eq.${placeId}` },
          () => { fetchReviews() }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'review_replies' },
          () => { fetchReviews() }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'review_photos' },
          () => { fetchReviews() }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'review_reply_likes' },
          () => { fetchReviews() }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'review_reply_photos' },
          () => { fetchReviews() }
        )

      channel.subscribe()
      channelRef.current = channel

      return () => {
        supabase.removeChannel(channel)
      }
    }
    init()
  }, [placeId, supabase, fetchReviews])

  // Site yorumları: user_id dolu olanlar
  const siteReviews = useMemo(() => reviews.filter(r => r.user_id !== null), [reviews])
  // Google yorumları: user_id null olanlar
  const googleReviews = useMemo(() => reviews.filter(r => r.user_id === null), [reviews])

  const displayedReviews = activeTab === 'site' ? siteReviews : googleReviews

  if (loadingUser) {
    return <LoadingSpinner size="md" className="py-8" />
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPhotoFile(file)
  }

  const handleReplyFileChange = (reviewId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReplyPhotoFile(prev => ({ ...prev, [reviewId]: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { router.push('/giris'); return }
    if (rating === 0) { setError('Lütfen puan verin.'); return }
    if (comment.trim().length < 10) { setError('Yorum en az 10 karakter olmalı.'); return }

    setLoading(true)
    setError('')

    const { error: insertError, data: newReview } = await supabase
      .from('reviews')
      .insert({
        place_id: placeId,
        user_id: user.id,
        rating,
        comment: comment.trim(),
      })
      .select('id')
      .single()

    if (insertError || !newReview) {
      setError(insertError?.message || 'Yorum eklenemedi.')
      setLoading(false)
      return
    }

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `review-${newReview.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, photoFile)

      if (uploadError) {
        setError('Yorum eklendi ama fotoğraf yüklenemedi: ' + uploadError.message)
      } else {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          await supabase.from('review_photos').insert({
            review_id: newReview.id,
            user_id: user.id,
            url: urlData.publicUrl,
          })
        }
      }
    }

    addNotification('Yorumunuz gönderildi! 💬', 'success')
    setRating(0)
    setComment('')
    setPhotoFile(null)
    setLoading(false)
    await fetchReviews()
  }

  const handleLike = async (reviewId: string) => {
    if (!user) { router.push('/giris'); return }

    const targetReview = reviews.find(r => r.id === reviewId)
    if (targetReview && targetReview.user_id === user.id) {
      setError('Kendi yorumunu beğenemezsin.')
      setTimeout(() => setError(''), 3000)
      return
    }

    const { data: existingLike } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle()

    let liked = false
    if (existingLike) {
      await supabase.from('review_likes').delete().eq('id', existingLike.id)
    } else {
      await supabase.from('review_likes').insert({ review_id: reviewId, user_id: user.id })
      liked = true
    }

    if (liked) addNotification('Beğendin 👍', 'success')

    if (liked && targetReview && targetReview.user_id) {
      const { data: updatedReview } = await supabase
        .from('reviews')
        .select('like_count')
        .eq('id', reviewId)
        .single()
      const newLikeCount = updatedReview?.like_count || 1
      await supabase.from('notifications').insert({
        user_id: targetReview.user_id,
        message: `Yorumunuz ${newLikeCount} kişi tarafından beğenildi 👍`,
        type: 'success',
        group_key: `like-${reviewId}`,
      })
    }

    await fetchReviews()
  }

  const startEditing = (review: Review) => {
    setEditingReviewId(review.id)
    setEditingComment(review.comment)
    setEditingRating(review.rating)
  }

  const cancelEditing = () => {
    setEditingReviewId(null)
    setEditingComment('')
    setEditingRating(0)
  }

  const handleUpdate = async (reviewId: string) => {
    if (editingComment.trim().length < 10) { setError('Yorum en az 10 karakter olmalı.'); return }
    if (editingRating === 0) { setError('Lütfen puan verin.'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('reviews')
      .update({ rating: editingRating, comment: editingComment.trim(), updated_at: new Date().toISOString() })
      .eq('id', reviewId)

    if (error) { setError(error.message); setLoading(false); return }

    addNotification('Yorum güncellendi ✅', 'success')
    cancelEditing()
    setLoading(false)
    await fetchReviews()
  }

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
    if (error) { setError(error.message); return }

    addNotification('Yorum silindi 🗑️', 'info')
    await fetchReviews()
  }

  const handleAddReply = async (reviewId: string) => {
    const replyText = (replyInputs[reviewId] || '').trim()
    if (!user) { router.push('/giris'); return }
    if (!replyText) return

    setLoading(true)
    setError('')

    const { error: insertError, data: newReply } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id: user.id,
        comment: replyText,
      })
      .select('id')
      .single()

    if (insertError || !newReply) {
      setError(insertError?.message || 'Yanıt eklenemedi.')
      setLoading(false)
      return
    }

    const photo = replyPhotoFile[reviewId]
    if (photo) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `reply-${newReply.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, photo)

      if (uploadError) {
        setError('Yanıt eklendi ama fotoğraf yüklenemedi: ' + uploadError.message)
      } else {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          await supabase.from('review_reply_photos').insert({
            reply_id: newReply.id,
            user_id: user.id,
            url: urlData.publicUrl,
          })
        }
      }
    }

    addNotification('Yanıtınız eklendi 💬', 'success')
    setReplyInputs(prev => ({ ...prev, [reviewId]: '' }))
    setReplyPhotoFile(prev => ({ ...prev, [reviewId]: null }))
    setShowReplyInput(prev => ({ ...prev, [reviewId]: false }))
    setLoading(false)
    await fetchReviews()
  }

  const startEditingReply = (reply: Reply) => {
    setEditingReplyId(reply.id)
    setEditingReplyComment(reply.comment)
  }

  const cancelEditingReply = () => {
    setEditingReplyId(null)
    setEditingReplyComment('')
  }

  const handleUpdateReply = async (replyId: string) => {
    if (editingReplyComment.trim().length < 1) {
      setError('Yanıt boş olamaz.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase
      .from('review_replies')
      .update({ comment: editingReplyComment.trim() })
      .eq('id', replyId)

    if (error) { setError(error.message); setLoading(false); return }

    addNotification('Yanıt güncellendi ✅', 'success')
    cancelEditingReply()
    setLoading(false)
    await fetchReviews()
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Bu yanıtı silmek istediğinize emin misiniz?')) return

    const { error } = await supabase.from('review_replies').delete().eq('id', replyId)
    if (error) { setError(error.message); return }

    addNotification('Yanıt silindi 🗑️', 'info')
    await fetchReviews()
  }

  const handleReplyLike = async (replyId: string) => {
    if (!user) { router.push('/giris'); return }

    const { data: reply } = await supabase
      .from('review_replies')
      .select('user_id')
      .eq('id', replyId)
      .single()

    if (reply && reply.user_id === user.id) {
      setError('Kendi yanıtını beğenemezsin.')
      setTimeout(() => setError(''), 3000)
      return
    }

    const { data: existingLike } = await supabase
      .from('review_reply_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      await supabase.from('review_reply_likes').delete().eq('id', existingLike.id)
    } else {
      await supabase.from('review_reply_likes').insert({ reply_id: replyId, user_id: user.id })
    }

    await fetchReviews()
  }

  return (
    <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mt-8">
      {/* Üst Başlık ve Yan Yana Sekme (Tab) Butonları */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-5 mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          💬 Yorumlar
          <span className="text-sm font-normal text-gray-400">({displayedReviews.length})</span>
        </h2>

        {/* Sekme Butonları */}
        <div className="flex p-1 bg-slate-950/70 rounded-2xl border border-white/10 backdrop-blur-md self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('site')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'site'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <span>✨</span> KeşifİST Yorumları ({siteReviews.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === 'google'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            Google Yorumları ({googleReviews.length})
          </button>
        </div>
      </div>

      {/* Yorum Yap Formu (Sadece KeşifİST Yorumları sekmesinde görünür) */}
      {activeTab === 'site' && (
        user ? (
          <form onSubmit={handleSubmit} className="mb-8 bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="font-semibold text-gray-200 mb-3">Yorum Yap</h3>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`text-2xl ${(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-400">{rating > 0 ? `${rating} yıldız` : 'Puan ver'}</span>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Deneyimini paylaş..."
              rows={3}
              className="input-field mb-3"
              required
            />

            <label htmlFor="review-file" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-full cursor-pointer hover:bg-gray-700 transition mb-3">
              📷 Fotoğraf Ekle
              <input
                id="review-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {photoFile && <span className="text-xs text-gray-400 ml-2">{photoFile.name}</span>}

            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Gönderiliyor...' : 'Yorumu Gönder'}
            </button>
          </form>
        ) : (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-300">Yorum yapmak için giriş yapmalısınız.</p>
            <a href="/giris" className="text-primary-400 hover:underline">Giriş Yap</a>
          </div>
        )
      )}

      {/* Yorum Listesi */}
      {displayedReviews.length > 0 ? (
        <div className="space-y-4">
          {displayedReviews.map(review => {
            const profile = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles
            const isOwner = user?.id === review.user_id
            const isEditing = editingReviewId === review.id
            const replies = repliesByReview[review.id] || []
            const photos = review.review_photos || []
            const isGoogleReview = review.user_id === null

            return (
              <div key={review.id} className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold shrink-0">
                    {isGoogleReview ? (
                      <span className="text-xs font-bold text-amber-300">G</span>
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (profile?.username?.[0] || 'A').toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-100 flex items-center gap-2">
                        {isGoogleReview ? (
                          <span className="text-amber-400 font-medium">Google Kullanıcısı</span>
                        ) : (
                          <Link href={`/profil/${review.user_id}`} className="hover:text-primary-400 transition">
                            {profile?.username || 'Anonim'}
                          </Link>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEditingRating(star)}
                              onMouseEnter={() => setEditingHoverRating(star)}
                              onMouseLeave={() => setEditingHoverRating(0)}
                              className={`text-2xl ${(editingHoverRating || editingRating) >= star ? 'text-yellow-400' : 'text-gray-600'}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea value={editingComment} onChange={e => setEditingComment(e.target.value)} rows={3} className="input-field" />
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(review.id)} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition text-sm">Kaydet</button>
                          <button onClick={cancelEditing} className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition text-sm">İptal</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                          ))}
                          <span className="text-xs text-gray-400 ml-2">👍 {review.like_count || 0}</span>
                        </div>
                        <p className="mt-2 text-gray-300">{review.comment}</p>

                        {photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {photos.map((photo: any) => (
                              <img key={photo.id} src={photo.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {!isGoogleReview && review.user_id !== user?.id && (
                            <button onClick={() => handleLike(review.id)} className="text-sm text-gray-400 hover:text-primary-400">👍 Beğen</button>
                          )}
                          {isOwner && (
                            <>
                              <button onClick={() => startEditing(review)} className="text-sm text-gray-400 hover:text-blue-400">✏️ Düzenle</button>
                              <button onClick={() => handleDelete(review.id)} className="text-sm text-gray-400 hover:text-red-400">🗑️ Sil</button>
                            </>
                          )}
                          {!isGoogleReview && (
                            <button onClick={() => setShowReplyInput(prev => ({ ...prev, [review.id]: !prev[review.id] }))} className="text-sm text-gray-400 hover:text-primary-400">💬 Yanıt ekle</button>
                          )}
                          <ReportModal targetType="review" targetId={review.id} />
                        </div>

                        {/* Yanıtlar */}
                        {replies.length > 0 && (
                          <div className="mt-2 pl-4 border-l border-white/10 space-y-2">
                            {replies.map((reply) => {
                              const replyProfile = Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles
                              const isReplyOwner = user?.id === reply.user_id
                              const isEditingReply = editingReplyId === reply.id
                              const replyPhotos = reply.review_reply_photos || []

                              return (
                                <div key={reply.id} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-200">{replyProfile?.username || 'Anonim'}</span>
                                    <span className="text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString('tr-TR')}</span>
                                  </div>

                                  {isEditingReply ? (
                                    <div className="mt-1 flex gap-2">
                                      <input
                                        type="text"
                                        value={editingReplyComment}
                                        onChange={(e) => setEditingReplyComment(e.target.value)}
                                        className="input-field"
                                      />
                                      <button onClick={() => handleUpdateReply(reply.id)} disabled={loading} className="text-xs px-3 py-1 bg-green-600 text-white rounded-full">Kaydet</button>
                                      <button onClick={cancelEditingReply} className="text-xs px-3 py-1 bg-gray-700 text-white rounded-full">İptal</button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-gray-300 mt-1">{reply.comment}</p>
                                      {replyPhotos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {replyPhotos.map((photo: any) => (
                                            <img key={photo.id} src={photo.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {reply.user_id !== user?.id && (
                                      <button onClick={() => handleReplyLike(reply.id)} className="text-xs text-gray-400 hover:text-primary-400">👍 {reply.like_count || 0}</button>
                                    )}
                                    {isReplyOwner && (
                                      <>
                                        <button onClick={() => startEditingReply(reply)} className="text-xs text-gray-400 hover:text-blue-400">✏️ Düzenle</button>
                                        <button onClick={() => handleDeleteReply(reply.id)} className="text-xs text-gray-400 hover:text-red-400">🗑️ Sil</button>
                                      </>
                                    )}
                                    <ReportModal targetType="review" targetId={reply.id} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Yanıt formu */}
                        {showReplyInput[review.id] && (
                          <div className="mt-2 flex flex-col gap-2">
                            <input
                              type="text"
                              value={replyInputs[review.id] || ''}
                              onChange={e => setReplyInputs(prev => ({ ...prev, [review.id]: e.target.value }))}
                              placeholder="Yanıt yaz..."
                              className="input-field"
                            />
                            <label htmlFor={`reply-file-${review.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-full cursor-pointer hover:bg-gray-700 transition">
                              📷 Fotoğraf Ekle
                              <input
                                id={`reply-file-${review.id}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleReplyFileChange(review.id, e)}
                                className="hidden"
                              />
                            </label>
                            {replyPhotoFile[review.id] && <span className="text-xs text-gray-400">{replyPhotoFile[review.id]?.name}</span>}
                            <div className="flex gap-2">
                              <button onClick={() => handleAddReply(review.id)} disabled={loading} className="text-sm px-3 py-1 bg-primary-500 text-white rounded-full">Gönder</button>
                              <button onClick={() => setShowReplyInput(prev => ({ ...prev, [review.id]: false }))} className="text-sm px-3 py-1 bg-gray-700 text-white rounded-full">İptal</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="💬"
          title={activeTab === 'site' ? "Henüz KeşifİST yorumu yapılmamış" : "Henüz Google yorumu eklenmemiş"}
          description={activeTab === 'site' ? "İlk yorumu sen yap ve deneyimini paylaş." : "Bu mekan için henüz Google Haritalar yorumu içe aktarılmadı."}
          action={
            activeTab === 'site' && !user ? (
              <a href="/giris" className="px-6 py-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition">
                Giriş Yap
              </a>
            ) : null
          }
        />
      )}
    </section>
  )
}