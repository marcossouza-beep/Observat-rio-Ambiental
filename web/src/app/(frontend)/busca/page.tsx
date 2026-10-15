import type { Metadata } from 'next'
import { CartaoLei } from '@/componentes/CartaoLei'
import { Lupa } from '@/componentes/Icones'
import { Trilha } from '@/componentes/Trilha'
import { listarLeis, pareceresDe } from '@/dados/consultas'

export const metadata: Metadata = { title: 'Busca', robots: { index: false, follow: true } }

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || '').trim().slice(0, 120)
  const r = q ? await listarLeis({ q }, 40) : null
  const pareceres = r ? await pareceresDe(r.docs.map((l) => l.id)) : new Map()
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Busca', caminho: '/busca' }]} />
      <header className="lawhead">
        <h1>Buscar</h1>
        <form className="search" action="/busca" role="search">
          <Lupa />
          <input name="q" type="search" defaultValue={q} placeholder="Busque uma lei, tema ou número" aria-label="Buscar" />
          <button className="pill-btn" type="submit">
            Pesquisar
          </button>
        </form>
      </header>
      {r ? (
        <section className="section">
          <div className="section-h">
            <h2>
              {r.totalDocs} {r.totalDocs === 1 ? 'resultado' : 'resultados'} para “{q}”
            </h2>
          </div>
          <div className="list">
            {r.docs.length ? r.docs.map((l) => <CartaoLei key={l.id} lei={l} parecer={pareceres.get(l.id)} />) : <p className="empty">Nada encontrado. Tente outra palavra ou o número da lei.</p>}
          </div>
        </section>
      ) : null}
    </div>
  )
}
