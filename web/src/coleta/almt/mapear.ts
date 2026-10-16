/**
 * Assembleia Legislativa de Mato Grosso (ALMT) → formato comum. A API própria (api.al.mt.gov.br) exige chave; a
 * pesquisa de proposições (www.al.mt.gov.br/proposicao) é aberta, responde a GET com filtros (tipo, número, ano, data de
 * publicação no Diário) e traz 10 cartões por página: ementa, "Projeto de lei nº 1/2026 Dep. Fulano", protocolo,
 * processo e o PDF da proposição. Os andamentos ficam em /proposicao/<id>/tramitacoes.
 * Funções puras, testadas sobre páginas reais gravadas em tests/fixtures/coleta/almt/.
 *
 * Chaves: almt:proposicao:<id> (proposta), almt:tram:<id>:<data>:<texto>, almt:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import { tipoDoAndamento } from '../classificar'
import {
  ErroFormato,
  type AutorColetado,
  type EventoColetado,
  type PacoteProposicao,
  type StatusSimplificado,
  type TipoEvento,
} from '../tipos'

export const ALMT = 'https://www.al.mt.gov.br'

/** Tipos da pesquisa (valor do formulário) que interessam, com a sigla usada aqui. */
export const TIPOS_ALMT: { codigo: number; sigla: string; nome: RegExp }[] = [
  { codigo: 1, sigla: 'PL', nome: /^Projeto de lei$/i },
  { codigo: 2, sigla: 'PLC', nome: /^Projeto de lei complementar$/i },
  { codigo: 11, sigla: 'PEC', nome: /^Proposta de emenda à Constitui[çc][ãa]o$/i },
  { codigo: 3, sigla: 'PDL', nome: /^Projeto de decreto legislativo$/i },
  { codigo: 5, sigla: 'VET', nome: /^Veto$/i },
]

const campo = (k: string) => `almt_form_proposicao_search_proposicao[${k}]`

/** Endereço da pesquisa com os filtros pedidos (só os preenchidos). */
export function urlPesquisa(f: {
  tipo?: number
  numero?: number
  ano?: number
  desde?: string
  palavra?: string
  pagina?: number
}): string {
  const q = new URLSearchParams()
  if (f.tipo) q.set(campo('tipoPropositura'), String(f.tipo))
  if (f.palavra) q.set(campo('palavraChave'), f.palavra)
  if (f.numero) q.set(campo('numeroPropositura'), String(f.numero))
  if (f.ano) q.set(campo('ano'), String(f.ano))
  if (f.desde) q.set(campo('dataPublicacaoInicio'), f.desde.split('-').reverse().join('/'))
  if (f.pagina && f.pagina > 1) q.set('page', String(f.pagina))
  return `${ALMT}/proposicao?${q.toString()}`
}

const decodificar = (t: string) =>
  t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&ordm;/g, 'º')
    .replace(/&ordf;/g, 'ª')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()

export type CartaoAlmt = {
  id: number
  tipo: string
  sigla: string
  numero: number
  ano: number
  autor: string
  ementa: string
  protocolo?: string
  data?: string
  pdf?: string
}

export const siglaAlmt = (tipo: string) =>
  TIPOS_ALMT.find((t) => t.nome.test(tipo.trim()))?.sigla || null

