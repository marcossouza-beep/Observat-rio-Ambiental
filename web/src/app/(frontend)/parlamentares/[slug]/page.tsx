import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Bandeira, Carater } from '@/componentes/Etiquetas'
import { JsonLd } from '@/componentes/JsonLd'
import { SeguirParlamentar } from '@/componentes/SeguirParlamentar'
import { Trilha } from '@/componentes/Trilha'
import { parlamentarPorSlug } from '@/dados/consultas'
import { CARATERES, ROTULO_CARATER, ROTULO_TENDENCIA, type Carater as TipoCarater } from '@/lib/indicadores'
import { padraoDasAutorias, resumoDosVotos, ROTULO_SENTIDO, sentidoDoVoto } from '@/lib/parlamentar'
import { dataBR, UF_NOME } from '@/lib/rotulos'
import { url } from '@/lib/seo'

export const revalidate = 300
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

type Params = Promise<{ slug: string }>
const CARGO: Record<string, string> = { camara: 'Deputado(a) federal', senado: 'Senador(a)', assembleia: 'Deputado(a) estadual' }
const CASA: Record<string, string> = { camara: 'Câmara dos Deputados', senado: 'Senado Federal', assembleia: 'Assembleia Legislativa' }
const VOTO: Record<string, string> = { sim: 'Sim', nao: 'Não', abstencao: 'Abstenção', obstrucao: 'Obstrução', ausente: 'Ausente', outro: 'Outro' }
const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await parlamentarPorSlug((await params).slug)
  if (!d) return { title: 'Parlamentar não encontrado', robots: { index: false } }
  const p = d.parlamentar
  const r = resumoDosVotos(d.votos)
  const desc = r.consideradas
    ? `Como ${p.nome} (${p.partido}-${p.uf}) votou em propostas ambientais: a favor da proteção em ${r.aFavor} de ${r.consideradas} votações com parecer.`
    : `Atuação de ${p.nome} (${p.partido}-${p.uf}) em propostas ambientais: autorias, relatorias e votos.`
  return { title: `${p.nome} (${p.partido}-${p.uf}): votos e propostas ambientais`, description: desc.slice(0, 155), alternates: { canonical: `/parlamentares/${p.slug}` } }
}

