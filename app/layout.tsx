import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import RealtimeNotifications from '@/components/notifications/RealtimeNotifications'
import BanCheck from '@/components/auth/BanCheck'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'İstanbul Keşif Rehberi',
  description: "İstanbul'daki mekanları keşfet, puanla, yorumla",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-gray-900 text-gray-100 min-h-screen`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <BanCheck />
        <RealtimeNotifications />
      </body>
    </html>
  )
}