/** Cartões de uma página da pesquisa (só os tipos que interessam) e o número de páginas. */
export function lerPesquisa(html: string): {
  cartoes: CartaoAlmt[]
  paginas: number
  brutos: number
} {
  const cartoes: CartaoAlmt[] = []
  let brutos = 0
  for (const m of html.matchAll(
    /<h3 class="fs-16">([\s\S]*?)<\/h3>\s*<div class="text-muted mb-2">([\s\S]*?)<\/div>\s*<div id="collapse-group-(\d+)">([\s\S]*?)(?=<h3 class="fs-16">|<nav|$)/g,
  )) {
    brutos++
    const cab = decodificar(m[2]).replace(/\s+/g, ' ')
    const c = /^(.+?) n[º°o]\s*(\d+)\/(\d{4})\s*(.*?)\s*-\s*Protocolo n[º°o]\s*([\d/]+)/i.exec(cab)
    if (!c) continue
    const sigla = siglaAlmt(c[1])
    if (!sigla) continue
    const pdf = /href="(\/storage\/webdisco\/[^"]+\.pdf)"/.exec(m[4])?.[1]
    // O nome do PDF traz o carimbo do protocolo (20260113165425... → 2026-01-13)
    const carimbo = pdf && /\/(\d{4})(\d{2})(\d{2})\d{6}/.exec(pdf)
    cartoes.push({
      id: Number(m[3]),
      tipo: c[1].trim(),
      sigla,
      numero: Number(c[2]),
      ano: Number(c[3]),
      autor: c[4].trim(),
      ementa: decodificar(m[1]).split('\n')[0].trim(),
      protocolo: c[5],
      data: carimbo ? `${carimbo[1]}-${carimbo[2]}-${carimbo[3]}` : undefined,
      pdf: pdf ? `${ALMT}${pdf}` : undefined,
    })
  }
  const paginas = Math.max(
    1,
    ...[...html.matchAll(/(?:[?&]|&amp;)page=(\d+)/g)].map((m) => Number(m[1])),
  )
  if (/Projetos em Tramita/.test(html) && /collapse-group-\d+/.test(html) && !brutos)
    throw new ErroFormato('almt', 'cartão de proposição', '/proposicao')
  return { cartoes, paginas, brutos }
}

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** "Dep. Eduardo Botelho" vira parlamentar; "Mensagem nº 6/2026" (governo), lideranças e Mesa ficam com o nome. */
export function autorAlmt(autor: string): AutorColetado | null {
  const a = autor.trim()
  if (!a) return null
  if (/^Mensagem/i.test(a)) return { papel: 'autor', nomeLivre: `Governo do Estado (${a})` }
  const dep = /^Dep(?:utad[oa])?\.?\s+(.+)$/i.exec(a)
  if (!dep) return { papel: 'autor', nomeLivre: a }
  // "Fabio Tardin - Fabinho": fica o nome parlamentar
  const nome = capitalizar(
    dep[1]
      .split(/\s+-\s+/)[0]
      .split(/,| e /)[0]
      .trim(),
  )
  return {
    papel: 'autor',
    parlamentar: { chave: `almt:parlamentar:${slugify(nome)}`, nome, uf: 'MT', casa: 'assembleia' },
  }
}

export const chaveMT = (id: number) => `almt:proposicao:${id}`

/** Veto (cartão próprio na ALMT) → andamento da proposta vetada: "VETO PARCIAL APOSTO AO PROJETO DE LEI Nº 864/2023". */
export function eventoDoVeto(c: CartaoAlmt): EventoColetado | null {
  const m =
    /VETO (TOTAL|PARCIAL)?\s*APOSTO AO PROJETO DE (LEI COMPLEMENTAR|LEI)\s*N[º°O]\s*(\d+)\/(\d{4})/i.exec(
      c.ementa,
    )
  if (!m) return null
  const sigla = /COMPLEMENTAR/i.test(m[2]) ? 'PLC' : 'PL'
  const data = c.data || `${c.ano}-01-01`
  return {
    alvo: {
      chaves: [],
      identificacoes: [`${sigla} ${Number(m[3])}/${m[4]}`],
      esfera: 'estadual',
      uf: 'MT',
    },
    tramitacoes: [
      {
        chave: `almt:veto:${c.id}`,
        data,
        orgao: 'Governo do Estado',
        descricao:
          `Veto ${(m[1] || '').toLowerCase()} nº ${c.numero}/${c.ano} (${c.autor})`.replace(
            '  ',
            ' ',
          ),
        tipoEvento: 'veto',
        urlDocumento: c.pdf,
      },
    ],
  }
}

export type AndamentoAlmt = { data: string; descricao: string; orgao?: string; documento?: string }

/** Andamentos de /proposicao/<id>/tramitacoes ("16/04/2025 - Lido: 20ª Sessão Ordinária", com o PDF do parecer). */
export function lerTramitacoes(html: string): AndamentoAlmt[] {
  const r: AndamentoAlmt[] = []
  for (const m of html.matchAll(
    /<div class="mb-1">\s*(\d{2})\/(\d{2})\/(\d{4})\s*-\s*([\s\S]*?)<\/div>/g,
  )) {
    const corpo = m[4]
    const documento = /href="([^"]+\.pdf)"/i.exec(corpo)?.[1]
    const descricao = decodificar(corpo.replace(/<a[\s\S]*?<\/a>/g, ''))
      .replace(/\s+/g, ' ')
      .trim()
    if (!descricao) continue
    r.push({ data: `${m[3]}-${m[2]}-${m[1]}`, descricao, ...(documento ? { documento } : {}) })
  }
  // A página vem em ordem de data; os da mesma data ficam na ordem em que aparecem
  return r
}

