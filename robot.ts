import { MetadataRoute } from 'next';

const DISALLOWED_PATHS = [
  '/admin/',
  '/api/',
  '/mesajlar/',
  '/profil/',
  '/listelerim/',
  '/mekan-ekle/',
  '/mekan-duzenle/',
];

const BLOCKED_BOTS = [
  'Reflectionbot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'Google-Extended',
  'Amazonbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...BLOCKED_BOTS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: 'https://kesifistanbul.com.tr/sitemap.xml',
  };
}