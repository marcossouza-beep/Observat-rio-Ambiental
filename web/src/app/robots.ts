import type { MetadataRoute } from 'next'
import { url } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/busca'] }],
    sitemap: url('/sitemap.xml'),
  }
}
