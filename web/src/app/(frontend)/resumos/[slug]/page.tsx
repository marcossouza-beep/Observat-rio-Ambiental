import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Assinatura, redesDe } from '@/componentes/Autor'
import { AvisoPdf } from '@/componentes/AvisoPdf'
import { FormCorrecao } from '@/componentes/FormCorrecao'
import { Carater, Impacto, Local, Situacao } from '@/componentes/Etiquetas'
import { IconePdf, Seta } from '@/componentes/Icones'
import { JsonLd } from '@/componentes/JsonLd'
import { Rico } from '@/componentes/Rico'
import { Cotejo, normaDe, TextoBase } from '@/componentes/TextoBase'
import { Trilha } from '@/componentes/Trilha'
import { parecerPorSlug, payloadSite } from '@/dados/consultas'
import { type NomeSecao, romano, SECOES_PARECER, textoDe } from '@/lib/publicacao'
import { dataBR, dataLonga } from '@/lib/rotulos'
import { descricaoParecer, jsonLdParecer, jurisdicao, palavrasDaPagina, tituloParecer } from '@/lib/seo'
import { leisAlteradas } from '@/lib/alteracoes'
import { leisCitadas } from '@/lib/leis'
import type { Autor, Material, Media, Versao } from '@/payload-types'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await parecerPorSlug((await params).slug)
  if (!d) return { title: 'Resumo prévio não encontrado', robots: { index: false } }
  const titulo = tituloParecer(d.parecer, d.lei)
  return {
    title: titulo,
    description: descricaoParecer(d.parecer, textoDe(d.parecer.secoes?.resumo)),
    keywords: palavrasDaPagina(d.parecer.seo, alteradasDe(d)),
    alternates: { canonical: `/resumos/${d.parecer.slug}` },
    robots: d.parecer.seo?.indexar === false ? { index: false, follow: true } : undefined,
    openGraph: { title: titulo, type: 'article', publishedTime: d.parecer.publicadoEm || undefined, modifiedTime: d.parecer.atualizadoEm || undefined },
  }
}

type Dados = NonNullable<Awaited<ReturnType<typeof parecerPorSlug>>>
const alteradasDe = (d: Pick<Dados, 'lei' | 'alteracoes' | 'normas'>) =>
  leisAlteradas(d.alteracoes, leisCitadas(d.lei.ementa)).map((l) => ({ ...l, nomePopular: normaDe(d.normas, l, d.lei.esfera === 'estadual' ? d.lei.uf : null)?.nomePopular || l.nomePopular }))

