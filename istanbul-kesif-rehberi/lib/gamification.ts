// Oyunlaştırma: Seviye ve XP sistemi
// Kullanıcıların aksiyonlarından XP kazanması ve seviye atlaması

export interface LevelInfo {
  level: number
  title: string
  icon: string
  minXP: number
  maxXP: number
  color: string
}

export const LEVELS: LevelInfo[] = [
  { level: 1,  title: 'Yeni Kaşif',         icon: '🌱', minXP: 0,    maxXP: 49,    color: 'text-gray-400' },
  { level: 2,  title: 'Meraklı Gezgin',      icon: '🚶', minXP: 50,   maxXP: 149,   color: 'text-green-400' },
  { level: 3,  title: 'Sokak Kaşifi',        icon: '🧭', minXP: 150,  maxXP: 349,   color: 'text-blue-400' },
  { level: 4,  title: 'İlçe Uzmanı',         icon: '🗺️', minXP: 350,  maxXP: 599,   color: 'text-cyan-400' },
  { level: 5,  title: 'Şehir Rehberi',        icon: '⭐', minXP: 600,  maxXP: 999,   color: 'text-yellow-400' },
  { level: 6,  title: 'Kültür Elçisi',        icon: '🏛️', minXP: 1000, maxXP: 1499,  color: 'text-amber-400' },
  { level: 7,  title: 'Efsane Kaşif',         icon: '🔥', minXP: 1500, maxXP: 2499,  color: 'text-orange-400' },
  { level: 8,  title: 'İstanbul Gurusu',      icon: '👑', minXP: 2500, maxXP: 3999,  color: 'text-purple-400' },
  { level: 9,  title: 'Boğaz Efsanesi',       icon: '💎', minXP: 4000, maxXP: 5999,  color: 'text-indigo-400' },
  { level: 10, title: 'İstanbul Efsanesi',    icon: '🏆', minXP: 6000, maxXP: Infinity, color: 'text-rose-400' },
]

// XP kazanma kuralları
export const XP_RULES = {
  review:     15, // Yorum yazmak
  photo:      10, // Fotoğraf yüklemek
  favorite:    5, // Favori eklemek
  addPlace:   25, // Yeni mekan eklemek
  firstReview: 5, // Bonus: İlk yorum
  rating:      3, // Puanlama yapmak
}

// Toplam XP hesapla (profildeki istatistiklerden)
export function calculateXP(stats: {
  totalReviews: number
  totalPhotos: number
  totalFavorites: number
  totalRatings: number
}): number {
  return (
    stats.totalReviews * XP_RULES.review +
    stats.totalPhotos * XP_RULES.photo +
    stats.totalFavorites * XP_RULES.favorite +
    stats.totalRatings * XP_RULES.rating
  )
}

// XP'den seviye bilgisi al
export function getLevelFromXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

// Bir sonraki seviyeye ilerleme yüzdesi
export function getProgressToNextLevel(xp: number): number {
  const current = getLevelFromXP(xp)
  if (current.level === LEVELS.length) return 100 // Max seviye

  const nextLevel = LEVELS[current.level] // level is 1-indexed, array is 0-indexed
  const xpInLevel = xp - current.minXP
  const xpNeeded = nextLevel.minXP - current.minXP
  return Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
}

// Sonraki seviyeye kalan XP
export function getXPToNextLevel(xp: number): number {
  const current = getLevelFromXP(xp)
  if (current.level === LEVELS.length) return 0

  const nextLevel = LEVELS[current.level]
  return nextLevel.minXP - xp
}
