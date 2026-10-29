'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useNotificationStore } from '@/store/notifications'

const OZELLIKLER = [
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cocuk-dostu', label: 'Çocuk Dostu' },
  { value: 'evcil-hayvan-dostu', label: 'Evcil Hayvan Dostu' },
  { value: 'manzara', label: 'Manzara' },
  { value: 'alkol-servisi', label: 'Alkol Servisi' },
  { value: 'vejetaryen', label: 'Vejetaryen Seçenek' },
  { value: 'otopark', label: 'Otopark' },
  { value: 'acik-alan', label: 'Açık Alan' },
  { value: 'deniz-kenari', label: 'Deniz Kenarı' },
  { value: 'canli-muzik', label: 'Canlı Müzik' },
  { value: 'rezervasyon', label: 'Rezervasyon' },
  { value: 'paket-servis', label: 'Paket Servis' },
  { value: 'vegan-secenek', label: 'Vegan Seçenek' },
]

const ILCELER = [
  'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
  'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
  'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
  'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
  'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla',
  'Ümraniye', 'Üsküdar', 'Zeytinburnu'
]

interface Category {
  id: number
  name: string
  slug: string
}

export default function PlaceForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [workingHours, setWorkingHours] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [showDetails, setShowDetails] = useState(false) // Detay bölümü aç/kapa

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { addNotification } = useNotificationStore()

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('id')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [supabase])

  const handleFeatureToggle = (feature: string) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId || !district) {
      setError('Lütfen mekan adı, kategori ve ilçe alanlarını doldurun.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Oturum açmanız gerekiyor.')
      setLoading(false)
      router.push('/giris')
      return
    }

    const { error: insertError } = await supabase.from('places').insert({
      name: name.trim(),
      description: description.trim(),
      category_id: Number(categoryId),
      district,
      address: address.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      instagram: instagram.trim().replace('@', ''),
      working_hours: workingHours.trim() || null,
      price_range: priceRange ? Number(priceRange) : null,
      features: features.length > 0 ? features : null,
      created_by: user.id,
      status: 'pending',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    addNotification('Mekan öneriniz alındı! Onay sonrası yayınlanacak. 📍', 'success')
    router.push('/kesfet')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-100">Yeni Mekan Öner</h2>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {/* Temel Bilgiler */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-200">Temel Bilgiler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mekan Adı *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Örn: Karaköy Güllüoğlu" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Kategori *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field" required>
              <option value="">Seçiniz</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field" placeholder="Mekanı kısaca tanıtın..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">İlçe *</label>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field" required>
            <option value="">Seçiniz</option>
            {ILCELER.map((ilce) => (
              <option key={ilce} value={ilce}>{ilce}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Detaylı Bilgiler Bölümü (Tıklanınca açılır) */}
      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-left text-lg font-semibold text-gray-200 hover:text-primary-400 transition"
        >
          <span>Detaylı Bilgiler (opsiyonel)</span>
          <span className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Adres</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-field" placeholder="Açık adres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Fiyat Aralığı</label>
                <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="input-field">
                  <option value="">Seçiniz</option>
                  <option value="1">₺</option>
                  <option value="2">₺₺</option>
                  <option value="3">₺₺₺</option>
                  <option value="4">₺₺₺₺</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Telefon</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="0xxx xxx xx xx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Web Sitesi</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-field" placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Instagram</label>
                <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="input-field" placeholder="kullaniciadi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Çalışma Saatleri</label>
                <input type="text" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} className="input-field" placeholder="Örn: 09:00 - 22:00" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Özellikler</label>
              <div className="flex flex-wrap gap-3">
                {OZELLIKLER.map((ozellik) => (
                  <label key={ozellik.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.includes(ozellik.value)}
                      onChange={() => handleFeatureToggle(ozellik.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {ozellik.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Gönderiliyor...' : 'Mekanı Öner'}
      </button>
    </form>
  )
}