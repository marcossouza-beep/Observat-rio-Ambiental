import type { Metadata } from 'next'
import Link from 'next/link'
import { CartaoLei } from '@/componentes/CartaoLei'
import { PadraoAtuacao } from '@/componentes/Padrao'
import { Trilha } from '@/componentes/Trilha'
import { dadosDoPanorama, listarLeis, pareceresDe } from '@/dados/consultas'
import { agrupar, chavesDeJurisdicao, padrao, ROTULO_CASA, type CasaFederal } from '@/lib/panorama'
import { UF_NOME } from '@/lib/rotulos'

type Busca = Promise<{ esfera?: string; casa?: string; situacao?: string; uf?: string; pagina?: string }>

const CASAS: CasaFederal[] = ['camara', 'senado', 'presidencia']
const casaValida = (c?: string) => (c && c in ROTULO_CASA ? (c as CasaFederal) : undefined)

const titulo = (esfera?: string, uf?: string, casa?: CasaFederal) =>
  uf && UF_NOME[uf.toUpperCase()]
    ? `Leis ambientais do estado: ${UF_NOME[uf.toUpperCase()]}`
    : esfera === 'federal'
      ? casa
        ? `Leis ambientais federais: ${ROTULO_CASA[casa]}`
        : 'Leis ambientais federais'
      : esfera === 'estadual'
        ? 'Leis ambientais estaduais'
        : 'Leis ambientais acompanhadas'

export async function generateMetadata({ searchParams }: { searchParams: Busca }): Promise<Metadata> {
  const s = await searchParams
  const filtrada = !!(s.situacao || s.pagina || s.casa)
  return {
    title: titulo(s.esfera, s.uf, casaValida(s.casa)),
    description: 'Projetos de lei e normas ambientais acompanhados pelo observatório, com situação, autoria e parecer técnico.',
    alternates: { canonical: s.esfera && !filtrada ? `/leis?esfera=${s.esfera}` : '/leis' },
    robots: filtrada ? { index: false, follow: true } : undefined,
  }
}

export default async function Leis({ searchParams }: { searchParams: Busca }) {
  const s = await searchParams
  const pagina = Math.max(1, Number(s.pagina) || 1)
  const casa = s.esfera === 'federal' ? casaValida(s.casa) : undefined
  const uf = s.uf && UF_NOME[s.uf.toUpperCase()] ? s.uf.toUpperCase() : undefined
  const [r, panorama] = await Promise.all([listarLeis({ esfera: s.esfera, casa, situacao: s.situacao, uf: s.uf, pagina }), dadosDoPanorama()])
  const pareceres = await pareceresDe(r.docs.map((l) => l.id))
  // Padrão de atuação (A19): em Federais acompanha o filtro de casa (Todas = União); no estado, o do estado.
  const grupo = uf ? `uf:${uf}` : s.esfera === 'federal' ? casa || 'uniao' : null
  const padraoGrupo = grupo ? padrao(agrupar(panorama.itens, chavesDeJurisdicao).get(grupo) || []) : null
  const nomeGrupo = uf ? `Padrão de atuação ${UF_NOME[uf] ? `· ${UF_NOME[uf]}` : ''}` : casa ? `Padrão de atuação · ${ROTULO_CASA[casa]}` : 'Padrão de atuação · União'
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const tudo = { esfera: s.esfera, casa, situacao: s.situacao, uf: s.uf, ...extra }
    Object.entries(tudo).forEach(([k, v]) => v && p.set(k, v))
    const t = p.toString()
    return t ? `/leis?${t}` : '/leis'
  }
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Leis', caminho: '/leis' }]} />
      <header className="lawhead">
        <h1>{titulo(s.esfera, s.uf, casa)}</h1>
      </header>
      {s.esfera === 'federal' ? (
        <div className="chips" style={{ marginBottom: 8 }} aria-label="Casa">
          {[undefined, ...CASAS].map((c) => (
            <Link key={c || 'todas'} className="chip" aria-current={casa === c ? 'true' : undefined} href={qs({ casa: c, pagina: undefined })}>
              {c ? ROTULO_CASA[c].split(' ')[0] : 'Todas'}
            </Link>
          ))}
        </div>
      ) : null}
      {padraoGrupo && pagina === 1 ? <PadraoAtuacao titulo={nomeGrupo} padrao={padraoGrupo} nomesAreas={new Map(panorama.temas.map((t) => [t.id, t]))} /> : null}
      <div className="chips" style={{ marginBottom: 8 }}>
        {[
          [undefined, 'Todas as esferas'],
          ['federal', 'Federais'],
          ['estadual', 'Estaduais'],
        ].map(([v, t]) => (
          <Link key={t} className="chip" aria-current={s.esfera === v ? 'true' : undefined} href={qs({ esfera: v, casa: undefined, pagina: undefined })}>
            {t}
          </Link>
        ))}
        <span style={{ width: 8 }} />
        {[
          [undefined, 'Todas'],
          ['em_tramitacao', 'Em tramitação'],
          ['aprovada', 'Aprovadas'],
        ].map(([v, t]) => (
          <Link key={t} className="chip" aria-current={s.situacao === v ? 'true' : undefined} href={qs({ situacao: v, pagina: undefined })}>
            {t}
          </Link>
        ))}
      </div>
      <p className="nota-fonte" style={{ margin: '6px 0 14px' }}>
        {r.totalDocs} {r.totalDocs === 1 ? 'lei' : 'leis'}
      </p>
      <div className="list">
        {r.docs.length ? r.docs.map((l) => <CartaoLei key={l.id} lei={l} parecer={pareceres.get(l.id)} />) : <p className="empty">Nenhuma lei com esses filtros.</p>}
      </div>
      <nav className="pag" aria-label="Páginas">
        {r.hasPrevPage ? <Link href={qs({ pagina: String(pagina - 1) })}>← Anteriores</Link> : <span />}
        {r.hasNextPage ? <Link href={qs({ pagina: String(pagina + 1) })}>Próximas →</Link> : null}
      </nav>
    </div>
  )
}
