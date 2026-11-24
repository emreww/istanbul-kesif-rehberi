'use client'
import Link from 'next/link'

export interface Consents {
  terms: boolean
  privacy: boolean
  marketing: boolean
}

export default function ConsentCheckboxes({
  value,
  onChange,
}: {
  value: Consents
  onChange: (v: Consents) => void
}) {
  return (
    <div className="space-y-3 text-sm text-gray-300">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          required
          checked={value.terms}
          onChange={(e) => onChange({ ...value, terms: e.target.checked })}
          className="mt-1"
        />
        <span>
          <Link href="/kullanim-kosullari" target="_blank" className="underline">
            Üyelik ve Kullanım Koşulları
          </Link>
          'nı okudum, kabul ediyorum. <span className="text-red-400">*</span>
        </span>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          required
          checked={value.privacy}
          onChange={(e) => onChange({ ...value, privacy: e.target.checked })}
          className="mt-1"
        />
        <span>
          <Link href="/kvkk" target="_blank" className="underline">
            KVKK Aydınlatma Metni
          </Link>
          'ni okudum ve anladım. <span className="text-red-400">*</span>
        </span>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={value.marketing}
          onChange={(e) => onChange({ ...value, marketing: e.target.checked })}
          className="mt-1"
        />
        <span>
          (İsteğe bağlı) Kampanya, duyuru ve yeniliklerden e-posta ile haberdar olmak istiyorum.
        </span>
      </label>
    </div>
  )
}