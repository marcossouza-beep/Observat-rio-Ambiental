import Link from 'next/link'
import type { Parecer, Proposicao } from '@/payload-types'
import { avisoDaLei } from '@/lib/aviso'
import { Carater, Local, Situacao } from './Etiquetas'
import { Seta } from './Icones'

export function CartaoLei({ lei, parecer }: { lei: Proposicao; parecer?: Parecer | null }) {
  const aviso = avisoDaLei(lei, parecer)
  const comParecer = aviso.tipo === 'parecer' || aviso.tipo === 'desatualizado'
  return (
    <Link className="law" href={`/leis/${lei.slug}`}>
      <div className="top">
        <Local esfera={lei.esfera} uf={lei.uf} />
        <Situacao valor={lei.statusSimplificado} />
        {comParecer ? <Carater valor={parecer?.carater} /> : null}
        {aviso.tipo === 'em_preparacao' ? <span className="tag tg-soon">Parecer em breve</span> : null}
      </div>
      <h3>{lei.titulo || lei.rotulo}</h3>
      {lei.ementa ? <p>{lei.ementa.length > 220 ? `${lei.ementa.slice(0, 217)}…` : lei.ementa}</p> : null}
      <div className="go">
        <span className="num">{lei.rotulo}</span>
        <span className="arrow">
          {comParecer ? 'Ler parecer' : aviso.tipo === 'em_preparacao' ? 'Parecer em breve' : 'Acompanhar'} <Seta />
        </span>
      </div>
    </Link>
  )
}
