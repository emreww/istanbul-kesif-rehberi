import { createClient } from '@/lib/supabase/server'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import AnimatedSection from '@/components/ui/AnimatedSection'

export default async function RozetlerPage() {
  const supabase = await createClient()

  // Tüm rozetleri çek
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .order('criteria_value', { ascending: true })

  // Şu anki kullanıcıyı al (girişli değilse null)
  const { data: { user } } = await supabase.auth.getUser()

  // Kullanıcının kazandığı rozetlerin id listesi
  let earnedBadgeIds: string[] = []
  if (user) {
    const { data: earned } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user.id)
    earnedBadgeIds = (earned ?? []).map((row) => row.badge_id)
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <AnimatedSection>
          <h1 className="text-3xl font-bold text-center text-gray-100 mb-8">🏅 Rozetler</h1>
          <p className="text-center text-gray-400 mb-12">Aktif oldukça rozet kazan!</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges?.map((badge, index) => {
            const isEarned = user && earnedBadgeIds.includes(badge.id)
            return (
              <AnimatedSection key={badge.id} delay={index * 0.05}>
                <div
                  className={`rounded-2xl shadow-xl p-6 text-center transition-all duration-300 ${
                    isEarned
                      ? 'bg-white/10 border border-primary-400/50'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className={`text-5xl mb-3 ${isEarned ? '' : 'opacity-70'}`}>
                    {badge.icon}
                  </div>
                  <h2 className="font-bold text-gray-100">{badge.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">{badge.description}</p>
                  <div className="mt-3">
                    {isEarned ? (
                      <span className="inline-block bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full text-xs font-semibold">
                        Kazanıldı ✓
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-800/80 text-gray-400 px-3 py-1 rounded-full text-xs">
                        Henüz kazanılmadı
                      </span>
                    )}
                  </div>
                </div>
              </AnimatedSection>
            )
          })}
        </div>

        {!user && (
          <div className="text-center mt-12">
            <p className="text-gray-400 mb-4">Rozetlerini görmek için giriş yapmalısınız.</p>
            <a href="/giris" className="btn-primary inline-block">Giriş Yap</a>
          </div>
        )}
      </div>
    </div>
  )
}