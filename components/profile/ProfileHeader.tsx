'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import EditProfileModal from '@/components/profile/EditProfileModal'
import FollowButton from '@/components/profile/FollowButton'
import ReportModal from '@/components/report/ReportModal'

interface ProfileHeaderProps {
  userId: string
  username: string
  bio: string
  avatarUrl: string | null
  totalFollowers: number
  totalFollowing: number
  isOwnProfile: boolean
  currentUserId: string | null
  initialFollowing: boolean
  instagram: string | null
  twitter: string | null
  tiktok: string | null
  website: string | null
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '')
}

function getSafeWebsiteUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withProtocol)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export default function ProfileHeader({
  userId,
  username,
  bio,
  avatarUrl,
  totalFollowers,
  totalFollowing,
  isOwnProfile,
  currentUserId,
  initialFollowing,
  instagram,
  twitter,
  tiktok,
  website,
}: ProfileHeaderProps) {
  const [followersCount, setFollowersCount] = useState(totalFollowers)
  const [followingCount, setFollowingCount] = useState(totalFollowing)
  const [isFollowing, setIsFollowing] = useState(initialFollowing)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setFollowersCount(totalFollowers)
    setFollowingCount(totalFollowing)
    setIsFollowing(initialFollowing)
  }, [totalFollowers, totalFollowing, initialFollowing])

  useEffect(() => {
    const channel = supabase
      .channel(`profile-header-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as { total_followers?: number; total_following?: number }
          if (typeof updated.total_followers === 'number') {
            setFollowersCount(updated.total_followers)
          }
          if (typeof updated.total_following === 'number') {
            setFollowingCount(updated.total_following)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const handleFollowChange = (newFollowing: boolean) => {
    setIsFollowing(newFollowing)
    setFollowersCount((prev) => (newFollowing ? prev + 1 : Math.max(prev - 1, 0)))
  }

  const safeWebsite = website ? getSafeWebsiteUrl(website) : null
  const igHandle = instagram ? normalizeHandle(instagram) : ''
  const twHandle = twitter ? normalizeHandle(twitter) : ''
  const ttHandle = tiktok ? normalizeHandle(tiktok) : ''

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-3xl text-white font-bold overflow-hidden shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username || 'Profil avatarı'}
            className="w-full h-full object-cover"
          />
        ) : (
          (username?.[0] || 'K').toUpperCase()
        )}
      </div>

      <div className="text-center md:text-left flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-100 truncate">{username || 'Kullanıcı'}</h1>
        <p className="text-gray-400 mt-1">{bio || 'Henüz biyografi eklenmemiş.'}</p>

        <div className="flex gap-4 mt-2.5 justify-center md:justify-start">
          <span className="text-sm text-gray-300">
            <strong className="text-gray-100">{followersCount}</strong> Takipçi
          </span>
          <span className="text-sm text-gray-300">
            <strong className="text-gray-100">{followingCount}</strong> Takip
          </span>
        </div>

        {(igHandle || twHandle || ttHandle || safeWebsite) && (
          <div className="flex gap-3 mt-3 justify-center md:justify-start">
            {igHandle && (
              <a
                href={`https://instagram.com/${encodeURIComponent(igHandle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl hover:scale-110 transition"
                title="Instagram"
              >
                📸
              </a>
            )}
            {twHandle && (
              <a
                href={`https://x.com/${encodeURIComponent(twHandle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl hover:scale-110 transition"
                title="X (Twitter)"
              >
                🐦
              </a>
            )}
            {ttHandle && (
              <a
                href={`https://tiktok.com/@${encodeURIComponent(ttHandle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl hover:scale-110 transition"
                title="TikTok"
              >
                🎵
              </a>
            )}
            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl hover:scale-110 transition"
                title="Web Sitesi"
              >
                🌐
              </a>
            )}
          </div>
        )}
      </div>

      {isOwnProfile ? (
        <EditProfileModal
          userId={userId}
          initialUsername={username}
          initialBio={bio}
          initialAvatarUrl={avatarUrl}
          initialInstagram={instagram}
          initialTwitter={twitter}
          initialTiktok={tiktok}
          initialWebsite={website}
        />
      ) : (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center justify-center md:justify-end">
          <FollowButton
            targetUserId={userId}
            currentUserId={currentUserId}
            initialFollowing={initialFollowing}
            onFollowChange={handleFollowChange}
          />
          {isFollowing && (
            <Link
              href={`/mesajlar/${userId}`}
              className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition border border-blue-500 text-sm font-medium text-center"
            >
              💬 Mesaj Gönder
            </Link>
          )}
          {currentUserId && <ReportModal targetType="user" targetId={userId} />}
        </div>
      )}
    </div>
  )
}