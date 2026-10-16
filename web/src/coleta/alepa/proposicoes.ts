/**
 * Proposições da Assembleia Legislativa do Pará (Alepa). O site não tem API aberta; a página de pesquisa
 * monta a lista com um painel DevExpress que responde a POST em /Legislativo/CallbackPanelProposicoes
 * (descoberto com navegador em 16/10/2026, ver web/levantamento/alternativas.json). A resposta é HTML com um
 * cartão por proposição (autor, "PROJETO DE LEI ORDINÁRIA Nº 669/2026, DE 13/10/2026", ementa), 10 por página,
 * das mais novas para as mais antigas. Filtros: ano, tipo (model[IdTipoProposicao]) e palavra (model[Texto]).
 *
 * O conector (alepa/conector.ts) junta esta lista com a página de detalhes de cada proposta (alepa/detalhes.ts).
 * Chave: alepa:proposicao:<IdProposicao>. Fonte: casa-pa.
 */
import { slugify } from '../../lib/texto'
import { ErroFormato, type AutorColetado, type PacoteProposicao } from '../tipos'

export const ALEPA = 'https://www.alepa.pa.gov.br'
export const NAVEGADOR = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

/** Tipos da Alepa (GetTipoProposicoes) que interessam, com a sigla usada no site. */
export const TIPOS_ALEPA: { codigo: number; sigla: string }[] = [
  { codigo: 3, sigla: 'PL' },
  { codigo: 4, sigla: 'PLC' },
  { codigo: 2, sigla: 'PEC' },
  { codigo: 1, sigla: 'PDL' },
]

export type CartaoAlepa = { id: number; tipo: string; sigla: string; numero: number; ano: number; data: string; autor: string; ementa: string }

const decodificar = (t: string) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function siglaAlepa(tipo: string): string | null {
  const t = tipo.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/LEI COMPLEMENTAR/.test(t)) return 'PLC'
  if (/LEI ORDINARIA|^PROJETO DE LEI$/.test(t)) return 'PL'
  if (/EMENDA CONSTITUCIONAL/.test(t)) return 'PEC'
  if (/DECRETO LEGISLATIVO/.test(t)) return 'PDL'
  return null
}

/** Total de resultados e cartões da resposta do painel. */
export function lerPainel(html: string): { total: number; cartoes: CartaoAlepa[] } {
  const total = Number(/(\d+) Resultados/.exec(html)?.[1] || 0)
  const cartoes: CartaoAlepa[] = []
  const re = /IdProposicao=(\d+)[^"']*["'][^>]*class=["']card-proposicao["']>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<span>([\s\S]*?)<\/span>\s*<p>([\s\S]*?)<\/p>/g
  let brutos = 0
  for (const m of html.matchAll(re)) {
    brutos++
    const cab = decodificar(m[3])
    const c = /^(.+?)\s+N[º°o.]?\s*(\d+)\s*\/\s*(\d{4})(?:,\s*DE\s+(\d{2})\/(\d{2})\/(\d{4}))?/i.exec(cab)
    if (!c) continue
    const sigla = siglaAlepa(c[1])
    if (!sigla) continue
    cartoes.push({
      id: Number(m[1]),
      tipo: c[1].trim(),
      sigla,
      numero: Number(c[2]),
      ano: Number(c[3]),
      data: c[4] ? `${c[6]}-${c[5]}-${c[4]}` : `${c[3]}-01-01`,
      autor: decodificar(m[2]),
      ementa: decodificar(m[4]),
    })
  }
  // Cartões que não são projetos (indicações, requerimentos) são ignorados; nenhum cartão legível é mudança de formato
  if (html && /cardViewProposicoes/.test(html) && total > 0 && !brutos) throw new ErroFormato('alepa', 'card-proposicao', 'CallbackPanelProposicoes')
  return { total, cartoes }
}

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** "DEP. DELEGADO NILTON NEVES" vira parlamentar; governo, mesa, tribunais ficam com o nome. */
export function autorAlepa(autor: string): AutorColetado | null {
  if (!autor) return null
  const dep = /^DEP(?:UTAD[OA])?\.?\s+(.+)$/i.exec(autor)
  if (dep) {
    const nome = capitalizar(dep[1])
    return { papel: 'autor', parlamentar: { chave: `alepa:parlamentar:${slugify(nome)}`, nome, uf: 'PA', casa: 'assembleia' } }
  }
  return { papel: 'autor', nomeLivre: capitalizar(autor) }
}

export function pacoteAlepa(c: CartaoAlepa): PacoteProposicao {
  const chave = `alepa:proposicao:${c.id}`
  const url = `${ALEPA}/Legislativo/DetalhesProposicao?IdProposicao=${c.id}`
  const autor = autorAlepa(c.autor)
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'PA',
      sigla: c.sigla,
      numero: c.numero,
      ano: c.ano,
      ementa: c.ementa,
      dataApresentacao: c.data,
      statusOficial: 'Apresentada na Alepa',
      statusSimplificado: 'em_tramitacao',
      ultimaMovimentacao: c.data,
      urlFonte: url,
      autoria: autor ? [autor] : [],
    },
    tramitacoes: [{ chave: `alepa:apresentacao:${c.id}`, proposicao: chave, data: c.data, orgao: 'Plenário', descricao: `${c.tipo} nº ${c.numero}/${c.ano} apresentado`, tipoEvento: 'apresentacao' }],
    versoes: [],
    votacoes: [],
  }
}

export type Postar = (url: string, corpo: Record<string, string>) => Promise<string>

export const postarNaRede: Postar = async (url, corpo) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': NAVEGADOR },
    body: new URLSearchParams(corpo).toString(),
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`)
  return r.text()
}

/** Corpo do POST do painel: só o ano e os filtros pedidos (o painel aceita sem o estado de sessão do DevExpress). */
export const pedidoPainel = (ano: number, filtros: { tipo?: number; texto?: string } = {}) => ({
  DXCallbackName: 'cbpProposicoes',
  __DXCallbackArgument: 'c0:[object Object]',
  'model[Numero]': '',
  'model[Ano]': String(ano),
  'model[IdAutor]': '',
  'model[Texto]': filtros.texto || '',
  ...(filtros.tipo ? { 'model[IdTipoProposicao]': String(filtros.tipo) } : {}),
})
