'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface WeatherData {
  temperature: number
  apparentTemperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  isDay: boolean
}

interface WeatherInfo {
  label: string
  icon: string
  tip: string
  filterTag: string
  filterLabel: string
}

function getWeatherInfo(code: number, temp: number, isDay: boolean): WeatherInfo {
  // WMO Weather interpretation codes (WW)
  if (code === 0) {
    if (temp >= 20) {
      return {
        label: isDay ? 'Açık & Güneşli' : 'Açık Gece',
        icon: isDay ? '☀️' : '🌙',
        tip: 'Hava pırıl pırıl! Boğaz manzaralı teraslar ve deniz kenarı mekanlar için harika bir gün.',
        filterTag: 'deniz-kenari',
        filterLabel: '🌊 Boğaz & Deniz Kenarı Mekanlar',
      }
    }
    return {
      label: isDay ? 'Açık & Serin' : 'Açık Gece',
      icon: isDay ? '🌤️' : '🌙',
      tip: 'Hava açık ve ferah. Şehirde keyifli bir yürüyüş ve üçüncü nesil kahveciler için ideal.',
      filterTag: 'acik-alan',
      filterLabel: '☕ Açık Alan & Bahçeli Kafeler',
    }
  }

  if (code >= 1 && code <= 3) {
    return {
      label: 'Parçalı Bulutlu',
      icon: '⛅',
      tip: 'Ilık ve keyifli bir hava. Tarihi yarımada keşifleri ve açık alan kafeleri keşfedilmeyi bekliyor.',
      filterTag: 'manzara',
      filterLabel: '🏛️ Manzaralı Mekanlar',
    }
  }

  if (code === 45 || code === 48) {
    return {
      label: 'Sisli',
      icon: '🌫️',
      tip: 'Puslu bir İstanbul manzarası. Sıcak içecekler eşliğinde samimi mekanlarda vakit geçirme zamanı.',
      filterTag: 'wifi',
      filterLabel: '☕ Sıcak & Samimi Kafeler',
    }
  }

  if (code >= 51 && code <= 67) {
    return {
      label: 'Yağmurlu',
      icon: '🌧️',
      tip: 'İstanbul yağmurlu! Kitabını alıp kahveni yudumlayabileceğin sıcak ve şömineli mekanlar harika gider.',
      filterTag: 'wifi',
      filterLabel: '📖 Kapalı & Huzurlu Mekanlar',
    }
  }

  if (code >= 71 && code <= 77) {
    return {
      label: 'Karlı',
      icon: '❄️',
      tip: 'İstanbul beyaz örtüyle kaplı! Şehrin tarihi sokaklarında kış atmosferini yaşa.',
      filterTag: 'manzara',
      filterLabel: '❄️ Kış Manzaralı Mekanlar',
    }
  }

  if (code >= 80 && code <= 82) {
    return {
      label: 'Sağanak Yağış',
      icon: '🌦️',
      tip: 'Anlık yağış geçişleri var. Lezzetli bir akşam yemeği veya kapalı restoranlar tam sana göre.',
      filterTag: 'rezervasyon',
      filterLabel: '🍽️ Restoran & Lezzet Durakları',
    }
  }

  if (code >= 95) {
    return {
      label: 'Gök Gürültülü Fırtına',
      icon: '⛈️',
      tip: 'Hava fırtınalı. Kapalı mekanlarda sıcak bir tatlı ve kahve molası ver.',
      filterTag: 'wifi',
      filterLabel: '☕ Sıcak & Kapalı Mekanlar',
    }
  }

  return {
    label: 'Bulutlu',
    icon: '☁️',
    tip: 'İstanbul sokaklarını adımlamak ve yeni mekanlar keşfetmek için harika bir gün.',
    filterTag: 'acik-alan',
    filterLabel: '📍 Popüler Mekanlar',
  }
}

export default function IstanbulWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=Europe%2FIstanbul',
          { next: { revalidate: 1800 } }
        )
        if (!res.ok) throw new Error('Weather fetch failed')
        const data = await res.json()
        const current = data.current
        setWeather({
          temperature: Math.round(current.temperature_2m),
          apparentTemperature: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
        })
      } catch (err) {
        console.warn('Weather fetch error:', err)
        // Fallback default
        setWeather({
          temperature: 21,
          apparentTemperature: 21,
          humidity: 62,
          windSpeed: 14,
          weatherCode: 1,
          isDay: true,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [])

  if (loading || !weather) {
    return (
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between animate-pulse max-w-xl mx-auto lg:mx-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="space-y-1.5">
            <div className="w-24 h-4 bg-white/10 rounded" />
            <div className="w-36 h-3 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const info = getWeatherInfo(weather.weatherCode, weather.temperature, weather.isDay)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 md:p-5 rounded-2xl border border-white/15 shadow-xl relative overflow-hidden group hover:border-primary-500/40 transition duration-300"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Sol: Sıcaklık ve Durum */}
        <div className="flex items-center gap-3.5">
          <div className="text-3xl sm:text-4xl p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center shrink-0">
            {info.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{weather.temperature}°C</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-primary-300 font-semibold">
                {info.label}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
              <span>📍 İstanbul</span>
              <span>• Hissedilen: {weather.apparentTemperature}°C</span>
              <span>• 💨 {weather.windSpeed} km/s</span>
            </div>
          </div>
        </div>

        {/* Sağ: Hava Durumuna Göre Filtre Butonu */}
        <div className="shrink-0">
          <Link
            href={`/kesfet?ozellikler=${info.filterTag}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-200 text-xs font-bold hover:bg-primary-500 hover:text-white transition shadow-md shadow-primary-500/10"
          >
            {info.filterLabel} →
          </Link>
        </div>
      </div>

      {/* Alt: Dinamik Keşif Önerisi */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-gray-300">
        <span className="text-amber-400 text-sm">💡</span>
        <span className="leading-relaxed">{info.tip}</span>
      </div>
    </motion.div>
  )
}
