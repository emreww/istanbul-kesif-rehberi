'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
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
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`profile-header-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.id === userId) {
            setFollowersCount(payload.new.total_followers || 0)
            setFollowingCount(payload.new.total_following || 0)
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

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8 mb-8 flex flex-col md:flex-row items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-3xl text-white font-bold overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profil avatarı" className="w-full h-full object-cover" />
        ) : (
          (username?.[0] || 'K').toUpperCase()
        )}
      </div>
      <div className="text-center md:text-left flex-1">
        <h1 className="text-2xl font-bold text-gray-100">{username || 'Kullanıcı'}</h1>
        <p className="text-gray-400">{bio || 'Henüz biyografi eklenmemiş.'}</p>

        <div className="flex gap-4 mt-2 justify-center md:justify-start">
          <span className="text-sm text-gray-300">
            <strong className="text-gray-100">{followersCount}</strong> Takipçi
          </span>
          <span className="text-sm text-gray-300">
            <strong className="text-gray-100">{followingCount}</strong> Takip
          </span>
        </div>

        {/* Sosyal linkler */}
        <div className="flex gap-3 mt-3 justify-center md:justify-start">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl hover:scale-110 transition"
              title="Instagram"
            >
              📸
            </a>
          )}
          {twitter && (
            <a
              href={`https://twitter.com/${twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl hover:scale-110 transition"
              title="Twitter"
            >
              🐦
            </a>
          )}
          {tiktok && (
            <a
              href={`https://tiktok.com/@${tiktok}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl hover:scale-110 transition"
              title="TikTok"
            >
              🎵
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl hover:scale-110 transition"
              title="Web Sitesi"
            >
              🌐
            </a>
          )}
        </div>
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
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <FollowButton
            targetUserId={userId}
            currentUserId={currentUserId}
            initialFollowing={initialFollowing}
            onFollowChange={handleFollowChange}
          />
          {isFollowing && (
            <Link
              href={`/mesajlar/${userId}`}
              className="px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition border border-blue-500 text-center"
            >
              💬 Mesaj Gönder
            </Link>
          )}
          <ReportModal targetType="user" targetId={userId} />
        </div>
      )}
    </div>
  )
}