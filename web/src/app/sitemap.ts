import type { MetadataRoute } from 'next'
import { enderecosParaSitemap } from '@/dados/consultas'
import { url } from '@/lib/seo'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const e = await enderecosParaSitemap()
  const fixos = ['/', '/leis', '/leis?esfera=federal', '/leis?esfera=estadual', '/pareceres', '/artigos', '/temas', '/parlamentares', '/panorama', '/estaduais'].map((c) => ({ url: url(c), changeFrequency: 'daily' as const }))
  const item = (pref: string) => (d: { slug?: string | null; updatedAt: string }) => ({ url: url(`${pref}/${d.slug}`), lastModified: d.updatedAt })
  return [
    ...fixos,
    ...e.pareceres.filter((d) => d.slug).map(item('/pareceres')),
    ...e.leis.filter((d) => d.slug).map(item('/leis')),
    ...e.temas.filter((d) => d.slug).map(item('/temas')),
    ...e.biomas.filter((d) => d.slug).map(item('/biomas')),
    ...e.artigos.filter((d) => d.slug).map(item('/artigos')),
    ...e.autores.filter((d) => d.slug).map(item('/autores')),
    ...e.parlamentares.filter((d) => d.slug).map(item('/parlamentares')),
  ]
}
