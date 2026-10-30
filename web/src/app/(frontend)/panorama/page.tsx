import type { Metadata } from 'next'
import Link from 'next/link'
import { Bandeira } from '@/componentes/Etiquetas'
import { BarraCarater, LegendaCarater, SeloTendencia, textoTendencia } from '@/componentes/Padrao'
import { Trilha } from '@/componentes/Trilha'
import { dadosDoPanorama } from '@/dados/consultas'
import { AMOSTRA_MINIMA, CARATERES, LIMIAR_TENDENCIA, ROTULO_CARATER, ROTULO_TENDENCIA } from '@/lib/indicadores'
import { agrupar, chavesDeJurisdicao, padrao, ranking, ROTULO_CASA, type CasaFederal, type Padrao } from '@/lib/panorama'
import { UF_NOME } from '@/lib/rotulos'

export const revalidate = 300

type Busca = Promise<{ aba?: string; so?: string }>

export async function generateMetadata({ searchParams }: { searchParams: Busca }): Promise<Metadata> {
  const s = await searchParams
  return {
    title: 'Panorama da legislação ambiental',
    description: 'Para que lado vão as propostas ambientais, por casa do Congresso, estado, bioma e área, calculado a partir dos resumos prévios publicados.',
    alternates: { canonical: '/panorama' },
    robots: s.aba || s.so ? { index: false, follow: true } : undefined,
  }
}

const ABAS = [
  ['casas', 'Casas e estados'],
  ['biomas', 'Biomas'],
  ['areas', 'Áreas'],
] as const

type Linha = { chave: string; nome: string; href: string; bandeira: string; padrao: Padrao; propostas: number }

