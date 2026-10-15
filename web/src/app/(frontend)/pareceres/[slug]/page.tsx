import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Assinatura, redesDe } from '@/componentes/Autor'
import { Carater, Impacto, Local, Situacao } from '@/componentes/Etiquetas'
import { IconePdf, Seta } from '@/componentes/Icones'
import { JsonLd } from '@/componentes/JsonLd'
import { Rico } from '@/componentes/Rico'
import { Trilha } from '@/componentes/Trilha'
import { parecerPorSlug } from '@/dados/consultas'
import { SECOES_PARECER, textoDe } from '@/lib/publicacao'
import { dataBR, dataLonga } from '@/lib/rotulos'
import { descricaoParecer, jsonLdParecer, jurisdicao, tituloParecer } from '@/lib/seo'
import type { Autor, Material, Media, Versao } from '@/payload-types'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await parecerPorSlug((await params).slug)
  if (!d) return { title: 'Parecer não encontrado', robots: { index: false } }
  const titulo = tituloParecer(d.parecer, d.lei)
  return {
    title: titulo,
    description: descricaoParecer(d.parecer, textoDe(d.parecer.secoes?.resumo)),
    alternates: { canonical: `/pareceres/${d.parecer.slug}` },
    robots: d.parecer.seo?.indexar === false ? { index: false, follow: true } : undefined,
    openGraph: { title: titulo, type: 'article', publishedTime: d.parecer.publicadoEm || undefined, modifiedTime: d.parecer.atualizadoEm || undefined },
  }
}

export default async function PaginaParecer({ params }: { params: Params }) {
  const d = await parecerPorSlug((await params).slug)
  if (!d) notFound()
  const { parecer, lei, correcoes } = d
  const autor = parecer.autor && typeof parecer.autor === 'object' ? (parecer.autor as Autor) : null
  const analisada = parecer.versaoTexto && typeof parecer.versaoTexto === 'object' ? (parecer.versaoTexto as Versao) : null
  const materiais = [parecer.materiais?.notaTecnica, parecer.materiais?.quadroComparativo].filter((m): m is Material => !!m && typeof m === 'object')
  const titulo = tituloParecer(parecer, lei)
  const foto = autor?.foto && typeof autor.foto === 'object' ? (autor.foto as Media).url : null

  return (
    <div className="wrap">
      <JsonLd
        dados={jsonLdParecer({
          titulo,
          caminho: `/pareceres/${parecer.slug}`,
          publicadoEm: parecer.publicadoEm,
          atualizadoEm: parecer.atualizadoEm,
          autor: autor ? { nome: autor.nome, titulo: autor.titulo, slug: autor.slug, foto, redes: redesDe(autor) } : null,
          lei: { nome: lei.rotulo || '', identificador: lei.rotulo || '', jurisdicao: jurisdicao(lei.esfera, lei.uf) },
        })}
      />
      <Trilha
        itens={[
          { nome: 'Pareceres', caminho: '/pareceres' },
          { nome: lei.rotulo || 'Parecer', caminho: `/pareceres/${parecer.slug}` },
        ]}
      />
      <header className="lawhead">
        <Assinatura autor={autor} />
        <div className="top">
          <Local esfera={lei.esfera} uf={lei.uf} />
          <Situacao valor={lei.statusSimplificado} />
          <Impacto valor={parecer.impacto} />
          <Carater valor={parecer.carater} />
        </div>
        <h1>{parecer.titulo || lei.titulo || lei.rotulo}</h1>
        <div className="meta">
          <span>Parecer técnico sobre {lei.rotulo}</span>
          {parecer.publicadoEm ? <span>Publicado em {dataLonga(parecer.publicadoEm)}</span> : null}
          {parecer.atualizadoEm && parecer.atualizadoEm !== parecer.publicadoEm ? <span>Atualizado em {dataBR(parecer.atualizadoEm)}</span> : null}
          {analisada ? <span>Analisa: {analisada.rotulo || analisada.tipo} ({dataBR(analisada.data)})</span> : null}
          {(parecer.versao ?? 1) > 1 ? <span>Versão {parecer.versao}</span> : null}
        </div>
      </header>

      {parecer.desatualizadoDesde ? (
        <section className="block b-alert" role="note">
          <p>
            <b>O texto mudou em {dataBR(parecer.desatualizadoDesde)}.</b> Este parecer analisa a versão anterior. A atualização está em preparação e sairá nesta mesma página.
          </p>
        </section>
      ) : null}

      {parecer.notaDaVersao && (parecer.versao ?? 1) > 1 ? (
        <section className="block b-par">
          <span className="sub-h">O que mudou nesta versão</span>
          <p>{parecer.notaDaVersao}</p>
        </section>
      ) : null}

      <article className="block b-who">
        {SECOES_PARECER.map((s) =>
          textoDe(parecer.secoes?.[s.nome]) ? (
            <section key={s.nome} className="secao" id={s.nome}>
              <h2>{s.rotulo}</h2>
              <Rico valor={parecer.secoes?.[s.nome]} />
            </section>
          ) : null,
        )}
      </article>

      {materiais.length ? (
        <section className="block b-mat">
          <h2>Material de aprofundamento</h2>
          {materiais.map((m) => (
            <div key={m.id} className="mat-card">
              <span className="ic">
                <IconePdf />
              </span>
              <div>
                <b>{m.titulo}</b>
                <div className="nota-fonte">{m.visibilidade === 'publico' ? 'PDF aberto a todos' : 'PDF para inscritos'}</div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {correcoes.length ? (
        <section className="block b-who">
          <h2>Correções</h2>
          <div className="linhas">
            {correcoes.map((c) => (
              <div key={c.id}>
                <b>{dataBR(c.feitaEm)}</b>
                <span>{c.descricao}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p style={{ marginTop: 18 }}>
        <Link className="arrow" href={`/leis/${lei.slug}`}>
          Ver a lei, autores, votações e tramitação <Seta />
        </Link>
      </p>
    </div>
  )
}