export default async function PaginaParlamentar({ params }: { params: Params }) {
  const d = await parlamentarPorSlug((await params).slug)
  if (!d) notFound()
  const { parlamentar: p, votos, autorias, relatorias, emendas, caraterDe } = d
  const r = resumoDosVotos(votos)
  const padrao = padraoDasAutorias(autorias.map((a) => (caraterDe[a.id] as TipoCarater | null) ?? null))
  const caminho = `/parlamentares/${p.slug}`
  const presenca = votos.length ? Math.round((votos.filter((v) => !['ausente', 'obstrucao'].includes(v.voto)).length / votos.length) * 100) : null

  return (
    <div className="wrap">
      <JsonLd
        dados={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          url: url(caminho),
          mainEntity: { '@type': 'Person', name: p.nome, image: p.fotoUrl || undefined, jobTitle: p.casa ? CARGO[p.casa] : undefined, affiliation: p.partido ? { '@type': 'Organization', name: p.partido } : undefined },
        }}
      />
      <Trilha itens={[{ nome: 'Parlamentares', caminho: '/parlamentares' }, { nome: p.nome, caminho }]} />
      <header className="lawhead parl-cab">
        <div className="parl-foto">
          {p.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="parl-img" src={p.fotoUrl} alt={`Foto de ${p.nome}`} width={88} height={88} />
          ) : (
            <span aria-hidden="true">{iniciais(p.nome)}</span>
          )}
          {p.uf ? <Bandeira uf={p.uf} className="flag parl-flag" /> : null}
        </div>
        <div className="parl-txt">
          <span className="sub-h">
            {p.casa ? `${CARGO[p.casa]} · ${CASA[p.casa]}` : 'Parlamentar'}
            {p.emExercicio === false ? ' · fora do exercício' : ''}
          </span>
          <h1>{p.nome}</h1>
          <p>
            {[p.partido, p.uf ? UF_NOME[p.uf] || p.uf : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <SeguirParlamentar parlamentar={p.id} caminho={caminho} />
      </header>

      <section className="parl-numeros" aria-label="Em números">
        <div>
          <b>{autorias.length}</b>
          <span>propostas de autoria</span>
        </div>
        <div>
          <b>{relatorias.length}</b>
          <span>relatorias</span>
        </div>
        <div>
          <b>{emendas.length}</b>
          <span>emendas</span>
        </div>
        <div>
          <b>{presenca == null ? '—' : `${presenca}%`}</b>
          <span>presença em {votos.length} {votos.length === 1 ? 'votação' : 'votações'}</span>
        </div>
      </section>

      <section className="block b-who" id="votos">
        <h2>Como votou</h2>
        {r.consideradas ? (
          <>
            <p className="intro">
              Em <b>{r.consideradas}</b> {r.consideradas === 1 ? 'votação' : 'votações'} sobre propostas com parecer, votou no sentido da proteção em <b>{r.aFavor}</b>.
            </p>
            <div className="barra-sentido" role="img" aria-label={`A favor ${r.percentuais.aFavor}%, sem voto ${r.percentuais.semVoto}%, contra ${r.percentuais.contra}%`}>
              <i className="contra" style={{ width: `${r.percentuais.contra}%` }} />
              <i className="semvoto" style={{ width: `${r.percentuais.semVoto}%` }} />
              <i className="afavor" style={{ width: `${r.percentuais.aFavor}%` }} />
            </div>
            <div className="legenda-sentido">
              <span>
                <i className="contra" /> Contra {r.percentuais.contra}%
              </span>
              <span>
                <i className="semvoto" /> Ausente ou abstenção {r.percentuais.semVoto}%
              </span>
              <span>
                <i className="afavor" /> A favor {r.percentuais.aFavor}%
              </span>
            </div>
          </>
        ) : (
          <p className="nota-fonte">{votos.length ? 'Ainda não há parecer publicado sobre as propostas que votou.' : 'Nenhum voto registrado em propostas acompanhadas pelo site.'}</p>
        )}
        {votos.length ? (
          <div className="votos-lista">
            {votos.slice(0, 40).map((v) => {
              const s = sentidoDoVoto(v)
              return (
                <div key={v.id}>
                  <span className="vl-data">{dataBR(v.data)}</span>
                  <span className="vl-lei">
                    <Link href={`/leis/${v.lei.slug}`}>{v.lei.titulo || v.lei.rotulo}</Link>
                    <small>
                      {v.lei.rotulo}
                      {v.orgao ? ` · ${v.orgao === 'PLEN' ? 'Plenário' : v.orgao}` : ''}
                    </small>
                  </span>
                  <span className="vl-voto">{VOTO[v.voto] || v.voto}</span>
                  <span className="vl-sentido">
                    {v.carater ? <Carater valor={v.carater} /> : null}
                    <small className={`s-${s}`}>{ROTULO_SENTIDO[s]}</small>
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="block b-who" id="autorias">
        <h2>Autorias</h2>
        {padrao.distribuicao.total ? (
          <>
            <div className="barra-carater" role="img" aria-label={CARATERES.map((c) => `${ROTULO_CARATER[c]} ${padrao.distribuicao.percentuais[c]}%`).join(', ')}>
              {CARATERES.map((c) => (
                <i key={c} className={`c-${c}`} style={{ width: `${padrao.distribuicao.percentuais[c]}%` }} />
              ))}
            </div>
            <p className="nota-fonte">
              {ROTULO_TENDENCIA[padrao.tendencia.tipo]}
              {padrao.tendencia.tipo === 'amostra_pequena' ? ` (só ${padrao.distribuicao.total} com parecer; a tendência aparece a partir de 5)` : ''} ·{' '}
              {CARATERES.filter((c) => padrao.distribuicao.percentuais[c]).map((c) => `${ROTULO_CARATER[c]} ${padrao.distribuicao.percentuais[c]}%`).join(' · ')}
            </p>
          </>
        ) : null}
        {autorias.length ? (
          <div className="linhas">
            {autorias.map((a) => (
              <div key={a.id}>
                <b>{a.rotulo}</b>
                <span>
                  <Link href={`/leis/${a.slug}`}>{a.titulo || a.ementa?.slice(0, 140)}</Link> {caraterDe[a.id] ? <Carater valor={caraterDe[a.id]} /> : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="nota-fonte">Nenhuma proposta de autoria entre as acompanhadas pelo site.</p>
        )}
      </section>

      {relatorias.length || emendas.length ? (
        <section className="block b-who" id="relatorias">
          <h2>Relatorias e emendas</h2>
          <div className="linhas">
            {relatorias.map((a) => (
              <div key={`r${a.id}`}>
                <b>Relatoria</b>
                <span>
                  <Link href={`/leis/${a.slug}`}>{a.titulo || a.rotulo}</Link>
                </span>
              </div>
            ))}
            {emendas.map((e) => (
              <div key={`e${e.id}`}>
                <b>Emenda {e.numero || ''}</b>
                <span>
                  <Link href={`/leis/${e.lei.slug}`}>{e.lei.titulo || e.lei.rotulo}</Link>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="block b-pend" id="metodo">
        <h2>Método</h2>
        <p className="nota-fonte" style={{ fontSize: '0.9rem' }}>
          Voto “Sim” em proposta benéfica, ou “Não” em proposta maléfica ou que enfraquece indiretamente, conta como a favor da proteção. Propostas neutras e as que ainda não têm parecer ficam fora da conta. A página mostra o sentido dos votos em propostas acompanhadas pelo site; não avalia a pessoa. Votos e autoria vêm das bases oficiais da Câmara e do Senado.
        </p>
      </section>
    </div>
  )
}
