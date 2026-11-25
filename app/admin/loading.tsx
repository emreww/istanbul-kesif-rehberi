export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
      <p className="text-gray-400 font-medium">Yönetim verileri yükleniyor...</p>
    </div>
  )
}