export default async function PaginaParecer({ params }: { params: Params }) {
  const d = await parecerPorSlug((await params).slug)
  if (!d) notFound()
  const { parecer, lei, correcoes, original, alteracoes, normas } = d
  const autor = parecer.autor && typeof parecer.autor === 'object' ? (parecer.autor as Autor) : null
  const analisada = parecer.versaoTexto && typeof parecer.versaoTexto === 'object' ? (parecer.versaoTexto as Versao) : null
  const materiais = [parecer.materiais?.notaTecnica, parecer.materiais?.quadroComparativo].filter((m): m is Material => !!m && typeof m === 'object')
  const titulo = tituloParecer(parecer, lei)
  const foto = autor?.foto && typeof autor.foto === 'object' ? (autor.foto as Media).url : null
  const ajustes = await (await payloadSite()).findGlobal({ slug: 'ajustes', depth: 0 })
  // Partes do parecer prévio: I é sempre o texto base; as seções escritas seguem numeradas a partir de II
  const partes = [
    { id: 'texto-base', rotulo: 'Texto base da proposta' },
    ...SECOES_PARECER.filter((s) => textoDe(parecer.secoes?.[s.nome])).map((s) => ({ id: s.nome, rotulo: s.rotulo })),
  ].map((p, i) => ({ ...p, n: romano(i + 1) }))

  return (
    <div className="wrap">
      <JsonLd
        dados={jsonLdParecer({
          titulo,
          caminho: `/resumos/${parecer.slug}`,
          publicadoEm: parecer.publicadoEm,
          atualizadoEm: parecer.atualizadoEm,
          autor: autor ? { nome: autor.nome, titulo: autor.titulo, slug: autor.slug, foto, redes: redesDe(autor) } : null,
          lei: { nome: lei.rotulo || '', identificador: lei.rotulo || '', jurisdicao: jurisdicao(lei.esfera, lei.uf) },
          palavras: palavrasDaPagina(parecer.seo, alteradasDe(d)),
          alteradas: alteradasDe(d),
        })}
      />
      <Trilha
        itens={[
          { nome: 'Resumos prévios', caminho: '/resumos' },
          { nome: lei.rotulo || 'Resumo prévio', caminho: `/resumos/${parecer.slug}` },
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
          <span>Resumo prévio sobre {lei.rotulo}</span>
          {parecer.seo?.nomePopular ? <span>Conhecido como “{parecer.seo.nomePopular}”</span> : null}
          {parecer.publicadoEm ? <span>Publicado em {dataLonga(parecer.publicadoEm)}</span> : null}
          {parecer.atualizadoEm && parecer.atualizadoEm !== parecer.publicadoEm ? <span>Atualizado em {dataBR(parecer.atualizadoEm)}</span> : null}
          {analisada ? <span>Analisa: {analisada.rotulo || analisada.tipo} ({dataBR(analisada.data)})</span> : null}
          {(parecer.versao ?? 1) > 1 ? <span>Versão {parecer.versao}</span> : null}
        </div>
      </header>

      <Suspense fallback={null}>
        <AvisoPdf versaoAtual={parecer.versao ?? 1} atualizadoEm={dataBR(parecer.atualizadoEm || parecer.publicadoEm) || undefined} />
      </Suspense>

      {parecer.desatualizadoDesde ? (
        <section className="block b-alert" role="note">
          <p>
            <b>O texto mudou em {dataBR(parecer.desatualizadoDesde)}.</b> Este resumo prévio analisa a versão anterior. A atualização está em preparação e sairá nesta mesma página.
          </p>
        </section>
      ) : null}

      {parecer.notaDaVersao && (parecer.versao ?? 1) > 1 ? (
        <section className="block b-par">
          <span className="sub-h">O que mudou nesta versão</span>
          <p>{parecer.notaDaVersao}</p>
        </section>
      ) : null}

      <article className="block b-who pp">
        <nav className="pp-sumario" aria-label="Partes do resumo prévio">
          <span className="sub-h">Sumário</span>
          <ol>
            {partes.map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`}>
                  <span>{p.n}.</span> {p.rotulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {partes.map((p) => (
          <section key={p.id} className="secao" id={p.id}>
            <h2>
              <span className="pp-n">{p.n}.</span> {p.rotulo}
            </h2>
            {p.id === 'texto-base' ? (
              <TextoBase lei={lei} analisada={analisada} original={original} alteracoes={alteracoes} normas={normas} />
            ) : (
              <>
                <Rico valor={parecer.secoes?.[p.id as NomeSecao]} />
                {p.id === 'oQueMuda' ? <Cotejo pontos={parecer.secoes?.comparativo || []} /> : null}
              </>
            )}
          </section>
        ))}
      </article>

      {materiais.length ? (
        <section className="block b-mat">
          <h2>Aprofunde</h2>
          <p>O parecer técnico é a análise completa, com o texto base e a leitura do cotejo: problema, hipótese, cenários e soluções. O quadro comparativo traz o cotejo literal dos textos, a testagem das hipóteses e a comparação dos cenários, com gráficos. Os dois PDFs levam a identificação deste resumo prévio e um link de volta a esta página, para quem os receber depois.</p>
          {materiais.map((m) => (
            <a key={m.id} className="mat-card" href={`/api/baixar/${m.id}`} rel="nofollow">
              <span className="ic">
                <IconePdf />
              </span>
              <div>
                <b>{m.titulo}</b>
                <div className="nota-fonte">{m.visibilidade === 'publico' ? 'Baixar PDF' : 'Baixar PDF · grátis para inscritos'}</div>
              </div>
            </a>
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

      <section className="block b-who">
        <FormCorrecao parecer={parecer.id} prazoDiasUteis={ajustes.prazos?.correcao || 3} />
      </section>

      <p style={{ marginTop: 18 }}>
        <Link className="arrow" href={`/leis/${lei.slug}`}>
          Ver a lei, autores, votações e tramitação <Seta />
        </Link>
      </p>
    </div>
  )
}
