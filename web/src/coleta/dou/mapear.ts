/**
 * Diário Oficial da União (INLABS): cada ato é um XML <article> com atributos (tipo, órgão, data, página)
 * e os campos Identifica, Ementa e Texto (HTML dentro de CDATA).
 * Daqui saem: leis e medidas provisórias, decretos, atos dos órgãos ambientais e as mensagens de veto.
 */
import type { EventoColetado, PacoteProposicao } from '../tipos'
import { dataBrasilia, inteiro } from '../util'
import { normalizar } from '../../lib/relevancia'

export type AtoDou = {
  id: string
  tipo: string
  categoria: string
  data: string
  secao?: string
  edicao?: string
  pagina?: string
  url?: string
  identifica: string
  ementa: string
  texto: string
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ordm: 'º', ordf: 'ª', sect: '§' }

export function textoPlano(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

const atributo = (tag: string, nome: string) => new RegExp(`\\b${nome}="([^"]*)"`, 'i').exec(tag)?.[1]?.trim() || ''

function campo(xml: string, nome: string): string {
  const m = new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i').exec(xml)
  if (!m) return ''
  const bruto = m[1].trim()
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(bruto)
  return cdata ? cdata[1] : bruto
}

/** Um arquivo XML do INLABS → ato. Devolve null se não for um ato reconhecível. */
export function lerAto(xml: string): AtoDou | null {
  const tag = /<article\b[^>]*>/i.exec(xml)?.[0]
  if (!tag) return null
  const id = atributo(tag, 'idMateria') || atributo(tag, 'id')
  const pub = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(atributo(tag, 'pubDate'))
  const data = pub ? dataBrasilia(`${pub[3]}-${pub[2]}-${pub[1]}`) : undefined
  if (!id || !data) return null
  const identifica = textoPlano(campo(xml, 'Identifica'))
  const texto = textoPlano(campo(xml, 'Texto'))
  return {
    id,
    tipo: atributo(tag, 'artType'),
    categoria: atributo(tag, 'artCategory'),
    data,
    secao: atributo(tag, 'pubName') || undefined,
    edicao: atributo(tag, 'editionNumber') || undefined,
    pagina: atributo(tag, 'numberPage') || undefined,
    url: atributo(tag, 'pdfPage').replace(/&amp;/g, '&') || undefined,
    identifica,
    ementa: textoPlano(campo(xml, 'Ementa')),
    texto,
  }
}

/** Órgãos acompanhados nos atos infralegais (portarias, instruções normativas, resoluções). O mais específico vem antes. */
const ORGAOS: [RegExp, string][] = [
  [/instituto brasileiro do meio ambiente|ibama/, 'IBAMA'],
  [/chico mendes|icmbio/, 'ICMBIO'],
  [/servico florestal/, 'SFB'],
  [/agencia nacional de aguas/, 'ANA'],
  [/conselho nacional do meio ambiente|conama/, 'CONAMA'],
  [/fundacao nacional dos povos indigenas|funai/, 'FUNAI'],
  [/colonizacao e reforma agraria|incra/, 'INCRA'],
  [/ministerio do meio ambiente/, 'MMA'],
  [/ministerio da agricultura/, 'MAPA'],
  [/ministerio de minas e energia/, 'MME'],
]
export const orgaoDoAto = (a: AtoDou) => ORGAOS.find(([re]) => re.test(normalizar(a.categoria)))?.[1]

/** Sigla do ato no site: LEI, LCP, MPV, DEC, DLG; infralegais com o órgão (ex.: PRT-IBAMA). */
export function siglaDoAto(a: AtoDou): string | null {
  const t = normalizar(`${a.tipo} ${a.identifica.split(/\sN[º°O.]/i)[0]}`)
  if (/lei complementar/.test(t)) return 'LCP'
  if (/medida provisoria/.test(t)) return 'MPV'
  if (/decreto legislativo/.test(t)) return 'DLG'
  if (/^lei\b|\blei\b/.test(t) && !/projeto de lei/.test(t)) return 'LEI'
  if (/^decreto\b/.test(t)) return 'DEC'
  const orgao = orgaoDoAto(a)
  if (!orgao) return null
  if (/instrucao normativa/.test(t)) return `IN-${orgao}`
  if (/portaria/.test(t)) return `PRT-${orgao}`
  if (/resolucao/.test(t)) return `RES-${orgao}`
  return null
}

/** Número e ano pela identificação: "LEI Nº 15.190, DE 8 DE AGOSTO DE 2025". */
export function numeroEAno(a: AtoDou): { numero: number; ano: number } | null {
  const numero = inteiro(/\bN[º°O.]*\s*([\d.]+)/i.exec(a.identifica)?.[1]?.replace(/\./g, ''))
  const ano = inteiro(/DE\s+(\d{4})\s*$/i.exec(a.identifica.trim())?.[1]) ?? inteiro(a.data.slice(0, 4))
  return numero && ano ? { numero, ano } : null
}

/** Mensagem de veto: "…decidi vetar parcialmente… o Projeto de Lei nº 2.951, de 2024…" */
export function vetoDaMensagem(a: AtoDou): { total: boolean; identificacao: string } | null {
  const t = `${a.identifica}\n${a.texto}`
  const veto = /vetar\s+(total|parcial)mente/i.exec(t)
  if (!veto) return null
  const pl = /Projeto de Lei( Complementar| de Convers[ãa]o)?\s+n[º°o]\s*([\d.]+),?\s+de\s+(\d{4})/i.exec(t)
  if (!pl) return null
  const sigla = /complementar/i.test(pl[1] || '') ? 'PLP' : /convers/i.test(pl[1] || '') ? 'PLV' : 'PL'
  return { total: /total/i.test(veto[1]), identificacao: `${sigla} ${Number(pl[2].replace(/\./g, ''))}/${pl[3]}` }
}

const onde = (a: AtoDou) => [a.secao === 'DO1E' || /extra/i.test(a.secao || '') ? 'edição extra' : 'Seção 1', a.edicao ? `ed. ${a.edicao}` : '', a.pagina ? `p. ${a.pagina}` : ''].filter(Boolean).join(', ')

/** Decide o que o ato vira: fato de uma proposta acompanhada, proposta nova (se relevante) ou nada. */
export function classificarAto(
  a: AtoDou,
  ctx: { acompanhadas: Set<string>; descartadas: Set<string>; relevancia: (t: string) => number; notaMinima: number },
): { evento?: EventoColetado; pacote?: PacoteProposicao; nota?: number } {
  const chave = `dou:${a.id}`
  if (ctx.descartadas.has(chave)) return {}
  const veto = vetoDaMensagem(a)
  if (veto) {
    if (!ctx.acompanhadas.has(veto.identificacao)) return {}
    const msg = numeroEAno(a)
    return {
      evento: {
        alvo: { chaves: [], identificacoes: [veto.identificacao] },
        tramitacoes: [
          {
            chave,
            data: a.data,
            orgao: 'PR',
            descricao: `Veto ${veto.total ? 'total' : 'parcial'} publicado no Diário Oficial${msg ? ` (Mensagem nº ${msg.numero}/${msg.ano})` : ''}, ${onde(a)}`,
            tipoEvento: 'veto',
            urlDocumento: a.url,
          },
        ],
      },
    }
  }
  const sigla = siglaDoAto(a)
  const na = numeroEAno(a)
  if (!sigla || !na) return {}
  const ident = `${sigla} ${na.numero}/${na.ano}`
  const norma = sigla === 'LEI' || sigla === 'LCP' ? `norma:${sigla === 'LCP' ? 'lcp' : 'lei'}:${na.numero}:${na.ano}` : null
  const textoNovo = { chave, data: a.data, tipo: (sigla === 'MPV' ? 'original' : 'norma') as 'original' | 'norma', rotulo: sigla === 'MPV' ? 'Texto publicado no Diário Oficial' : 'Lei publicada no Diário Oficial', url: a.url || '', texto: a.texto }
  const publicacao = {
    chave: `${chave}:publicacao`,
    data: a.data,
    orgao: orgaoDoAto(a) || 'DOU',
    descricao: `${a.identifica || ident} publicada no Diário Oficial da União (${onde(a)})`,
    tipoEvento: (sigla === 'MPV' ? 'apresentacao' : norma ? 'sancao' : 'outro') as 'apresentacao' | 'sancao' | 'outro',
    urlDocumento: a.url,
  }
  // Lei de proposta acompanhada (pela lei gerada) ou medida provisória já acompanhada (pelo número)
  const conhecida = (norma && ctx.acompanhadas.has(norma)) || (sigla === 'MPV' && ctx.acompanhadas.has(ident)) || ctx.acompanhadas.has(chave)
  if (conhecida) {
    return { evento: { alvo: { chaves: [norma, chave].filter((c): c is string => !!c), identificacoes: sigla === 'MPV' ? [ident] : [] }, tramitacoes: [publicacao], versoes: a.url ? [textoNovo] : [] } }
  }
  const nota = ctx.relevancia(`${a.identifica} ${a.ementa} ${a.texto.slice(0, 3000)}`)
  if (nota < ctx.notaMinima) return { nota }
  const ementa = a.ementa || a.texto.split('\n').find((l) => l.length > 40 && !/^(o|a) (presidente|ministr|diretor)/i.test(l))?.slice(0, 600) || a.identifica
  return {
    nota,
    pacote: {
      proposicao: {
        chave,
        casa: 'presidencia',
        sigla,
        numero: na.numero,
        ano: na.ano,
        ementa,
        dataApresentacao: a.data,
        statusOficial: 'Publicada no Diário Oficial',
        statusSimplificado: sigla === 'MPV' ? 'em_tramitacao' : 'norma',
        ultimaMovimentacao: a.data,
        urlInteiroTeor: a.url,
        urlFonte: a.url,
        temasOficiais: a.categoria ? [a.categoria.split('/').slice(-2).join(' / ')] : [],
        chavesExtras: norma ? [norma] : [],
      },
      tramitacoes: [{ ...publicacao, proposicao: chave }],
      versoes: a.url ? [{ ...textoNovo, proposicao: chave }] : [],
      votacoes: [],
    },
  }
}
