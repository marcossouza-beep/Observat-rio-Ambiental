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
  parecer_prometido: { dias: 7, uteis: false },
  atualizacao: { dias: 5, uteis: false },
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
