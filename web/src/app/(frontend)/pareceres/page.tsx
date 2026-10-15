import type { Metadata } from 'next'
import Link from 'next/link'
import { Carater, Impacto, Local } from '@/componentes/Etiquetas'
import { Seta } from '@/componentes/Icones'
import { Trilha } from '@/componentes/Trilha'
import { listarPareceres } from '@/dados/consultas'
import { textoDe } from '@/lib/publicacao'
import { dataBR } from '@/lib/rotulos'
import type { Autor, Proposicao } from '@/payload-types'

export const revalidate = 300
export const metadata: Metadata = {
  title: 'Opinião: pareceres técnicos sobre leis ambientais',
  description: 'Pareceres técnicos assinados sobre projetos de lei e normas ambientais, em linguagem clara.',
  alternates: { canonical: '/pareceres' },
}

export default async function Pareceres() {
  const r = await listarPareceres(50)
  return (
    <div className="wrap">
      <Trilha itens={[{ nome: 'Pareceres', caminho: '/pareceres' }]} />
      <header className="lawhead">
        <h1>Opinião</h1>
        <p style={{ color: 'var(--gray)' }}>Os pareceres técnicos, do mais recente ao mais antigo. Cada um é escrito e assinado pelo autor.</p>
      </header>
      <div className="list">
        {r.docs.length ? (
          r.docs.map((p) => {
            const lei = p.proposicao as Proposicao
            const autor = p.autor && typeof p.autor === 'object' ? (p.autor as Autor) : null
            const resumo = textoDe(p.secoes?.resumo)
            return (
              <Link key={p.id} className="law" href={`/pareceres/${p.slug}`}>
                <div className="top">
                  <Local esfera={lei?.esfera} uf={lei?.uf} />
                  <Impacto valor={p.impacto} />
                  <Carater valor={p.carater} />
                </div>
                <h3>{p.titulo || lei?.titulo || lei?.rotulo}</h3>
                {resumo ? <p>{resumo.length > 220 ? `${resumo.slice(0, 217)}…` : resumo}</p> : null}
                <div className="go">
                  <span className="num">
                    {lei?.rotulo} · {dataBR(p.publicadoEm)}
                    {autor ? ` · ${autor.nome}` : ''}
                  </span>
                  <span className="arrow">
                    Ler parecer <Seta />
                  </span>
                </div>
              </Link>
            )
          })
        ) : (
          <p className="empty">Os primeiros pareceres aparecem aqui em breve.</p>
        )}
      </div>
    </div>
  )
}
