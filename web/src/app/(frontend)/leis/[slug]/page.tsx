import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AviseMe } from '@/componentes/AviseMe'
import { Carater, Impacto, Local, Situacao } from '@/componentes/Etiquetas'
import { SeguirLei } from '@/componentes/SeguirLei'
import { Relogio, Seta } from '@/componentes/Icones'
import { JsonLd } from '@/componentes/JsonLd'
import { Rico } from '@/componentes/Rico'
import { Trilha } from '@/componentes/Trilha'
import { leiPorSlug } from '@/dados/consultas'
import { avisoDaLei } from '@/lib/aviso'
import { oQueJaSeSabe } from '@/lib/frase'
import { notaPublica } from '@/lib/fontes'
import { textoDe } from '@/lib/publicacao'
import { CASA, dataBR, SITUACAO } from '@/lib/rotulos'
import { descricaoLei, jsonLdLei, jurisdicao, tituloLei } from '@/lib/seo'
import type { Autor, Parlamentar, Versao } from '@/payload-types'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>

function autoresDe(lei: NonNullable<Awaited<ReturnType<typeof leiPorSlug>>>['lei']) {
  return (lei.autoria || []).map((a) => {
    const p = a.parlamentar && typeof a.parlamentar === 'object' ? (a.parlamentar as Parlamentar) : null
    return { nome: p?.nome || a.nomeLivre || '', slug: p?.slug, partido: p?.partido, uf: p?.uf, papel: a.papel || 'autor', orgao: a.orgao }
  })
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await leiPorSlug((await params).slug)
  if (!d) return { title: 'Lei não encontrada', robots: { index: false } }
  const a = avisoDaLei(d.lei, d.parecer)
  const estado = a.tipo === 'parecer' || a.tipo === 'desatualizado' ? 'parecer' : a.tipo
  const autores = autoresDe(d.lei).filter((a) => a.papel !== 'relator')
  const ultima = d.votacoes[0]
  const frase = oQueJaSeSabe({ ...d.lei, autores, emendas: d.emendas, ultimaVotacao: ultima ? { data: ultima.data, orgao: ultima.orgao, sim: ultima.placarSim, nao: ultima.placarNao } : null })
  const titulo = tituloLei(d.lei, estado)
  return {
    title: titulo,
    description: descricaoLei(d.lei, frase, estado),
    alternates: { canonical: `/leis/${d.lei.slug}` },
    openGraph: { title: titulo, type: 'article' },
  }
}

