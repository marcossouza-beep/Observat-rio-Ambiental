/**
 * Padrão de atuação e Panorama (docs/ARQUITETURA.md, "Indicadores"; docs/TELAS.md, A19 e A20).
 * Tudo sai dos pareceres publicados: nada é digitado. Funções puras, testadas em tests/unit/panorama.spec.ts.
 */
import { distribuicao, tendencia, type Carater, type Distribuicao, type Tendencia } from './indicadores'

export type CasaFederal = 'camara' | 'senado' | 'congresso' | 'presidencia'

/**
 * Casa onde a proposta começou. O campo "casa" acompanha a casa onde ela andou por último;
 * para o padrão de atuação vale a origem: Câmara e Senado pela chave da fonte; medidas provisórias
 * e propostas registradas como da Presidência ficam com a Presidência.
 */
export function casaDeOrigem(p: { esfera?: string | null; sigla?: string | null; chaveOrigem?: string | null; casa?: string | null }): CasaFederal | null {
  if (p.esfera !== 'federal') return null
  if (p.sigla?.toUpperCase() === 'MPV') return 'presidencia'
  const prefixo = p.chaveOrigem?.split(':')[0]
  if (prefixo === 'camara' || prefixo === 'senado' || prefixo === 'congresso') return prefixo
  return p.casa === 'camara' || p.casa === 'senado' || p.casa === 'congresso' || p.casa === 'presidencia' ? p.casa : null
}

export const ROTULO_CASA: Record<CasaFederal, string> = {
  camara: 'Câmara dos Deputados',
  senado: 'Senado Federal',
  congresso: 'Congresso Nacional',
  presidencia: 'Presidência da República',
}

/** Um parecer publicado, já com os dados da proposta. */
export type ItemPanorama = {
  carater: Carater
  impacto?: string | null
  /** A proposta foi aprovada ou virou norma. */
  aprovada: boolean
  esfera: string
  uf?: string | null
  casaOrigem?: CasaFederal | null
  areas: number[]
  biomas: number[]
}

export type Padrao = {
  total: number
  tudo: Distribuicao
  aprovadas: Distribuicao
  tendencia: Tendencia
  tendenciaAprovadas: Tendencia
  /** % de pareceres de alto impacto. */
  altoImpacto: number
  /** Áreas mais frequentes (id e quantidade), da maior para a menor. */
  areas: { id: number; n: number }[]
}

export function padrao(itens: ItemPanorama[]): Padrao {
  const caracteres = itens.map((i) => i.carater)
  const aprovadas = itens.filter((i) => i.aprovada).map((i) => i.carater)
  const conta = new Map<number, number>()
  for (const i of itens) for (const a of new Set(i.areas)) conta.set(a, (conta.get(a) || 0) + 1)
  return {
    total: itens.length,
    tudo: distribuicao(caracteres),
    aprovadas: distribuicao(aprovadas),
    tendencia: tendencia(caracteres),
    tendenciaAprovadas: tendencia(aprovadas),
    altoImpacto: itens.length ? Math.round((itens.filter((i) => i.impacto === 'alto').length / itens.length) * 100) : 0,
    areas: [...conta].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n || a.id - b.id),
  }
}

/** Grupos de jurisdição: "uniao" (todo o federal), a casa de origem e cada UF ("uf:PA"). */
export function chavesDeJurisdicao(i: Pick<ItemPanorama, 'esfera' | 'uf' | 'casaOrigem'>): string[] {
  if (i.esfera === 'federal') return ['uniao', ...(i.casaOrigem ? [i.casaOrigem] : [])]
  if (i.esfera === 'estadual' && i.uf) return [`uf:${i.uf.toUpperCase()}`]
  return []
}

/** Agrupa; um item pode contar em mais de um grupo (ex.: dois biomas). */
export function agrupar<T>(itens: T[], chaves: (i: T) => (string | number)[]): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const i of itens) for (const k of new Set(chaves(i).map(String))) m.set(k, [...(m.get(k) || []), i])
  return m
}

/** Ordem do ranking: mais pareceres primeiro; empate pelo nome. */
export function ranking<T extends { padrao: Padrao; nome: string }>(linhas: T[]): T[] {
  return [...linhas].sort((a, b) => b.padrao.total - a.padrao.total || a.nome.localeCompare(b.nome, 'pt-BR'))
}
