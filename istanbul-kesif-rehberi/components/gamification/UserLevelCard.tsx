'use client'
import { calculateXP, getLevelFromXP, getProgressToNextLevel, getXPToNextLevel, LEVELS, XP_RULES } from '@/lib/gamification'
import { motion } from 'framer-motion'

interface UserLevelCardProps {
  totalReviews: number
  totalPhotos: number
  totalFavorites: number
  totalRatings: number
  compact?: boolean
}

export default function UserLevelCard({
  totalReviews,
  totalPhotos,
  totalFavorites,
  totalRatings,
  compact = false,
}: UserLevelCardProps) {
  const xp = calculateXP({ totalReviews, totalPhotos, totalFavorites, totalRatings })
  const level = getLevelFromXP(xp)
  const progress = getProgressToNextLevel(xp)
  const xpToNext = getXPToNextLevel(xp)
  const isMaxLevel = level.level === LEVELS.length

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{level.icon}</span>
        <div>
          <span className={`text-xs font-bold ${level.color}`}>Lv.{level.level}</span>
          <span className="text-xs text-gray-400 ml-1">{level.title}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center text-3xl">
          {level.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-black ${level.color}`}>Seviye {level.level}</span>
          </div>
          <div className="text-sm font-semibold text-gray-300">{level.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{xp} XP</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>İlerleme</span>
          <span>
            {isMaxLevel ? 'Maksimum Seviye! 🎉' : `Sonraki seviyeye ${xpToNext} XP`}
          </span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-3 border border-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div className="text-xs text-gray-500">Yorumlar</div>
          <div className="text-sm font-bold text-gray-200">
            {totalReviews} × {XP_RULES.review} = <span className="text-primary-400">{totalReviews * XP_RULES.review} XP</span>
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div className="text-xs text-gray-500">Fotoğraflar</div>
          <div className="text-sm font-bold text-gray-200">
            {totalPhotos} × {XP_RULES.photo} = <span className="text-primary-400">{totalPhotos * XP_RULES.photo} XP</span>
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div className="text-xs text-gray-500">Favoriler</div>
          <div className="text-sm font-bold text-gray-200">
            {totalFavorites} × {XP_RULES.favorite} = <span className="text-primary-400">{totalFavorites * XP_RULES.favorite} XP</span>
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div className="text-xs text-gray-500">Puanlamalar</div>
          <div className="text-sm font-bold text-gray-200">
            {totalRatings} × {XP_RULES.rating} = <span className="text-primary-400">{totalRatings * XP_RULES.rating} XP</span>
          </div>
        </div>
      </div>

      {/* All Levels Preview */}
      <div className="mt-5 pt-4 border-t border-white/5">
        <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Tüm Seviyeler</div>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <div
              key={l.level}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                l.level <= level.level
                  ? 'bg-primary-500/15 border-primary-500/30 text-primary-300'
                  : l.level === level.level + 1
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300/60 animate-pulse'
                  : 'bg-white/[0.02] border-white/5 text-gray-500'
              }`}
            >
              <span>{l.icon}</span> {l.level}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
