/**
 * "Como votou" e "Autorias" na página do parlamentar (docs/TELAS.md, A6).
 * Mostra o sentido dos votos em propostas com parecer publicado; não avalia a pessoa.
 */
import { distribuicao, tendencia, votoAFavorDaProtecao, type Carater } from './indicadores'

export type VotoDoParlamentar = { voto: string; carater: Carater | null }
export type Sentido = 'a_favor' | 'contra' | 'sem_voto' | 'neutra' | 'sem_parecer'

export function sentidoDoVoto(v: VotoDoParlamentar): Sentido {
  if (!v.carater) return 'sem_parecer'
  if (v.carater === 'neutro') return 'neutra'
  const r = votoAFavorDaProtecao(v.voto, v.carater)
  return r === null ? 'sem_voto' : r ? 'a_favor' : 'contra'
}

export const ROTULO_SENTIDO: Record<Sentido, string> = {
  a_favor: 'A favor da proteção',
  contra: 'Contra a proteção',
  sem_voto: 'Ausente, abstenção ou obstrução',
  neutra: 'Proposta neutra',
  sem_parecer: 'Ainda sem resumo prévio',
}

/** Resumo: só votos em propostas com parecer de caráter não neutro entram na conta. */
export function resumoDosVotos(votos: VotoDoParlamentar[]) {
  const s = votos.map(sentidoDoVoto)
  const aFavor = s.filter((x) => x === 'a_favor').length
  const contra = s.filter((x) => x === 'contra').length
  const semVoto = s.filter((x) => x === 'sem_voto').length
  const consideradas = aFavor + contra + semVoto
  const pct = (n: number) => (consideradas ? Math.round((n / consideradas) * 100) : 0)
  return { total: votos.length, consideradas, aFavor, contra, semVoto, percentuais: { aFavor: pct(aFavor), contra: pct(contra), semVoto: pct(semVoto) } }
}

/** Padrão das propostas de autoria (pelo caráter dos pareceres publicados). */
export function padraoDasAutorias(carateres: (Carater | null)[]) {
  const comParecer = carateres.filter((c): c is Carater => !!c)
  return { distribuicao: distribuicao(comParecer), tendencia: tendencia(comParecer), semParecer: carateres.length - comParecer.length }
}
