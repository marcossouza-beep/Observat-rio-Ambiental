import type { Metadata } from 'next'
import Link from 'next/link'
import { Bandeira } from '@/componentes/Etiquetas'
import { listarParlamentares } from '@/dados/consultas'
import { UF_NOME } from '@/lib/rotulos'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Parlamentares: votos e propostas ambientais',
  description: 'Deputados e senadores com votos, autorias e relatorias em propostas ambientais acompanhadas pelo observatório.',
  alternates: { canonical: '/parlamentares' },
}

type Busca = Promise<{ casa?: string; uf?: string }>

export default async function Parlamentares({ searchParams }: { searchParams: Busca }) {
  const s = await searchParams
  const casa = s.casa === 'camara' || s.casa === 'senado' ? s.casa : undefined
  const uf = s.uf && UF_NOME[s.uf.toUpperCase()] ? s.uf.toUpperCase() : undefined
  const lista = await listarParlamentares({ casa, uf })
  const filtro = (k: string, v?: string) => {
    const q = new URLSearchParams({ ...(casa ? { casa } : {}), ...(uf ? { uf } : {}) })
    if (v) q.set(k, v)
    else q.delete(k)
    const t = q.toString()
    return `/parlamentares${t ? `?${t}` : ''}`
  }
  return (
    <div className="wrap">
      <header className="lawhead" style={{ paddingTop: 32 }}>
        <h1>Parlamentares</h1>
        <p className="intro">Deputados e senadores com votos, autorias ou relatorias em propostas ambientais acompanhadas pelo site. Siga quem quiser: os votos entram no seu resumo semanal.</p>
      </header>
      <div className="chips" role="navigation" aria-label="Filtrar por casa">
        <Link className="chip" aria-current={!casa ? 'true' : undefined} href={filtro('casa')}>
          Todos
        </Link>
        <Link className="chip" aria-current={casa === 'camara' ? 'true' : undefined} href={filtro('casa', 'camara')}>
          Deputados
        </Link>
        <Link className="chip" aria-current={casa === 'senado' ? 'true' : undefined} href={filtro('casa', 'senado')}>
          Senadores
        </Link>
        {uf ? (
          <Link className="chip" aria-current="true" href={filtro('uf')}>
            {UF_NOME[uf]} ✕
          </Link>
        ) : null}
      </div>
      {lista.length ? (
        <div className="parl-grade">
          {lista.map((p) => (
            <Link key={p.id} href={`/parlamentares/${p.slug}`} className="parl-item">
              <span className="parl-mini">
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotoUrl} alt="" width={40} height={40} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{p.nome.slice(0, 1)}</span>
                )}
              </span>
              <span>
                <b>{p.nome}</b>
                <small>
                  {p.uf ? <Bandeira uf={p.uf} /> : null} {[p.partido, p.uf].filter(Boolean).join('-')} · {p.casa === 'senado' ? 'Senado' : 'Câmara'}
                </small>
                <small>
                  {[p.votos ? `${p.votos} ${p.votos === 1 ? 'voto' : 'votos'}` : '', p.autorias ? `${p.autorias} ${p.autorias === 1 ? 'autoria' : 'autorias'}` : ''].filter(Boolean).join(' · ')}
                </small>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum parlamentar com atuação registrada em propostas acompanhadas{casa || uf ? ' com esse filtro' : ''}.</p>
      )}
    </div>
  )
}