export default async function PaginaLei({ params }: { params: Params }) {
  const d = await leiPorSlug((await params).slug)
  if (!d) notFound()
  const { lei, parecer, tramitacoes, votacoes, emendas, versoes, fonte } = d
  const aviso = avisoDaLei(lei, parecer)
  const pessoas = autoresDe(lei)
  const autores = pessoas.filter((a) => a.papel !== 'relator')
  const relatores = pessoas.filter((a) => a.papel === 'relator')
  const ultima = votacoes[0]
  const frase = oQueJaSeSabe({ ...lei, autores, emendas, ultimaVotacao: ultima ? { data: ultima.data, orgao: ultima.orgao, sim: ultima.placarSim, nao: ultima.placarNao } : null })
  const nota = fonte
    ? notaPublica(
        { manual: fonte.manual ?? false, ultimaColetaOk: fonte.ultimaColetaOk ? new Date(fonte.ultimaColetaOk) : null, itensUltimaColeta: fonte.itensUltimaColeta, mediaItens30d: fonte.mediaItens30d },
        fonte.nome,
        new Date(),
      )
    : null
  const comParecer = aviso.tipo === 'parecer' || aviso.tipo === 'desatualizado'
  const analisada = parecer?.versaoTexto && typeof parecer.versaoTexto === 'object' ? (parecer.versaoTexto as Versao) : null
  const autorParecer = parecer?.autor && typeof parecer.autor === 'object' ? (parecer.autor as Autor) : null
  const casaRotulo = lei.esfera === 'federal' ? 'Leis federais' : 'Leis estaduais'

  return (
    <div className="wrap">
      <JsonLd
        dados={jsonLdLei({
          nome: lei.titulo ? `${lei.rotulo} — ${lei.titulo}` : lei.rotulo || '',
          identificador: lei.rotulo || '',
          jurisdicao: jurisdicao(lei.esfera, lei.uf),
          caminho: `/leis/${lei.slug}`,
          data: lei.dataApresentacao,
          situacao: lei.statusSimplificado ? SITUACAO[lei.statusSimplificado]?.rotulo : undefined,
        })}
      />
      <Trilha
        itens={[
          { nome: casaRotulo, caminho: `/leis?esfera=${lei.esfera}` },
          { nome: lei.rotulo || 'Lei', caminho: `/leis/${lei.slug}` },
        ]}
      />
      <header className="lawhead">
        <div className="top">
          <Local esfera={lei.esfera} uf={lei.uf} />
          <Situacao valor={lei.statusSimplificado} />
          {comParecer ? (
            <>
              <Impacto valor={parecer?.impacto} />
              <Carater valor={parecer?.carater} />
            </>
          ) : null}
        </div>
        <h1>{lei.titulo || lei.rotulo}</h1>
        <span className="num">
          {lei.rotulo}
          {lei.casa ? ` · ${CASA[lei.casa]}` : ''}
        </span>
        <SeguirLei proposicao={lei.id} caminho={`/leis/${lei.slug}`} />
      </header>

      <nav className="steps" aria-label="Seções da página">
        <a href="#a-lei">A lei</a>
        <a href="#quem">Quem</a>
        <a href="#parecer">{comParecer ? 'Parecer' : aviso.tipo === 'em_preparacao' ? 'Parecer em breve' : 'Acompanhamento'}</a>
        {tramitacoes.length ? <a href="#tramitacao">Tramitação</a> : null}
      </nav>

      <section className="block b-law" id="a-lei">
        <h2>A lei</h2>
        <div className="lawtext">
          {lei.ementa ? (
            <>
              <span className="sub-h">Ementa</span>
              <p>{lei.ementa}</p>
            </>
          ) : null}
          {lei.art1 ? (
            <>
              <span className="sub-h">Art. 1º</span>
              <p>{lei.art1}</p>
            </>
          ) : null}
          {lei.leisAfetadas?.length ? (
            <>
              <span className="sub-h">Leis citadas na ementa</span>
              <p className="leis-citadas">
                {lei.leisAfetadas.map((l, i) => (
                  <a key={l.id || i} href={l.url || '#'} target="_blank" rel="noopener">
                    {l.rotulo}
                  </a>
                ))}
              </p>
            </>
          ) : null}
        </div>
        {lei.urlInteiroTeor || lei.urlFonte ? (
          <a className="link-oficial" href={lei.urlInteiroTeor || lei.urlFonte || '#'} target="_blank" rel="noopener">
            Texto integral na fonte oficial <Seta />
          </a>
        ) : null}
        {versoes.length > 1 ? (
          <div className="linhas">
            {versoes.map((v) => (
              <div key={v.id}>
                <b>{dataBR(v.data)}</b>
                <span>
                  {v.url ? (
                    <a href={v.url} target="_blank" rel="noopener">
                      {v.rotulo || v.tipo}
                    </a>
                  ) : (
                    v.rotulo || v.tipo
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {nota ? <p className="nota-fonte">{nota}</p> : null}
      </section>

      <section className="block b-who" id="quem">
        <h2>Quem está por trás</h2>
        <div className="linhas">
          {autores.map((a, i) => (
            <div key={`a${i}`}>
              <b>{i === 0 ? 'Autoria' : ''}</b>
              <span>
                {a.slug ? <Link href={`/parlamentares/${a.slug}`}>{a.nome}</Link> : a.nome}
                {a.partido ? ` (${a.partido}${a.uf ? `-${a.uf}` : ''})` : ''}
              </span>
            </div>
          ))}
          {relatores.map((a, i) => (
            <div key={`r${i}`}>
              <b>Relatoria</b>
              <span>
                {a.slug ? <Link href={`/parlamentares/${a.slug}`}>{a.nome}</Link> : a.nome}
                {a.partido ? ` (${a.partido}${a.uf ? `-${a.uf}` : ''})` : ''}
                {a.orgao ? ` · ${a.orgao}` : ''}
              </span>
            </div>
          ))}
          <div>
            <b>Emendas</b>
            <span>{emendas ? `${emendas} ${emendas === 1 ? 'apresentada' : 'apresentadas'}` : 'Nenhuma até agora'}</span>
          </div>
          {votacoes.map((v) => (
            <div key={v.id}>
              <b>{dataBR(v.data)}</b>
              <span className="placar">
                <span>{v.orgao || 'Votação'}</span>
                {v.placarSim != null && v.placarNao != null ? (
                  <span>
                    <span className="sim">{v.placarSim} sim</span> · <span className="nao">{v.placarNao} não</span>
                  </span>
                ) : (
                  <span>{v.resultado || 'votação simbólica'}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {aviso.tipo === 'desatualizado' ? (
        <section className="block b-alert" role="note">
          <p>
            <b>O texto mudou em {dataBR(aviso.desde)}.</b> Este parecer analisa {analisada ? `a versão "${analisada.rotulo || analisada.tipo}" de ${dataBR(analisada.data)}` : 'uma versão anterior'}. A
            atualização está em preparação.
          </p>
        </section>
      ) : null}

      {comParecer && parecer ? (
        <section className="block b-par" id="parecer">
          <h2>
            Parecer técnico
            {autorParecer ? <small>por {autorParecer.nome}</small> : null}
          </h2>
          {textoDe(parecer.secoes?.resumo) ? <Rico valor={parecer.secoes?.resumo} /> : null}
          <Link className="pill-btn" href={`/pareceres/${parecer.slug}`} style={{ justifySelf: 'start' }}>
            Ler o parecer completo <Seta />
          </Link>
        </section>
      ) : aviso.tipo === 'em_preparacao' ? (
        <section className="block b-pend" id="parecer">
          <div className="pend-h">
            <span className="pend-ico">
              <Relogio />
            </span>
            <div>
              <h2>Parecer em preparação</h2>
              <p>O parecer técnico sobre {lei.rotulo} está sendo escrito e será publicado nos próximos dias, nesta mesma página.</p>
            </div>
          </div>
          <div className="pend-facts">
            <span className="sub-h">O que já se sabe</span>
            <p>{frase}</p>
            {nota ? <small>{nota}</small> : null}
          </div>
          <AviseMe proposicao={lei.id} caminho={`/leis/${lei.slug}`} />
        </section>
      ) : (
        <section className="block b-pend" id="parecer">
          <h2>Acompanhando</h2>
          <p style={{ color: 'var(--gray)' }}>O observatório acompanha esta proposta. Quando houver novidade relevante, ela aparece aqui.</p>
          <div className="pend-facts">
            <span className="sub-h">O que já se sabe</span>
            <p>{frase}</p>
          </div>
        </section>
      )}

      {tramitacoes.length ? (
        <section className="block b-who" id="tramitacao">
          <h2>Tramitação</h2>
          <div className="linhas">
            {tramitacoes.slice(0, 12).map((t) => (
              <div key={t.id}>
                <b>{dataBR(t.data)}</b>
                <span>
                  {t.orgao ? <strong style={{ fontWeight: 600 }}>{t.orgao}: </strong> : null}
                  {t.descricao}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
