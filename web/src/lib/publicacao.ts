/**
 * Travas e avisos antes de publicar um parecer (painel, aba Publicar).
 * Travas impedem a publicação; avisos só alertam.
 */

/**
 * Seções do parecer publicado no site, na lógica de um parecer prévio: antes delas a página mostra, sozinha,
 * o texto base da proposta (ementa e íntegra do arquivo oficial). Depois vêm a síntese, o objeto, o cotejo
 * entre o regime vigente e a proposta (comentário + quadro), a classificação e o resto.
 * A análise completa (problema, hipótese, cenários, soluções, casos) vai na nota técnica (PDF) e o cotejo
 * artigo por artigo, no quadro comparativo (PDF). O bloco "Aprofunde" com os dois PDFs é montado sozinho.
 * Os nomes (chaves) não mudam; só os rótulos.
 */
export const SECOES_PARECER = [
  { nome: 'resumo', rotulo: 'Síntese', ajuda: 'O que a proposta faz, em uma frase e em linguagem simples. Também vai nos e-mails e nas listas do site.' },
  { nome: 'oQueE', rotulo: 'Objeto e alcance', ajuda: 'Objeto, alcance (quem é atingido, onde, a partir de quando) e em que etapa está.' },
  {
    nome: 'oQueMuda',
    rotulo: 'Regime vigente e proposta',
    ajuda: 'Um parágrafo com o sentido geral das mudanças. Os 3 a 5 pontos principais vão no quadro logo abaixo; o detalhe artigo por artigo, no quadro comparativo (PDF).',
  },
  { nome: 'classificacao', rotulo: 'Classificação', ajuda: 'Por que este impacto e este caráter, em 1 ou 2 linhas para cada.' },
  { nome: 'porQueImporta', rotulo: 'Relevância', ajuda: 'Quem ganha, quem perde e o que está em jogo.' },
  { nome: 'pontosAtencao', rotulo: 'Pontos de atenção', ajuda: 'O que merece cuidado: positivo, atenção ou crítico.' },
  { nome: 'proximosPassos', rotulo: 'Tramitação e próximos passos', ajuda: 'Onde a proposta está e o que vem na tramitação.' },
] as const

/** Efeito de cada ponto do cotejo sobre a proteção ambiental (mesma legenda do quadro comparativo em PDF). */
export const EFEITOS_COTEJO = [
  { value: 'amplia', label: 'Amplia a proteção', sinal: '↑' },
  { value: 'reduz', label: 'Reduz a proteção', sinal: '↓' },
  { value: 'neutro', label: 'Sem efeito direto na proteção', sinal: '=' },
] as const
export type PontoCotejo = { dispositivo?: string | null; vigente?: string | null; proposto?: string | null; efeito?: string | null }

/** Numeração romana das partes do parecer prévio (I é o texto base). */
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const romano = (n: number) => ROMANOS[n - 1] || String(n)

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
  secoes?: (Partial<Record<NomeSecao, unknown>> & { comparativo?: PontoCotejo[] | null }) | null
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
  const pontos = (p.secoes?.comparativo || []).filter((c) => (c.vigente || '').trim() && (c.proposto || '').trim())
  if (!pontos.length) avisos.push('Quadro "regime vigente e proposta" vazio: o leitor verá só o comentário')
  if (!p.temNotaTecnica) avisos.push('Nota técnica não enviada (o parecer pode sair sem ela)')
  if ((p.seo?.tituloSeo || '').length > 60) avisos.push('Título SEO acima de 60 caracteres')
  if ((p.seo?.metaDescricao || '').length > 155) avisos.push('Descrição acima de 155 caracteres')
  return { pode: travas.length === 0, travas, avisos, secoesEscritas: SECOES_PARECER.length - faltam.length }
}
