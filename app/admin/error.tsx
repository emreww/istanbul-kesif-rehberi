'use client'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-white">Panel yüklenemedi</h2>
      <p className="text-sm text-gray-400 max-w-md">
        Yönetim verileri alınırken bir hata oluştu. Bağlantınızı kontrol edip tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-sm font-semibold hover:bg-amber-400/25 transition cursor-pointer"
      >
        🔄 Tekrar Dene
      </button>
    </div>
  )
}