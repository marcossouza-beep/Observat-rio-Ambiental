import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PaginaTema } from '@/componentes/PaginaTema'
import { temaOuBioma } from '@/dados/consultas'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const item = await temaOuBioma('biomas', (await params).slug)
  if (!item) return { title: 'Não encontrado', robots: { index: false } }
  return {
    title: `Bioma ${item.nome}: leis ambientais e pareceres`,
    description: item.textoAbertura?.slice(0, 155) || `Leis e pareceres sobre ${item.nome}.`,
    alternates: { canonical: `/biomas/${item.slug}` },
    // Sem texto de abertura escrito pelo autor, a página não entra na busca (docs/SEO.md)
    robots: item.textoAbertura ? undefined : { index: false, follow: true },
  }
}

export default async function Pagina({ params }: { params: Params }) {
  const item = await temaOuBioma('biomas', (await params).slug)
  if (!item) notFound()
  return <PaginaTema tipo="biomas" item={item} />
}
