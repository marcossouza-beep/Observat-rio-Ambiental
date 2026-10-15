/**
 * Padrão de atuação: distribuição dos pareceres por caráter e tendência.
 * Regras públicas na página de Metodologia.
 */

export const CARATERES = ['malefico', 'enfraquece_indiretamente', 'neutro', 'benefico'] as const
export type Carater = (typeof CARATERES)[number]

export const ROTULO_CARATER: Record<Carater, string> = {
  malefico: 'Maléfico',
  enfraquece_indiretamente: 'Enfraquece indiretamente',
  neutro: 'Neutro',
  benefico: 'Benéfico',
}

export const AMOSTRA_MINIMA = 5
export const LIMIAR_TENDENCIA = 15

export type Distribuicao = { total: number; percentuais: Record<Carater, number> }

export function distribuicao(lista: Carater[]): Distribuicao {
  const total = lista.length
  const percentuais = Object.fromEntries(
    CARATERES.map((c) => [c, total ? Math.round((lista.filter((x) => x === c).length / total) * 100) : 0]),
  ) as Record<Carater, number>
  return { total, percentuais }
}

export type Tendencia =
  | { tipo: 'amostra_pequena'; total: number }
  | { tipo: 'protege' | 'enfraquece' | 'equilibrada'; saldo: number; total: number }

/** saldo = benéficos − (maléficos + indiretos), em pontos percentuais. */
export function tendencia(lista: Carater[]): Tendencia {
  const total = lista.length
  if (total < AMOSTRA_MINIMA) return { tipo: 'amostra_pequena', total }
  const n = (c: Carater) => lista.filter((x) => x === c).length
  const saldo = Math.round(((n('benefico') - n('malefico') - n('enfraquece_indiretamente')) / total) * 100)
  const tipo = saldo >= LIMIAR_TENDENCIA ? 'protege' : saldo <= -LIMIAR_TENDENCIA ? 'enfraquece' : 'equilibrada'
  return { tipo, saldo, total }
}

export const ROTULO_TENDENCIA = {
  protege: 'Tende a proteger',
  enfraquece: 'Tende a enfraquecer',
  equilibrada: 'Equilibrada',
  amostra_pequena: 'Amostra pequena',
} as const

/**
 * Sentido do voto (federal): "Sim" em proposta benéfica ou "Não" em proposta maléfica
 * ou indireta conta a favor da proteção. Neutras ficam fora.
 */
export function votoAFavorDaProtecao(voto: 'sim' | 'nao' | string, carater: Carater): boolean | null {
  if (carater === 'neutro') return null
  if (voto === 'sim') return carater === 'benefico'
  if (voto === 'nao') return carater !== 'benefico'
  return null
}
