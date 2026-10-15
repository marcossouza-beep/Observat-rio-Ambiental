import type { Metadata } from 'next'
import Link from 'next/link'
import { CartaoLei } from '@/componentes/CartaoLei'
import { Trilha } from '@/componentes/Trilha'
import { listarLeis, pareceresDe } from '@/dados/consultas'
import { UF_NOME } from '@/lib/rotulos'

type Busca = Promise<{ esfera?: string; situacao?: string; uf?: string; pagina?: string }>

const titulo = (esfera?: string, uf?: string) =>
  uf && UF_NOME[uf.toUpperCase()] ? `Leis ambientais do estado: ${UF_NOME[uf.toUpperCase()]}` : esfera === 'federal' ? 'Leis ambientais federais' : esfera === 'estadual' ? 'Leis ambientais estaduais' : 'Leis ambientais acompanhadas'

export async function generateMetadata({ searchParams }: { searchParams: Busca }): Promise<Metadata> {
  const s = await searchParams
  const filtrada = !!(s.situacao || s.pagina)
  return {
    title: titulo(s.esfera, s.uf),
    description: 'Projetos de lei e normas ambientais acompanhados pelo observatório, com situação, autoria e parecer técnico.',
    alternates: { canonical: s.esfera && !filtrada ? `/leis?esfera=${s.esfera}` : '/leis' },
    robots: filtrada ? { index: false, follow: true } : undefined,
  }
}

export default async function Leis({ searchParams }: { searchParams: Busca }) {
  const s = await searchParams
  const pagina = Math.max(1, Number(s.pagina) || 1)
  const r = await listarLeis({ esfera: s.esfera, situacao: s.situacao, uf: s.uf, pagina })
  const pareceres = await pareceresDe(r.docs.map((l) => l.id))
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const tudo = { esfera: s.esfera, situacao: s.situacao, uf: s.uf, ...extra }
    Object.entries(tudo).forEach(([k, v]) => v && p.set(k, v))
    const t = p.toString()
    return t ? `/leis?${t}` : '/leis'
  }
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Leis', caminho: '/leis' }]} />
      <header className="lawhead">
        <h1>{titulo(s.esfera, s.uf)}</h1>
      </header>
      <div className="chips" style={{ marginBottom: 8 }}>
        {[
          [undefined, 'Todas as esferas'],
          ['federal', 'Federais'],
          ['estadual', 'Estaduais'],
        ].map(([v, t]) => (
          <Link key={t} className="chip" aria-current={s.esfera === v ? 'true' : undefined} href={qs({ esfera: v, pagina: undefined })}>
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
