/**
 * Travas e avisos antes de publicar um parecer (painel, aba Publicar).
 * Travas impedem a publicação; avisos só alertam.
 */

/**
 * Seções do parecer publicado no site: elucidativo e comparativo, com a classificação explicada.
 * A análise completa (problema, hipótese, cenários, soluções, casos) vai na nota técnica (PDF) e o
 * "antes × depois" artigo por artigo, no quadro comparativo (PDF). O bloco "Aprofunde" com os dois
 * PDFs é montado sozinho na página.
 */
export const SECOES_PARECER = [
  { nome: 'resumo', rotulo: 'Em uma frase', ajuda: 'O que a proposta faz, em linguagem simples. Também vai nos e-mails e nas listas do site.' },
  { nome: 'oQueE', rotulo: 'O que é', ajuda: 'Objeto, alcance (quem é atingido, onde, a partir de quando) e em que etapa está.' },
  { nome: 'oQueMuda', rotulo: 'Como é hoje × como fica', ajuda: 'Os 3 a 5 pontos principais no formato antes e depois. O detalhe artigo por artigo vai no quadro comparativo.' },
  { nome: 'classificacao', rotulo: 'Classificação', ajuda: 'Por que este impacto e este caráter, em 1 ou 2 linhas para cada.' },
  { nome: 'porQueImporta', rotulo: 'Por que importa', ajuda: 'Quem ganha, quem perde e o que está em jogo.' },
  { nome: 'pontosAtencao', rotulo: 'Pontos de atenção', ajuda: 'O que merece cuidado: positivo, atenção ou crítico.' },
  { nome: 'proximosPassos', rotulo: 'Próximos passos', ajuda: 'Onde a proposta está e o que vem na tramitação.' },
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
