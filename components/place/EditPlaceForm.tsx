'use client'
import { useState, useEffect } from 'react'
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

interface Place {
  id: string
  name: string
  description: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  working_hours: string | null
  price_range: number | null
  features: string[] | null
}

export default function EditPlaceForm({ place }: { place: Place }) {
  const [name, setName] = useState(place.name)
  const [description, setDescription] = useState(place.description || '')
  const [phone, setPhone] = useState(place.phone || '')
  const [website, setWebsite] = useState(place.website || '')
  const [instagram, setInstagram] = useState(place.instagram || '')
  const [workingHours, setWorkingHours] = useState(place.working_hours || '')
  const [priceRange, setPriceRange] = useState(place.price_range ? String(place.price_range) : '')
  const [features, setFeatures] = useState<string[]>(place.features || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { addNotification } = useNotificationStore()

  const handleFeatureToggle = (feature: string) => {
    setFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Mekan adı zorunludur.')
      return
    }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('places')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        instagram: instagram.trim().replace('@', '') || null,
        working_hours: workingHours.trim() || null,
        price_range: priceRange ? Number(priceRange) : null,
        features: features.length > 0 ? features : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', place.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    addNotification('Mekan bilgileri güncellendi ✅', 'success')
    router.push(`/mekan/${place.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Mekanı Düzenle</h2>
      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Mekan Adı *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field" placeholder="Mekanı kısaca tanıtın..." />
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
        <label className="block text-sm font-medium text-gray-300 mb-1">Fiyat Aralığı</label>
        <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="input-field">
          <option value="">Seçiniz</option>
          <option value="1">₺</option>
          <option value="2">₺₺</option>
          <option value="3">₺₺₺</option>
          <option value="4">₺₺₺₺</option>
        </select>
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

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Güncelleniyor...' : 'Güncelle'}
      </button>
    </form>
  )
}