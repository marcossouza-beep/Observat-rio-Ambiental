import { CartaoLei } from './CartaoLei'
import { PadraoAtuacao } from './Padrao'
import { Trilha } from './Trilha'
import { dadosDoPanorama, listarLeis, pareceresDe } from '@/dados/consultas'
import { padrao } from '@/lib/panorama'
import type { Bioma, Tema } from '@/payload-types'

export async function PaginaTema({ tipo, item }: { tipo: 'temas' | 'biomas'; item: Tema | Bioma }) {
  const [r, panorama] = await Promise.all([listarLeis(tipo === 'temas' ? { tema: String(item.id) } : { bioma: String(item.id) }, 50), dadosDoPanorama()])
  const pareceres = await pareceresDe(r.docs.map((l) => l.id))
  const doGrupo = (lista: number[]) => lista.includes(item.id)
  const p = padrao(panorama.itens.filter((i) => doGrupo(tipo === 'temas' ? i.areas : i.biomas)))
  const props = panorama.propostas.filter((x) => doGrupo(tipo === 'temas' ? x.temas : x.biomas))
  const bioma = tipo === 'biomas' ? (item as Bioma) : null
  const tema = tipo === 'temas' ? (item as Tema) : null
  const numeros = [
    [props.length, props.length === 1 ? 'proposta acompanhada' : 'propostas acompanhadas'],
    [p.total, p.total === 1 ? 'parecer' : 'pareceres'],
    [p.total ? `${p.altoImpacto}%` : '–', 'de alto impacto'],
    [props.filter((x) => x.emTramitacao).length, 'em tramitação agora'],
  ] as const
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
      <div className="numeros">
        {numeros.map(([n, t]) => (
          <div key={t}>
            <b>{n}</b>
            <span>{t}</span>
          </div>
        ))}
      </div>
      <PadraoAtuacao titulo="Para que lado vão as propostas" padrao={p} nomesAreas={tipo === 'biomas' ? new Map(panorama.temas.map((t) => [t.id, t])) : new Map()} />
      {bioma?.pressoes || bioma?.avancos || tema?.oQueTemosVisto ? (
        <section className="section leitura">
          {bioma?.pressoes ? (
            <div>
              <h2>Principais pressões</h2>
              <p>{bioma.pressoes}</p>
            </div>
          ) : null}
          {bioma?.avancos ? (
            <div>
              <h2>Principais avanços</h2>
              <p>{bioma.avancos}</p>
            </div>
          ) : null}
          {tema?.oQueTemosVisto ? (
            <div>
              <h2>O que temos visto</h2>
              <p>{tema.oQueTemosVisto}</p>
            </div>
          ) : null}
        </section>
      ) : null}
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
