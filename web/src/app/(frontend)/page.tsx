import Link from 'next/link'
import { CartaoLei } from '@/componentes/CartaoLei'
import { Local } from '@/componentes/Etiquetas'
import { IconeArtigos, IconeEstadual, IconeFederal, IconeOpiniao, Lupa, Seta } from '@/componentes/Icones'
import { JsonLd } from '@/componentes/JsonLd'
import { BarraCarater, SeloTendencia } from '@/componentes/Padrao'
import { contagens, dadosDoPanorama, emVotacao, listarLeis, pareceresDe } from '@/dados/consultas'
import { padrao } from '@/lib/panorama'
import { jsonLdSite } from '@/lib/seo'
import type { Proposicao } from '@/payload-types'

export const revalidate = 300

const curta = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '')

export default async function Inicio() {
  const [agenda, n, recentes, panorama] = await Promise.all([emVotacao(7), contagens(), listarLeis({}, 6), dadosDoPanorama()])
  const pareceres = await pareceresDe(recentes.docs.map((l) => l.id))
  const geral = padrao(panorama.itens)
  const explore = [
    { href: '/leis?esfera=federal', icone: <IconeFederal />, titulo: 'Leis federais', desc: 'Câmara, Senado e Presidência', n: `${n.federais} ${n.federais === 1 ? 'lei acompanhada' : 'leis acompanhadas'}` },
    { href: '/estaduais', icone: <IconeEstadual />, titulo: 'Leis estaduais', desc: 'Assembleias Legislativas', n: `${n.estaduais} ${n.estaduais === 1 ? 'lei' : 'leis'} · ${n.estados} ${n.estados === 1 ? 'estado' : 'estados'}` },
    { href: '/pareceres', icone: <IconeOpiniao />, titulo: 'Opinião', desc: 'Os pareceres técnicos', n: `${n.pareceres} ${n.pareceres === 1 ? 'parecer publicado' : 'pareceres publicados'}` },
    { href: '/artigos', icone: <IconeArtigos />, titulo: 'Artigos', desc: 'Tendências, explicadores e dados', n: `${n.artigos} ${n.artigos === 1 ? 'artigo' : 'artigos'}` },
  ]
  return (
    <div className="wrap">
      <JsonLd dados={jsonLdSite()} />
      <section className="hero">
        <h1>
          Leis <em>ambientais</em> explicadas,
          <br />
          antes de virarem <em>realidade.</em>
        </h1>
        <p>Acompanhe o que está em votação no seu estado e no Congresso, com parecer técnico em linguagem clara.</p>
        <form className="search" action="/busca" role="search">
          <Lupa />
          <input name="q" type="search" placeholder="Busque uma lei, tema ou estado" aria-label="Buscar" />
          <button className="pill-btn" type="submit">
            Pesquisar
          </button>
        </form>
        <div className="hints">
          <span>Experimente:</span>
          {['licenciamento', 'Pantanal', 'garimpo', 'agrotóxicos'].map((t) => (
            <Link key={t} href={`/busca?q=${encodeURIComponent(t)}`}>
              {t}
            </Link>
          ))}
        </div>
      </section>

      {agenda.length ? (
        <section className="section">
          <div className="section-h">
            <h2>Em votação esta semana</h2>
            <span>pauta oficial, sujeita a mudança</span>
          </div>
          <div className="agenda">
            {agenda.slice(0, 4).map((t) => {
              const p = t.proposicao as Proposicao
              return (
                <Link key={t.id} href={`/leis/${p.slug}`}>
                  <span className="d">{curta(t.data)}</span>
                  <div>
                    <p>{p.titulo || p.rotulo}</p>
                    <span className="o">
                      <Local esfera={p.esfera} uf={p.uf} /> {t.orgao}
                    </span>
                  </div>
                  <span className="seta">
                    <Seta />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-h">
          <h2>Explore</h2>
        </div>
        <div className="tgrid">
          {explore.map((c) => (
            <Link key={c.href} className="tcard" href={c.href}>
              <span className="tico">{c.icone}</span>
              <div>
                <b>{c.titulo}</b>
                <span>{c.desc}</span>
                <small>{c.n}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-h">
          <h2>Mais recentes</h2>
          <div className="chips">
            <Link className="chip" href="/leis">
              Todas
            </Link>
            <Link className="chip" href="/leis?situacao=em_tramitacao">
              Em tramitação
            </Link>
            <Link className="chip" href="/leis?situacao=aprovada">
              Aprovadas
            </Link>
          </div>
        </div>
        <div className="list">
          {recentes.docs.length ? (
            recentes.docs.map((l) => <CartaoLei key={l.id} lei={l} parecer={pareceres.get(l.id)} />)
          ) : (
            <p className="empty">As primeiras leis acompanhadas aparecem aqui em breve.</p>
          )}
        </div>
        {recentes.totalDocs > recentes.docs.length ? (
          <Link className="arrow" href="/leis">
            Ver todas as {recentes.totalDocs} leis <Seta />
          </Link>
        ) : null}
      </section>

      {geral.total ? (
        <Link className="pano-chamada" href="/panorama">
          <span className="pc-t">
            <b>Panorama</b> · para que lado vão as propostas ({geral.total} {geral.total === 1 ? 'parecer' : 'pareceres'})
          </span>
          <BarraCarater d={geral.tudo} fina />
          <span className="pc-s">
            <SeloTendencia t={geral.tendencia} /> Ver Panorama <Seta />
          </span>
        </Link>
      ) : null}

      <section className="cta">
        <div>
          <h2>Notas técnicas e quadros comparativos</h2>
          <p>Grátis para inscritos, com aviso no dia em que sai o parecer das leis que você segue.</p>
        </div>
        <Link className="pill-btn" href="/inscricao">
          Se inscreva grátis
        </Link>
      </section>
    </div>
  )
}
