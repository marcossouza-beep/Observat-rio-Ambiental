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
  /** Federal: horas corridas. Estadual: horas úteis (sem fim de semana nem recesso parlamentar). */
  esfera?: string | null
  /** Tolerância própria da fonte, em horas; sem ela, vale o padrão da esfera. */
  toleranciaHoras?: number | null
}

/** Federais: coleta 4 vezes ao dia; 8 horas sem coleta já é atraso. */
export const LIMITE_HORAS_SEM_COLETA = 8
/** Estaduais: 1 a 2 dias de atraso são aceitáveis; conta só horas úteis. */
export const LIMITE_HORAS_ESTADUAL = 48
/** Abaixo de 30% da média dos últimos 30 dias, o volume é suspeito (possível mudança na API). */
export const FRACAO_VOLUME_MINIMO = 0.3

export function horasDesde(d: Date, agora: Date) {
  return (agora.getTime() - d.getTime()) / 3_600_000
}

const partesSP = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', month: 'numeric', day: 'numeric' }).formatToParts(d)
  const v = (t: string) => p.find((x) => x.type === t)?.value || ''
  return { semana: v('weekday'), mes: Number(v('month')), dia: Number(v('day')) }
}

/** Recesso parlamentar (aproximado para as Assembleias): 18 a 31 de julho e 23 de dezembro a 31 de janeiro. */
export function emRecesso(d: Date): boolean {
  const { mes, dia } = partesSP(d)
  return (mes === 7 && dia >= 18) || (mes === 12 && dia >= 23) || mes === 1
}

/** Dia sem expediente legislativo: sábado, domingo ou recesso (horário de Brasília). */
export function semExpediente(d: Date): boolean {
  const { semana } = partesSP(d)
  return semana === 'Sat' || semana === 'Sun' || emRecesso(d)
}

/** Horas úteis entre duas datas: só contam as horas em dias com expediente (no máximo 60 dias para trás). */
export function horasUteisDesde(d: Date, agora: Date) {
  const inicio = Math.max(d.getTime(), agora.getTime() - 60 * 864e5)
  let horas = 0
  for (let t = inicio; t < agora.getTime(); t += 3_600_000) if (!semExpediente(new Date(t))) horas += Math.min(1, (agora.getTime() - t) / 3_600_000)
  return horas
}

export const limiteDaFonte = (f: Pick<EstadoFonte, 'esfera' | 'toleranciaHoras'>) =>
  f.toleranciaHoras && f.toleranciaHoras > 0 ? f.toleranciaHoras : f.esfera === 'estadual' ? LIMITE_HORAS_ESTADUAL : LIMITE_HORAS_SEM_COLETA

export function situacaoFonte(f: EstadoFonte, agora: Date, limiteHoras = limiteDaFonte(f)): SituacaoFonte {
  if (f.manual) return 'manual'
  if (!f.ultimaColetaOk) return 'nunca_coletada'
  const estadual = f.esfera === 'estadual'
  const horas = estadual ? horasUteisDesde(f.ultimaColetaOk, agora) : horasDesde(f.ultimaColetaOk, agora)
  if (horas > limiteHoras) return 'atrasada'
  // Nas Assembleias o volume cai no fim de semana e no recesso sem que nada esteja errado
  if (estadual && semExpediente(agora)) return 'ok'
  if (
    f.mediaItens30d != null &&
    f.mediaItens30d >= 5 &&
    f.itensUltimaColeta != null &&
    f.itensUltimaColeta < f.mediaItens30d * FRACAO_VOLUME_MINIMO
  )
    return 'volume_baixo'
  return 'ok'
}

/** Documento da coleção Fontes → estado usado nas regras (o mesmo em todas as telas). */
export function estadoDaFonte(f: {
  manual?: boolean | null
  ultimaColetaOk?: string | Date | null
  itensUltimaColeta?: number | null
  mediaItens30d?: number | null
  esfera?: string | null
  toleranciaHoras?: number | null
}): EstadoFonte {
  return {
    manual: f.manual ?? false,
    ultimaColetaOk: f.ultimaColetaOk ? new Date(f.ultimaColetaOk) : null,
    itensUltimaColeta: f.itensUltimaColeta,
    mediaItens30d: f.mediaItens30d,
    esfera: f.esfera,
    toleranciaHoras: f.toleranciaHoras,
  }
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
