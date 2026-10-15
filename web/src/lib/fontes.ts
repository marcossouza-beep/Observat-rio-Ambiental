/**
 * Situação de cada fonte de dados e a nota que o site mostra quando ela falha.
 * Regras em docs/ENTREGA.md, seção 3.
 */

export type SituacaoFonte = 'ok' | 'atrasada' | 'volume_baixo' | 'manual' | 'nunca_coletada'

export type EstadoFonte = {
  manual?: boolean
  ultimaColetaOk?: Date | null
  itensUltimaColeta?: number | null
  mediaItens30d?: number | null
}

export const LIMITE_HORAS_SEM_COLETA = 8
/** Abaixo de 30% da média dos últimos 30 dias, o volume é suspeito (possível mudança na API). */
export const FRACAO_VOLUME_MINIMO = 0.3

export function horasDesde(d: Date, agora: Date) {
  return (agora.getTime() - d.getTime()) / 3_600_000
}

export function situacaoFonte(f: EstadoFonte, agora: Date, limiteHoras = LIMITE_HORAS_SEM_COLETA): SituacaoFonte {
  if (f.manual) return 'manual'
  if (!f.ultimaColetaOk) return 'nunca_coletada'
  if (horasDesde(f.ultimaColetaOk, agora) > limiteHoras) return 'atrasada'
  if (
    f.mediaItens30d != null &&
    f.mediaItens30d >= 5 &&
    f.itensUltimaColeta != null &&
    f.itensUltimaColeta < f.mediaItens30d * FRACAO_VOLUME_MINIMO
  )
    return 'volume_baixo'
  return 'ok'
}

const dataHora = (d: Date) => {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const v = (t: string) => p.find((x) => x.type === t)?.value
  return `${v('day')}/${v('month')}, ${v('hour')}:${v('minute')}`
}

/** Texto discreto sob os dados automáticos de uma página. */
export function notaPublica(f: EstadoFonte, nomeFonte: string, agora: Date): string | null {
  const s = situacaoFonte(f, agora)
  if (s === 'manual' || s === 'nunca_coletada' || !f.ultimaColetaOk) return null
  if (s === 'atrasada')
    return `Dados da tramitação até ${dataHora(f.ultimaColetaOk)}. A fonte oficial (${nomeFonte}) está fora do ar; atualizamos assim que voltar.`
  return `Informações da tramitação oficial, atualizadas automaticamente · última coleta: ${dataHora(f.ultimaColetaOk)}.`
}
