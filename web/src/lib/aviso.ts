/** Qual bloco a página da lei mostra no lugar do parecer (docs/SEO.md, seção 8; docs/ENTREGA.md). */

export type Aviso =
  | { tipo: 'parecer' }
  | { tipo: 'desatualizado'; desde: string }
  | { tipo: 'em_preparacao'; prazo?: string | null }
  | { tipo: 'acompanhando' }

export function avisoDaLei(
  prop: { situacaoEditorial?: string | null; prazoParecer?: string | null },
  parecer?: { status?: string | null; desatualizadoDesde?: string | null } | null,
): Aviso {
  if (parecer?.status === 'publicado') {
    return parecer.desatualizadoDesde ? { tipo: 'desatualizado', desde: parecer.desatualizadoDesde } : { tipo: 'parecer' }
  }
  if (prop.situacaoEditorial === 'ativa') return { tipo: 'em_preparacao', prazo: prop.prazoParecer }
  return { tipo: 'acompanhando' }
}

/** Situações editoriais que aparecem no site. Triagem e descartadas nunca são públicas. */
export const SITUACOES_PUBLICAS = ['ativa', 'monitorada'] as const
