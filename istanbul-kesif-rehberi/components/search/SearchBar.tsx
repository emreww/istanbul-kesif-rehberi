'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const { data: placeResults } = await supabase
        .from('places')
        .select('id, name, district')
        .eq('status', 'approved')
        .or(`name.ilike.%${query}%,district.ilike.%${query}%`)
        .limit(5)

      const { data: categoryResults } = await supabase
        .from('categories')
        .select('id, name, slug')
        .or(`name.ilike.%${query}%`)
        .limit(3)

      setSuggestions([
        ...(categoryResults ?? []).map(c => ({ type: 'category', label: c.name, slug: c.slug })),
        ...(placeResults ?? []).map(p => ({ type: 'place', label: p.name, id: p.id, district: p.district })),
      ])
    }, 300)

    return () => clearTimeout(timer)
  }, [query, supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/kesfet?q=${encodeURIComponent(query.trim())}`)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'category') {
      router.push(`/kesfet?kategori=${suggestion.slug}`)
    } else {
      router.push(`/mekan/${suggestion.id}`)
    }
    setShowSuggestions(false)
    setQuery('')
  }

  return (
    <div className="relative max-w-xl mx-auto">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Mekan, kategori veya ilçe ara..."
          className="w-full px-6 py-4 rounded-full bg-gray-900/90 border-2 border-white/20 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-500 text-white px-6 py-2 rounded-full hover:bg-primary-600 transition"
        >
          Ara
        </button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-800 transition flex items-center gap-3"
            >
              <span className="text-xl">
                {suggestion.type === 'category' ? '🏷️' : '📍'}
              </span>
              <div>
                <div className="font-semibold text-gray-100">{suggestion.label}</div>
                {suggestion.type === 'place' && (
                  <div className="text-sm text-gray-400">{suggestion.district}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}