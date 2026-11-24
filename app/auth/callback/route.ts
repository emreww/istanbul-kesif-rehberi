import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'

function getSafeNextPath(rawNext: string | null, fallback = '/'): string {
  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return fallback
  }
  return rawNext
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next')

  // Ters proxy (Coolify/Traefik) arkasında gerçek domaini al
  const forwardedHost = request.headers.get('x-forwarded-host')
  const siteUrl = forwardedHost
    ? `https://${forwardedHost}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://kesifistanbul.com.tr'

  const defaultRedirect = type === 'recovery' ? '/sifre-guncelle' : '/'
  const nextPath = getSafeNextPath(rawNext, defaultRedirect)

  if (code || (tokenHash && type)) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${siteUrl}${nextPath}`)
      }
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (!error) {
        return NextResponse.redirect(`${siteUrl}${nextPath}`)
      }
    }
  }

  // Şifre sıfırlama akışında kullanıcı maildeki 6 haneli kodla devam edebilsin
  if (type === 'recovery' || nextPath.includes('sifre') || nextPath.includes('reset')) {
    return NextResponse.redirect(`${siteUrl}/sifre-guncelle`)
  }

  return NextResponse.redirect(`${siteUrl}/giris?hata=dogrulama-basarisiz`)
}