import type { Metadata } from 'next'
import { Libre_Bodoni, Public_Sans } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import RealtimeNotifications from '@/components/notifications/RealtimeNotifications'
import BanCheck from '@/components/auth/BanCheck'

const display = Libre_Bodoni({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
})
const body = Public_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
})

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
      <body className={`${display.variable} ${body.variable} font-sans antialiased min-h-screen`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <BanCheck />
        <RealtimeNotifications />
      </body>
    </html>
  )
}
