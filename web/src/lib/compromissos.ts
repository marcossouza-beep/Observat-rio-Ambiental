/**
 * Compromissos: toda promessa pública com prazo (ver docs/ENTREGA.md).
 * O painel cobra o prazo; o site mostra o aviso enquanto o compromisso estiver aberto.
 */
import {
  type DataCivil,
  dataCivil,
  diferencaDias,
  formatarCurta,
  somarDias,
  somarDiasUteis,
} from './datas'

export const TIPOS_COMPROMISSO = [
  'parecer_prometido',
  'atualizacao',
  'correcao',
  'credenciamento',
  'lgpd',
] as const
export type TipoCompromisso = (typeof TIPOS_COMPROMISSO)[number]

export type RegraPrazo = { dias: number; uteis: boolean }

/** Prazos padrão. Ficam editáveis em Ajustes; estes são os valores propostos em docs/ENTREGA.md. */
export const PRAZOS_PADRAO: Record<TipoCompromisso, RegraPrazo> = {
  // Regra do autor: até 4 dias depois que o projeto (ou a alteração do texto) sai, o parecer está publicado
  parecer_prometido: { dias: 4, uteis: false },
  atualizacao: { dias: 4, uteis: false },
  correcao: { dias: 3, uteis: true },
  credenciamento: { dias: 2, uteis: true },
  lgpd: { dias: 15, uteis: false },
}

export const ROTULO_COMPROMISSO: Record<TipoCompromisso, string> = {
  parecer_prometido: 'Parecer prometido',
  atualizacao: 'Atualização do parecer',
  correcao: 'Pedido de correção',
  credenciamento: 'Credenciamento de imprensa',
  lgpd: 'Pedido de dados pessoais',
}

export function calcularPrazo(
  tipo: TipoCompromisso,
  aberto: Date,
  regras: Record<TipoCompromisso, RegraPrazo> = PRAZOS_PADRAO,
): DataCivil {
  const r = regras[tipo]
  const inicio = dataCivil(aberto)
  return r.uteis ? somarDiasUteis(inicio, r.dias) : somarDias(inicio, r.dias)
}

/**
 * Quando a proposta "saiu": a data de apresentação (projeto) ou de publicação (norma); sem elas, a última
 * movimentação; sem nada, quando o site a captou.
 */
export function dataDeSaida(p: { dataApresentacao?: string | null; ultimaMovimentacao?: string | null; createdAt?: string | null }, agora = new Date()): Date {
  const d = p.dataApresentacao || p.ultimaMovimentacao || p.createdAt
  const t = d ? new Date(d) : agora
  return Number.isNaN(t.getTime()) || t.getTime() > agora.getTime() ? agora : t
}

/**
 * Prazo contado de quando o texto saiu (não de quando o autor o viu). Se o prazo já passou quando o compromisso
 * é aberto (proposta captada ou ativada tarde), vence hoje: o painel mostra o atraso pela data de saída.
 */
export function prazoDesde(tipo: TipoCompromisso, saida: Date, agora: Date, regras: Record<TipoCompromisso, RegraPrazo> = PRAZOS_PADRAO): DataCivil {
  const p = calcularPrazo(tipo, saida, regras)
  const hoje = dataCivil(agora)
  return diferencaDias(p, hoje) < 0 ? hoje : p
}

export type SituacaoPrazo = 'em_dia' | 'perto' | 'vence_hoje' | 'atrasado'

/** "Perto" = faltam 2 dias ou menos (aviso amarelo no painel). */
export function situacaoPrazo(prazo: DataCivil, agora: Date): { situacao: SituacaoPrazo; dias: number } {
  const dias = diferencaDias(prazo, dataCivil(agora))
  if (dias < 0) return { situacao: 'atrasado', dias }
  if (dias === 0) return { situacao: 'vence_hoje', dias }
  if (dias <= 2) return { situacao: 'perto', dias }
  return { situacao: 'em_dia', dias }
}

export function textoPrazo(prazo: DataCivil, agora: Date): string {
  const { situacao, dias } = situacaoPrazo(prazo, agora)
  if (situacao === 'atrasado') return `Atrasado há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}`
  if (situacao === 'vence_hoje') return 'Vence hoje'
  if (dias === 1) return 'Vence amanhã'
  if (situacao === 'perto') return `Vence em ${dias} dias`
  return `Até ${formatarCurta(prazo)}`
}

/** Limite de pareceres prometidos em aberto (freio de capacidade da triagem). */
export const LIMITE_PROMETIDOS_PADRAO = 10

export function podeAtivarParecer(abertos: number, limite = LIMITE_PROMETIDOS_PADRAO) {
  return { pode: abertos < limite, abertos, limite }
}
