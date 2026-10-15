import { PRAZOS_PADRAO, type RegraPrazo, type TipoCompromisso } from '../lib/compromissos'

type Ajustes = { prazos?: Partial<Record<'parecer' | 'atualizacao' | 'correcao' | 'credenciamento' | 'lgpd', number | null>> | null }

/** Regras de prazo a partir do global Ajustes já carregado. */
export function regrasDePrazoDe(a: Ajustes): Record<TipoCompromisso, RegraPrazo> {
  const p = a?.prazos || {}
  return {
    parecer_prometido: { dias: p.parecer || PRAZOS_PADRAO.parecer_prometido.dias, uteis: false },
    atualizacao: { dias: p.atualizacao || PRAZOS_PADRAO.atualizacao.dias, uteis: false },
    correcao: { dias: p.correcao || PRAZOS_PADRAO.correcao.dias, uteis: true },
    credenciamento: { dias: p.credenciamento || PRAZOS_PADRAO.credenciamento.dias, uteis: true },
    lgpd: { dias: p.lgpd || PRAZOS_PADRAO.lgpd.dias, uteis: false },
  }
}
