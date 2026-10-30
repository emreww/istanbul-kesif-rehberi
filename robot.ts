import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Tüm botlar için geçerli
      allow: '/',     // Her yeri tara
      disallow: [     // Ancak şu sayfaları tarama:
        '/admin/',    // Yönetim paneli
        '/api/',      // API rotaları
        '/mesajlar/', // Özel mesajlar
        '/profil/',   // Kullanıcı profilleri
        '/listelerim/',
        '/mekan-ekle/',
        '/mekan-duzenle/',
      ],
    },
    // Sitemap dosyanızın adresi (Loglarda sitemap.xml olduğunu gördük)
    sitemap: 'https://kesifistanbul.com.tr/sitemap.xml',
  };
}