export function eventoAlmt(descricao: string): TipoEvento {
  const t = descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/^LIDO|PROTOCOL|LEITURA|RECEBID/.test(t)) return 'apresentacao'
  // "Cumprindo pauta" é o prazo de emendas em plenário, não a pauta de votação
  if (/CUMPRI(?:NDO|RA|MENTO D[OE])\s+PAUTA/.test(t)) return 'outro'
  if (/ORDEM DO DIA|INCLUID[OA] NA PAUTA/.test(t)) return 'pauta'
  if (/URGENCIA/.test(t)) return 'urgencia'
  if (/AGUARDANDO SANCAO|APROVAD|APROV\.|AUTOGRAFO|REDACAO FINAL/.test(t)) return 'aprovacao'
  if (/PARECER|RELATOR/.test(t)) return 'parecer_relator'
  if (/SANCIONAD|^LEI N/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/ARQUIVAD|AO ARQUIVO/.test(t)) return 'arquivamento'
  if (/^MANTIDO|^DERRUBAD|^REJEITAD/.test(t)) return 'votacao'
  return tipoDoAndamento(descricao)
}

export function statusAlmt(andamentos: AndamentoAlmt[]): StatusSimplificado {
  const t = andamentos.map((a) => a.descricao.toUpperCase()).join(' | ')
  if (/SANCIONAD|LEI N[º°O]/.test(t)) return 'norma'
  if (/VETAD[OA] TOTAL/.test(t)) return 'vetada'
  if (/ARQUIVAD/.test(andamentos.at(-1)?.descricao.toUpperCase() || '')) return 'arquivada'
  if (/REJEITAD/.test(t)) return 'rejeitada'
  if (
    /AGUARDANDO SAN[ÇC][ÃA]O|APROV(?:AD[OA]|\.) EM (2|SEGUNDA|[ÚU]NICA)|REDA[ÇC][ÃA]O FINAL APROVADA|AUT[ÓO]GRAFO/.test(
      t,
    )
  )
    return 'aprovada'
  return 'em_tramitacao'
}

/** Cartão (e os andamentos, quando lidos) → pacote no formato comum. */
export function pacoteAlmt(c: CartaoAlmt, andamentos: AndamentoAlmt[] = []): PacoteProposicao {
  const chave = chaveMT(c.id)
  const autor = autorAlmt(c.autor)
  const data = c.data || andamentos[0]?.data || `${c.ano}-01-01`
  const tramitacoes = andamentos.length
    ? andamentos.map((a) => ({
        chave: `almt:tram:${c.id}:${a.data}:${slugify(a.descricao).slice(0, 60)}`,
        proposicao: chave,
        data: a.data,
        orgao: a.orgao,
        descricao: a.descricao,
        tipoEvento: eventoAlmt(a.descricao),
        ...(a.documento ? { urlDocumento: a.documento } : {}),
      }))
    : [
        {
          chave: `almt:protocolo:${c.id}`,
          proposicao: chave,
          data,
          orgao: 'Secretaria de Serviços Legislativos',
          descricao: `Protocolado (protocolo nº ${c.protocolo || '?'})`,
          tipoEvento: 'apresentacao' as const,
        },
      ]
  const ultima = andamentos.at(-1)
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'MT',
      sigla: c.sigla,
      numero: c.numero,
      ano: c.ano,
      ementa: c.ementa,
      dataApresentacao: data,
      statusOficial: ultima ? ultima.descricao.slice(0, 200) : 'Protocolado na ALMT',
      statusSimplificado: statusAlmt(andamentos),
      etapa: ultima?.orgao,
      ultimaMovimentacao: ultima?.data || data,
      urlInteiroTeor: c.pdf,
      urlFonte: urlPesquisa({
        tipo: TIPOS_ALMT.find((t) => t.sigla === c.sigla)?.codigo,
        numero: c.numero,
        ano: c.ano,
      }),
      autoria: autor ? [autor] : [],
    },
    tramitacoes,
    versoes: c.pdf
      ? [
          {
            chave: `almt:texto:${c.id}`,
            proposicao: chave,
            data,
            tipo: 'original',
            rotulo: 'Texto da proposição (ALMT)',
            url: c.pdf,
          },
        ]
      : [],
    votacoes: [],
  }
}
