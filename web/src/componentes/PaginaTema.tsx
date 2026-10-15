import { CartaoLei } from './CartaoLei'
import { Trilha } from './Trilha'
import { listarLeis, pareceresDe } from '@/dados/consultas'
import type { Bioma, Tema } from '@/payload-types'

export async function PaginaTema({ tipo, item }: { tipo: 'temas' | 'biomas'; item: Tema | Bioma }) {
  const r = await listarLeis(tipo === 'temas' ? { tema: String(item.id) } : { bioma: String(item.id) }, 50)
  const pareceres = await pareceresDe(r.docs.map((l) => l.id))
  return (
    <div className="wrap">
      <Trilha
        itens={[
          { nome: 'Temas e biomas', caminho: '/temas' },
          { nome: item.nome, caminho: `/${tipo}/${item.slug}` },
        ]}
      />
      <header className="lawhead">
        <h1>
          {tipo === 'biomas' ? 'Leis ambientais e o bioma ' : 'Leis ambientais: '}
          <span className="t-em">{item.nome}</span>
        </h1>
        {item.textoAbertura ? <p className="intro">{item.textoAbertura}</p> : null}
      </header>
      <section className="section">
        <div className="section-h">
          <h2>Leis acompanhadas</h2>
          <span>{r.totalDocs}</span>
        </div>
        <div className="list">
          {r.docs.length ? r.docs.map((l) => <CartaoLei key={l.id} lei={l} parecer={pareceres.get(l.id)} />) : <p className="empty">Ainda não há leis classificadas aqui.</p>}
        </div>
      </section>
    </div>
  )
}
