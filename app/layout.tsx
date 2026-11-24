import type { Metadata } from 'next'
import { Libre_Bodoni, Public_Sans } from 'next/font/google'
import Script from 'next/script'
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

const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

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
        {process.env.NODE_ENV === 'production' && umamiScriptUrl && umamiWebsiteId && (
          <Script
            defer
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}