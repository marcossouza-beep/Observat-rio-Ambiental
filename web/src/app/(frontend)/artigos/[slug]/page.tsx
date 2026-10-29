import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Assinatura, redesDe } from '@/componentes/Autor'
import { JsonLd } from '@/componentes/JsonLd'
import { Rico } from '@/componentes/Rico'
import { Trilha } from '@/componentes/Trilha'
import { artigoPorSlug } from '@/dados/consultas'
import { dataLonga, NOME_SITE, SITE_URL } from '@/lib/rotulos'
import { cortar, url } from '@/lib/seo'
import type { Autor } from '@/payload-types'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const a = await artigoPorSlug((await params).slug)
  if (!a) return { title: 'Artigo não encontrado', robots: { index: false } }
  return {
    title: a.titulo,
    description: a.resumo ? cortar(a.resumo) : undefined,
    alternates: { canonical: `/artigos/${a.slug}` },
    openGraph: { title: a.titulo, type: 'article', publishedTime: a.publicadoEm || undefined },
  }
}

export default async function PaginaArtigo({ params }: { params: Params }) {
  const a = await artigoPorSlug((await params).slug)
  if (!a) notFound()
  const autor = a.autor && typeof a.autor === 'object' ? (a.autor as Autor) : null
  return (
    <div className="wrap">
      <JsonLd
        dados={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.titulo,
          url: url(`/artigos/${a.slug}`),
          datePublished: a.publicadoEm || undefined,
          dateModified: a.updatedAt,
          inLanguage: 'pt-BR',
          author: autor ? { '@type': 'Person', name: autor.nome, jobTitle: autor.titulo || undefined, sameAs: redesDe(autor).filter(Boolean) } : undefined,
          publisher: { '@type': 'Organization', name: NOME_SITE, logo: `${SITE_URL}/marca/logo.png` },
        }}
      />
      <Trilha
        itens={[
          { nome: 'Artigos', caminho: '/artigos' },
          { nome: a.titulo, caminho: `/artigos/${a.slug}` },
        ]}
      />
      <header className="lawhead">
        <Assinatura autor={autor} />
        <h1>{a.titulo}</h1>
        <div className="meta">{a.publicadoEm ? <span>Publicado em {dataLonga(a.publicadoEm)}</span> : null}</div>
        {a.resumo ? <p className="intro">{a.resumo}</p> : null}
      </header>
      <article className="block b-who">
        <Rico valor={a.corpo} />
      </article>
    </div>
  )
}
