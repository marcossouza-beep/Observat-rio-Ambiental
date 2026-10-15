import { CARATER, IMPACTO, SITUACAO, UF_NOME } from '@/lib/rotulos'

export function Bandeira({ uf, className = 'flag' }: { uf: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={`/bandeiras/${uf.toLowerCase()}.svg`} alt="" width={18} height={12} />
}

export function Local({ esfera, uf }: { esfera?: string | null; uf?: string | null }) {
  const federal = esfera === 'federal' || !uf
  return (
    <span className="tag tg-place">
      <Bandeira uf={federal ? 'BR' : uf!} />
      {federal ? 'Federal' : UF_NOME[uf!] || uf}
    </span>
  )
}

export function Situacao({ valor }: { valor?: string | null }) {
  const s = valor ? SITUACAO[valor] : null
  return s ? <span className={`tag ${s.classe}`}>{s.rotulo}</span> : null
}

export function Carater({ valor }: { valor?: string | null }) {
  const c = valor ? CARATER[valor] : null
  return c ? <span className={`tag ${c.classe}`}>{c.rotulo}</span> : null
}

export function Impacto({ valor }: { valor?: string | null }) {
  return valor ? <span className="tag tg-alto">{IMPACTO[valor]}</span> : null
}
