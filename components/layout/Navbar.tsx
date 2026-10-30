'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Supabase istemcisini lazy state ile güvenli başlatıyoruz
  const [supabase] = useState(() => createClient())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Admin sayfasında navbar'ı gizlemek için boolean bir değer tutalım
  const hideNavbar = pathname?.startsWith('/admin')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const checkAdmin = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userId)
          .single()
        setIsAdmin(!!data?.is_admin)
      } catch {
        setIsAdmin(false)
      }
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        checkAdmin(user.id)
      }
    }
    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        checkAdmin(currentUser.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { href: '/kesfet', label: 'Keşfet' },
    { href: '/route', label: 'Rota' },
    { href: '/yakinimda', label: 'Yakınımda' },
    { href: '/listeler', label: 'Listeler' },
    { href: '/kullanicilar', label: 'Kullanıcılar' },
    { href: '/mekan-ekle', label: 'Mekan Ekle' },
  ]

  if (hideNavbar) {
    return null
  }

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gray-900/95 shadow-lg backdrop-blur-md'
          : 'bg-gray-900/80 shadow-md backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold text-primary-500 hover:text-primary-400 transition-all duration-200 hover:scale-105"
          >
            🏙️ İstanbul Keşif
          </Link>

          {/* Masaüstü menü */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg group transition-colors duration-200 ${
                    active
                      ? 'text-primary-400 font-semibold'
                      : 'text-gray-300 hover:text-primary-400'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-primary-500 transform transition-transform duration-200 origin-left ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              )
            })}

            {user ? (
              <div
                className="relative ml-2"
                ref={dropdownRef}
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-800 transition-all duration-200 group">
                  <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-white font-semibold ring-2 ring-transparent group-hover:ring-primary-500 transition-all duration-200">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (user.user_metadata?.username?.[0] || user.email?.[0] || 'K').toUpperCase()
                    )}
                  </div>
                  <span className="text-gray-300 font-medium">
                    {user.user_metadata?.username || user.email}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 py-2 z-50"
                    >
                      <Link
                        href={`/profil/${user.id}`}
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-primary-400 transition"
                      >
                        👤 Profilim
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-amber-400 hover:bg-amber-500/10 font-medium transition"
                        >
                          🛠️ Admin Panel
                        </Link>
                      )}
                      <Link
                        href="/cark"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-primary-400 transition"
                      >
                        🎡 Çark
                      </Link>
                      <Link
                        href="/listelerim"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-primary-400 transition"
                      >
                        📋 Listelerim
                      </Link>
                      <Link
                        href="/rozetler"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-primary-400 transition"
                      >
                        🏅 Rozetler
                      </Link>
                      <link
                       href="/mesajlar"
                       onClick={() => setIsOpen(false)}
                       className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                      >💭 Mesajlar</link>
                      <Link
                        href="/bildirimler"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-primary-400 transition"
                      >
                        🔔 Bildirimler
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-red-900/50 hover:text-red-400 transition"
                      >
                        🚪 Çıkış Yap
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/giris" className="btn-primary py-2 px-4 text-sm ml-2">
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobil menü butonu */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-300 hover:bg-gray-800"
            aria-label="Menü"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobil menü içeriği */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-900 border-t border-gray-800"
          >
            <div className="px-4 py-3 space-y-2">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-2 rounded-md transition-colors ${
                      active
                        ? 'bg-gray-800 text-primary-400 font-semibold'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-primary-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {user ? (
                <div className="pt-2 border-t border-gray-800 space-y-1">
                  <Link
                    href={`/profil/${user.id}`}
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >
                    👤 {user.user_metadata?.username || user.email}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-amber-400 font-medium hover:bg-gray-800 rounded-md"
                    >
                      🛠️ Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/cark"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >
                    🎡 Çark
                  </Link>
                  <Link
                    href="/listelerim"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >
                    📋 Listelerim
                  </Link>
                  <Link
                    href="/rozetler"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >
                    🏅 Rozetler
                  </Link>
                  <link
                  href="/mesajlar"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >💭 Mesajlar</link>
                  <Link
                    href="/bildirimler"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-md"
                  >
                    🔔 Bildirimler
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:bg-red-900/50 hover:text-red-400 rounded-md"
                  >
                    🚪 Çıkış Yap
                  </button>
                </div>
              ) : (
                <Link
                  href="/giris"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 bg-primary-500 text-white rounded-md text-center"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
