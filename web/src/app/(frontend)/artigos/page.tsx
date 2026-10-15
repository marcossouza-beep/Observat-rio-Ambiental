import type { Metadata } from 'next'
import Link from 'next/link'
import { Seta } from '@/componentes/Icones'
import { Trilha } from '@/componentes/Trilha'
import { listarArtigos } from '@/dados/consultas'
import { dataBR } from '@/lib/rotulos'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Artigos: tendências e explicadores da legislação ambiental',
  description: 'Tendências, explicadores e dados sobre a legislação ambiental brasileira.',
  alternates: { canonical: '/artigos' },
}

const TIPO: Record<string, string> = { tendencia: 'Tendência', explicador: 'Explicador', dados: 'Dados' }

export default async function Artigos() {
  const r = await listarArtigos(50)
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Artigos', caminho: '/artigos' }]} />
      <header className="lawhead">
        <h1>Artigos</h1>
      </header>
      <div className="list">
        {r.docs.length ? (
          r.docs.map((a) => (
            <Link key={a.id} className="law" href={`/artigos/${a.slug}`}>
              <div className="top">{a.tipo ? <span className="tag tg-neu">{TIPO[a.tipo]}</span> : null}</div>
              <h3>{a.titulo}</h3>
              {a.resumo ? <p>{a.resumo}</p> : null}
              <div className="go">
                <span className="num">{dataBR(a.publicadoEm)}</span>
                <span className="arrow">
                  Ler <Seta />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="empty">Os primeiros artigos aparecem aqui em breve.</p>
        )}
      </div>
    </div>
  )
}
