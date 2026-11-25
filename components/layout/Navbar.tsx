'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Plus,
  User,
  Shield,
  Disc,
  BookmarkCheck,
  Award,
  MessageSquare,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const [supabase] = useState(() => createClient())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const handleDropdownMouseEnter = () => {
    clearCloseTimeout()
    setDropdownOpen(true)
  }

  const handleDropdownMouseLeave = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false)
    }, 150)
  }

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
        clearCloseTimeout()
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => clearCloseTimeout()
  }, [])

  const handleLogout = async () => {
    clearCloseTimeout()
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
  ]

  if (hideNavbar) {
    return null
  }

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-[#070b14]/92 border-slate-800/90 shadow-xl shadow-black/30 backdrop-blur-xl'
          : 'bg-[#070b14]/75 border-slate-800/60 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          {/* Sol: Marka Logosu */}
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 shrink-0 group"
          >
            <span className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 transition-all duration-200">
              <Compass className="w-4 h-4 group-hover:rotate-270 transition-transform duration-800" strokeWidth={2} />
            </span>
            <span className="font-serif text-lg sm:text-xl text-white group-hover:text-amber-300 transition-colors transition-transform-duration-500">
              İstanbul Keşif
            </span>
          </Link>

          {/* Orta: Masaüstü Gezinti Linkleri */}
          <div className="hidden lg:flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-800/80 px-2 py-1">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                    active
                      ? 'bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/30'
                      : 'text-slate-300 hover:text-amber-300 hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Sağ: Mekan Ekle + Kullanıcı / Giriş */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link
              href="/mekan-ekle"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                isActive('/mekan-ekle')
                  ? 'bg-amber-400 text-slate-950 border-amber-400 hover:bg-[#FCC93F]'
                  : 'bg-slate-900/80 text-amber-300 border-amber-400/30 hover:border-amber-400/70 hover:bg-amber-400/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Mekan Ekle</span>
            </Link>

            {user ? (
              <div
                className="relative"
                ref={dropdownRef}
                onMouseEnter={handleDropdownMouseEnter}
                onMouseLeave={handleDropdownMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearCloseTimeout()
                    setDropdownOpen((prev) => !prev)
                  }}
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 hover:border-amber-400/40 transition-all duration-200 group"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xs font-semibold overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (user.user_metadata?.username?.[0] || user.email?.[0] || 'K').toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-200 group-hover:text-amber-300 transition-colors max-w-[130px] truncate">
                    {user.user_metadata?.username || user.email}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                    strokeWidth={1.8}
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-[#0c1220] rounded-2xl shadow-2xl shadow-black/50 border border-slate-800 py-2 z-50"
                    >
                      <Link
                        href={`/profil/${user.id}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <User className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Profilim</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-amber-400 hover:bg-amber-400/10 font-medium transition-colors"
                        >
                          <Shield className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <Link
                        href="/cark"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <Disc className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Çark</span>
                      </Link>

                      <Link
                        href="/listelerim"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <BookmarkCheck className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Listelerim</span>
                      </Link>

                      <Link
                        href="/rozetler"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <Award className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Rozetler</span>
                      </Link>

                      <Link
                        href="/mesajlar"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Mesajlar</span>
                      </Link>

                      <Link
                        href="/bildirimler"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-amber-300 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                        <span>Bildirimler</span>
                      </Link>

                      <div className="my-1.5 border-t border-slate-800" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-red-950/50 hover:text-red-400 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-400/80" strokeWidth={1.8} />
                        <span>Çıkış Yap</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/giris"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-sm px-4 py-2 shadow-lg shadow-amber-500/15 hover:from-amber-300 hover:to-amber-400 transition-all duration-200"
              >
                Giriş Yap
              </Link>
            )}
          </div>

          {/* Mobil menü butonu */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 hover:border-amber-400/40 hover:text-amber-300 transition-colors"
            aria-label="Menü"
          >
            {isOpen ? (
              <X className="w-5 h-5" strokeWidth={2} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={2} />
            )}
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
            className="lg:hidden bg-[#070b14]/98 border-t border-slate-800 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                      active
                        ? 'bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-amber-300'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}

              <Link
                href="/mekan-ekle"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 hover:bg-amber-400/15 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
                <span>Mekan Ekle</span>
              </Link>

              {user ? (
                <div className="pt-3 mt-2 border-t border-slate-800 space-y-1">
                  <Link
                    href={`/profil/${user.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-200 hover:bg-slate-900 rounded-xl"
                  >
                    <User className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>{user.user_metadata?.username || user.email}</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-amber-400 font-medium hover:bg-slate-900 rounded-xl"
                    >
                      <Shield className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  <Link
                    href="/cark"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-xl"
                  >
                    <Disc className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Çark</span>
                  </Link>

                  <Link
                    href="/listelerim"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-xl"
                  >
                    <BookmarkCheck className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Listelerim</span>
                  </Link>

                  <Link
                    href="/rozetler"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-xl"
                  >
                    <Award className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Rozetler</span>
                  </Link>

                  <Link
                    href="/mesajlar"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-xl"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Mesajlar</span>
                  </Link>

                  <Link
                    href="/bildirimler"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 rounded-xl"
                  >
                    <Bell className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                    <span>Bildirimler</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-300 hover:bg-red-950/50 hover:text-red-400 rounded-xl"
                  >
                    <LogOut className="w-4 h-4 text-red-400/80" strokeWidth={1.8} />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    href="/giris"
                    onClick={() => setIsOpen(false)}
                    className="block w-full px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold rounded-xl text-center text-sm"
                  >
                    Giriş Yap
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}