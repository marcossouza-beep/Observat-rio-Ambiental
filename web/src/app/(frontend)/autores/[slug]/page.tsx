import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redesDe } from '@/componentes/Autor'
import { Carater } from '@/componentes/Etiquetas'
import { Seta } from '@/componentes/Icones'
import { JsonLd } from '@/componentes/JsonLd'
import { Trilha } from '@/componentes/Trilha'
import { autorPorSlug } from '@/dados/consultas'
import { dataBR } from '@/lib/rotulos'
import { url } from '@/lib/seo'
import type { Media, Proposicao } from '@/payload-types'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await autorPorSlug((await params).slug)
  if (!d) return { title: 'Autor não encontrado', robots: { index: false } }
  return {
    title: `${d.autor.nome}${d.autor.titulo ? `, ${d.autor.titulo}` : ''}`,
    description: d.autor.bio?.slice(0, 155) || `Resumos prévios de ${d.autor.nome} sobre legislação ambiental.`,
    alternates: { canonical: `/autores/${d.autor.slug}` },
  }
}

export default async function PaginaAutor({ params }: { params: Params }) {
  const d = await autorPorSlug((await params).slug)
  if (!d) notFound()
  const { autor, pareceres } = d
  const foto = autor.foto && typeof autor.foto === 'object' ? (autor.foto as Media) : null
  const redes = [
    ['LinkedIn', autor.redes?.linkedin],
    ['Lattes', autor.redes?.lattes],
    ['Instagram', autor.redes?.instagram],
    ['X', autor.redes?.x],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <div className="wrap">
      <JsonLd
        dados={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          url: url(`/autores/${autor.slug}`),
          mainEntity: { '@type': 'Person', name: autor.nome, jobTitle: autor.titulo || undefined, image: foto?.url || undefined, sameAs: redesDe(autor).filter(Boolean), description: autor.bio || undefined },
        }}
      />
      <Trilha itens={[{ nome: autor.nome, caminho: `/autores/${autor.slug}` }]} />
      <header className="lawhead">
        <div className="byline" style={{ fontSize: '1rem' }}>
          {foto?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.url} alt={foto.alt || autor.nome} width={64} height={64} style={{ width: 64, height: 64 }} />
          ) : null}
          <div>
            <h1 style={{ fontSize: '1.8rem' }}>{autor.nome}</h1>
            {autor.titulo ? <span>{autor.titulo}</span> : null}
          </div>
        </div>
        {autor.bio ? <p className="intro">{autor.bio}</p> : null}
        {redes.length ? (
          <div className="byline">
            <span className="redes">
              {redes.map(([n, v]) => (
                <a key={n} href={v} rel="me noopener" target="_blank">
                  {n}
                </a>
              ))}
            </span>
          </div>
        ) : null}
      </header>
      <section className="section">
        <div className="section-h">
          <h2>Resumos prévios</h2>
          <span>{pareceres.length}</span>
        </div>
        <div className="list">
          {pareceres.map((p) => {
            const lei = p.proposicao as Proposicao
            return (
              <Link key={p.id} className="law" href={`/resumos/${p.slug}`}>
                <div className="top">
                  <Carater valor={p.carater} />
                </div>
                <h3>{p.titulo || lei?.titulo}</h3>
                <div className="go">
                  <span className="num">
                    {lei?.rotulo} · {dataBR(p.publicadoEm)}
                  </span>
                  <span className="arrow">
                    Ler resumo prévio <Seta />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