function Tabela({ linhas, aprovadas, rotulo }: { linhas: Linha[]; aprovadas: boolean; rotulo: string }) {
  return (
    <details className="como-tabela">
      <summary>Ver como tabela</summary>
      <div className="tabela-rolagem">
        <table>
          <caption>{rotulo}</caption>
          <thead>
            <tr>
              <th scope="col">Grupo</th>
              <th scope="col">Resumos prévios</th>
              {CARATERES.map((c) => (
                <th key={c} scope="col">
                  {ROTULO_CARATER[c]}
                </th>
              ))}
              <th scope="col">Tendência</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const d = aprovadas ? l.padrao.aprovadas : l.padrao.tudo
              const t = aprovadas ? l.padrao.tendenciaAprovadas : l.padrao.tendencia
              return (
                <tr key={l.chave}>
                  <th scope="row">{l.nome}</th>
                  <td>{d.total}</td>
                  {CARATERES.map((c) => (
                    <td key={c}>{d.total ? `${d.percentuais[c]}%` : '–'}</td>
                  ))}
                  <td>{ROTULO_TENDENCIA[t.tipo]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Ranking({ linhas, aprovadas }: { linhas: Linha[]; aprovadas: boolean }) {
  return (
    <div className="ranking">
      {linhas.map((l) => {
        const d = aprovadas ? l.padrao.aprovadas : l.padrao.tudo
        const t = aprovadas ? l.padrao.tendenciaAprovadas : l.padrao.tendencia
        return (
          <Link key={l.chave} href={l.href} className="ranking-linha">
            <span className="rk-nome">
              <Bandeira uf={l.bandeira} /> {l.nome}
              <small>
                {d.total} {d.total === 1 ? 'resumo prévio' : 'resumos prévios'} · {l.propostas} {l.propostas === 1 ? 'proposta acompanhada' : 'propostas acompanhadas'}
              </small>
            </span>
            {d.total ? <BarraCarater d={d} fina /> : <span className="barra-carater vazia" />}
            <span className="rk-tend">
              <SeloTendencia t={t} />
              <small>{textoTendencia(t)}</small>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default async function Panorama({ searchParams }: { searchParams: Busca }) {
  const s = await searchParams
  const aba = ABAS.some(([k]) => k === s.aba) ? s.aba! : 'casas'
  const aprovadas = s.so === 'aprovadas'
  const { itens, propostas, temas, biomas } = await dadosDoPanorama()
  const href = (extra: { aba?: string; so?: string }) => {
    const p = new URLSearchParams()
    const tudo = { aba: aba === 'casas' ? undefined : aba, so: aprovadas ? 'aprovadas' : undefined, ...extra }
    Object.entries(tudo).forEach(([k, v]) => v && p.set(k, v))
    const q = p.toString()
    return q ? `/panorama?${q}` : '/panorama'
  }

  const porJurisdicao = agrupar(itens, chavesDeJurisdicao)
  const propsPorJurisdicao = agrupar(propostas, chavesDeJurisdicao)
  const linha = (chave: string, nome: string, hrefLei: string, bandeira: string): Linha => ({
    chave,
    nome,
    href: hrefLei,
    bandeira,
    padrao: padrao(porJurisdicao.get(chave) || []),
    propostas: propsPorJurisdicao.get(chave)?.length || 0,
  })
  const casas: CasaFederal[] = ['camara', 'senado', 'presidencia', ...(porJurisdicao.has('congresso') || propsPorJurisdicao.has('congresso') ? (['congresso'] as const) : [])]
  const federal = [linha('uniao', 'União (todo o federal)', '/leis?esfera=federal', 'BR'), ...ranking(casas.map((c) => linha(c, ROTULO_CASA[c], `/leis?esfera=federal&casa=${c}`, 'BR')))]
  const ufs = [...new Set([...porJurisdicao.keys(), ...propsPorJurisdicao.keys()].filter((k) => k.startsWith('uf:')).map((k) => k.slice(3)))]
  const estados = ranking(ufs.map((uf) => linha(`uf:${uf}`, UF_NOME[uf] || uf, `/leis?uf=${uf}`, uf)))

  const porBioma = agrupar(itens, (i) => i.biomas)
  const propsPorBioma = agrupar(propostas, (p) => p.biomas)
  const porArea = agrupar(itens, (i) => i.areas)
  const propsPorArea = agrupar(propostas, (p) => p.temas)
  const nomesAreas = new Map(temas.map((t) => [t.id, t]))
  const maxArea = Math.max(1, ...temas.map((t) => porArea.get(String(t.id))?.length || 0))

  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Panorama', caminho: '/panorama' }]} />
      <header className="lawhead">
        <h1>Panorama</h1>
        <p className="intro">Para que lado vão as propostas ambientais: o caráter de cada resumo prévio publicado, somado por casa, estado, bioma e área. Avaliamos propostas, não pessoas.</p>
      </header>

      {!itens.length ? (
        <p className="empty">O Panorama aparece aqui assim que houver resumos prévios publicados. Nenhum número é digitado: tudo sai da classificação dos resumos prévios.</p>
      ) : (
        <>
          <nav className="chips abas" aria-label="Abas do Panorama">
            {ABAS.map(([k, t]) => (
              <Link key={k} className="chip" aria-current={aba === k ? 'page' : undefined} href={href({ aba: k === 'casas' ? undefined : k })}>
                {t}
              </Link>
            ))}
          </nav>

          {aba === 'casas' ? (
            <section className="section">
              <div className="chips" style={{ marginBottom: 12 }}>
                <Link className="chip" aria-current={!aprovadas ? 'true' : undefined} href={href({ so: undefined })}>
                  Tudo que tramitou
                </Link>
                <Link className="chip" aria-current={aprovadas ? 'true' : undefined} href={href({ so: 'aprovadas' })}>
                  Só aprovadas
                </Link>
              </div>
              <div className="section-h">
                <h2>União e casas</h2>
                <span>pela casa onde a proposta começou</span>
              </div>
              <Ranking linhas={federal} aprovadas={aprovadas} />
              <Tabela linhas={federal} aprovadas={aprovadas} rotulo="União e casas" />
              <div className="section-h" style={{ marginTop: 26 }}>
                <h2>Estados</h2>
                <span>{estados.length ? 'só estados com propostas acompanhadas' : ''}</span>
              </div>
              {estados.length ? (
                <>
                  <Ranking linhas={estados} aprovadas={aprovadas} />
                  <Tabela linhas={estados} aprovadas={aprovadas} rotulo="Estados" />
                </>
              ) : (
                <p className="empty">Ainda não há propostas estaduais acompanhadas.</p>
              )}
            </section>
          ) : null}

          {aba === 'biomas' ? (
            <section className="section">
              <div className="pano-cards">
                {biomas.map((b) => {
                  const p = padrao(porBioma.get(String(b.id)) || [])
                  const nProps = propsPorBioma.get(String(b.id))?.length || 0
                  const areas = p.areas.slice(0, 3).filter((a) => nomesAreas.has(a.id))
                  return (
                    <article key={b.id} className="pano-card">
                      <h3>
                        <Link href={`/biomas/${b.slug}`}>{b.nome}</Link>
                      </h3>
                      <p className="nota-fonte">
                        {p.total} {p.total === 1 ? 'resumo prévio' : 'resumos prévios'} · {nProps} {nProps === 1 ? 'proposta' : 'propostas'}
                        {p.total ? ` · ${p.altoImpacto}% de alto impacto` : ''}
                      </p>
                      {p.total ? <BarraCarater d={p.tudo} fina /> : <span className="barra-carater vazia" />}
                      <p className="pano-tend">
                        <SeloTendencia t={p.tendencia} /> <small>{textoTendencia(p.tendencia)}</small>
                      </p>
                      {b.pressoes || b.avancos || areas.length ? (
                        <details>
                          <summary>Detalhes</summary>
                          {b.pressoes ? (
                            <>
                              <h4>Principais pressões</h4>
                              <p>{b.pressoes}</p>
                            </>
                          ) : null}
                          {b.avancos ? (
                            <>
                              <h4>Principais avanços</h4>
                              <p>{b.avancos}</p>
                            </>
                          ) : null}
                          {areas.length ? (
                            <p className="nota-fonte">
                              Áreas mais frequentes:{' '}
                              {areas.map((a, i) => (
                                <span key={a.id}>
                                  {i ? ', ' : ''}
                                  <Link href={`/temas/${nomesAreas.get(a.id)!.slug}`}>{nomesAreas.get(a.id)!.nome}</Link> ({a.n})
                                </span>
                              ))}
                            </p>
                          ) : null}
                        </details>
                      ) : null}
                      <Link className="arrow" href={`/biomas/${b.slug}`}>
                        Ver leis do bioma
                      </Link>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}

          {aba === 'areas' ? (
            <section className="section">
              <div className="areas-lista">
                {temas.map((t) => {
                  const p = padrao(porArea.get(String(t.id)) || [])
                  const nProps = propsPorArea.get(String(t.id))?.length || 0
                  return (
                    <div key={t.id} className="area-linha">
                      <span className="rk-nome">
                        <Link href={`/temas/${t.slug}`}>{t.nome}</Link>
                        <small>
                          {nProps} {nProps === 1 ? 'proposta' : 'propostas'}
                        </small>
                      </span>
                      <span className="qtd" aria-label={`${p.total} resumos prévios`}>
                        <i style={{ width: `${Math.round((p.total / maxArea) * 100)}%` }} />
                        <b>{p.total}</b>
                      </span>
                      {p.total ? <BarraCarater d={p.tudo} fina /> : <span className="barra-carater vazia" />}
                      <SeloTendencia t={p.tendencia} />
                      {t.oQueTemosVisto ? (
                        <details className="area-visto">
                          <summary>O que temos visto</summary>
                          <p>{t.oQueTemosVisto}</p>
                        </details>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="section metodo" id="metodo">
        <div className="section-h">
          <h2>Como calculamos</h2>
        </div>
        <LegendaCarater />
        <ul>
          <li>Só entram resumos prévios publicados, cada um com a classificação de caráter feita pelo autor. Nenhum número é digitado.</li>
          <li>
            <b>Enfraquece indiretamente:</b> a proposta não muda a proteção de forma direta, mas abre caminho para o dano (corta fiscalização ou orçamento, amplia prazos, cria exceções que dependem de
            regulamento).
          </li>
          <li>
            <b>Tendência:</b> % de benéficos menos % de maléficos e indiretos. Com {LIMIAR_TENDENCIA} pontos ou mais, &quot;tende a proteger&quot;; com −{LIMIAR_TENDENCIA} ou menos, &quot;tende a enfraquecer&quot;;
            entre os dois, &quot;equilibrada&quot;.
          </li>
          <li>
            <b>Amostra mínima:</b> grupos com menos de {AMOSTRA_MINIMA} resumos prévios aparecem como &quot;amostra pequena&quot; e não recebem tendência.
          </li>
          <li>
            <b>Só aprovadas:</b> o mesmo cálculo, só com as propostas aprovadas ou que já viraram norma.
          </li>
          <li>
            <b>Casas:</b> cada proposta federal conta para a casa onde começou (medidas provisórias, para a Presidência) e também para a União.
          </li>
          <li>
            <b>Biomas e áreas:</b> um resumo prévio pode contar em mais de um bioma ou área; por isso as somas passam do total.
          </li>
        </ul>
      </section>
    </div>
  )
}
