/**
 * Travas e avisos antes de publicar um parecer (painel, aba Publicar).
 * Travas impedem a publicação; avisos só alertam.
 */

export const SECOES_PARECER = [
  { nome: 'resumo', rotulo: 'Resumo' },
  { nome: 'oQueMuda', rotulo: 'O que muda' },
  { nome: 'impactos', rotulo: 'Impactos por dimensão' },
  { nome: 'pontosAtencao', rotulo: 'Pontos de atenção' },
  { nome: 'baseLegal', rotulo: 'Base legal' },
  { nome: 'recomendacoes', rotulo: 'Recomendações' },
  { nome: 'conclusao', rotulo: 'Conclusão' },
] as const

export type NomeSecao = (typeof SECOES_PARECER)[number]['nome']

/** Extrai texto puro de um campo rich text do Lexical (ou aceita string). */
export function textoDe(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor
  const partes: string[] = []
  const andar = (no: unknown) => {
    if (!no || typeof no !== 'object') return
    const n = no as { text?: unknown; children?: unknown[]; root?: unknown }
    if (typeof n.text === 'string') partes.push(n.text)
    if (n.root) andar(n.root)
    if (Array.isArray(n.children)) n.children.forEach(andar)
  }
  andar(valor)
  return partes.join(' ').replace(/\s+/g, ' ').trim()
}

/** Uma seção conta como escrita a partir de 20 caracteres. */
export const secaoEscrita = (v: unknown) => textoDe(v).length >= 20

export type ParecerParaPublicar = {
  secoes?: Partial<Record<NomeSecao, unknown>> | null
  impacto?: string | null
  carater?: string | null
  versao?: number | null
  notaDaVersao?: string | null
  temNotaTecnica?: boolean
  seo?: { tituloSeo?: string | null; metaDescricao?: string | null } | null
}

export function checarPublicacao(p: ParecerParaPublicar) {
  const travas: string[] = []
  const avisos: string[] = []
  const faltam = SECOES_PARECER.filter((s) => !secaoEscrita(p.secoes?.[s.nome]))
  if (faltam.length) travas.push(`Faltam ${faltam.length} seções do modelo: ${faltam.map((s) => s.rotulo).join(', ')}`)
  if (!p.impacto) travas.push('Impacto não definido')
  if (!p.carater) travas.push('Caráter não definido')
  if ((p.versao ?? 1) > 1 && !(p.notaDaVersao || '').trim()) travas.push('Descreva o que mudou nesta versão')
  if (!p.temNotaTecnica) avisos.push('Nota técnica não enviada (o parecer pode sair sem ela)')
  if ((p.seo?.tituloSeo || '').length > 60) avisos.push('Título SEO acima de 60 caracteres')
  if ((p.seo?.metaDescricao || '').length > 155) avisos.push('Descrição acima de 155 caracteres')
  return { pode: travas.length === 0, travas, avisos, secoesEscritas: SECOES_PARECER.length - faltam.length }
}
