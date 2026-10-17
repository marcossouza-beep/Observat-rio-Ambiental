/**
 * Assembleia Legislativa de Santa Catarina (Alesc) → formato comum, pelo e-Legis (portalelegis.alesc.sc.gov.br):
 *  - lista do processo legislativo (/proposicoes/processo-legislativo?page=), das mais novas para as mais antigas, 10 por
 *    página, com filtros tipoPropositura, numeroPropositura e ano: número ("PL./0640/2026"), ementa, entrada, autoria,
 *    setor e situação atuais;
 *  - ficha (/proposicoes/<id>/tramitacoes): regime, matéria legislativa e a linha do tempo (texto, data, setor de origem
 *    e de destino).
 * Funções puras, testadas sobre páginas reais gravadas em tests/fixtures/coleta/alesc/.
 *
 * Chaves: alesc:proposicao:<id> (proposta), alesc:tram:<id>:<data>:<texto>, alesc:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import { tipoDoAndamento } from '../classificar'
import {
  ErroFormato,
  type AutorColetado,
  type PacoteProposicao,
  type StatusSimplificado,
  type TipoEvento,
} from '../tipos'

export const ELEGIS = 'https://portalelegis.alesc.sc.gov.br'

/** Siglas do e-Legis que interessam → sigla aqui, e o código do filtro tipoPropositura. */
export const TIPOS_ALESC: Record<string, { sigla: string; codigo: number }> = {
  'PL.': { sigla: 'PL', codigo: 1 },
  PLC: { sigla: 'PLC', codigo: 2 },
  PEC: { sigla: 'PEC', codigo: 7 },
  PDL: { sigla: 'PDL', codigo: 6 },
}

export function urlListaAlesc(
  f: { pagina?: number; sigla?: string; numero?: number; ano?: number } = {},
): string {
  const q = new URLSearchParams()
  const t = Object.values(TIPOS_ALESC).find((x) => x.sigla === f.sigla)
  if (t) q.set('tipoPropositura', String(t.codigo))
  if (f.numero) q.set('numeroPropositura', String(f.numero))
  if (f.ano) q.set('ano', String(f.ano))
  if (f.pagina && f.pagina > 1) q.set('page', String(f.pagina))
  const qs = q.toString()
  return `${ELEGIS}/proposicoes/processo-legislativo${qs ? `?${qs}` : ''}`
}

const limpar = (t: string) =>
  t
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const dataBR = (d: string) => {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export type CartaoAlesc = {
  id: string
  sigla: string
  numero: number
  ano: number
  ementa: string
  entrada: string | null
  autores: string[]
  setor: string
  situacao: string
}

const linha = (bloco: string, rotulo: string) =>
  new RegExp(`fw-bold[^>]*>\\s*${rotulo}\\s*<\\/div>\\s*<div[^>]*>([\\s\\S]*?)<\\/div>`).exec(
    bloco,
  )?.[1] ?? ''

/** Cartões de uma página da lista (só os tipos que interessam) e o total de páginas. */
export function lerListaAlesc(html: string): {
  cartoes: CartaoAlesc[]
  brutos: number
  paginas: number
} {
  const cartoes: CartaoAlesc[] = []
  let brutos = 0
  for (const bloco of html.split('<div class="card card-alesc').slice(1)) {
    const cab =
      /<h4 class="card-title">\s*<a href="\/proposicoes\/([A-Za-z0-9]+)">([^<]+)<\/a>/.exec(bloco)
    if (!cab) continue
    brutos++
    const n = /^([A-Z.]+)\/0*(\d+)\/(\d{4})$/.exec(cab[2].trim())
    const tipo = n && TIPOS_ALESC[n[1]]
    if (!n || !tipo) continue
    cartoes.push({
      id: cab[1],
      sigla: tipo.sigla,
      numero: Number(n[2]),
      ano: Number(n[3]),
      ementa: limpar(/<p class="mb-1 fst-italic"[^>]*>([\s\S]*?)<\/p>/.exec(bloco)?.[1] ?? ''),
      entrada: dataBR(linha(bloco, 'Entrada')),
      autores: [...linha(bloco, 'Autoria').matchAll(/<li>([\s\S]*?)<\/li>/g)]
        .map((m) => limpar(m[1]))
        .filter(Boolean),
      setor: limpar(linha(bloco, 'Setor atual')),
      situacao: limpar(linha(bloco, 'Situação atual')),
    })
  }
  if (/Exibindo \d/.test(html) && /card-alesc/.test(html) && !brutos)
    throw new ErroFormato('alesc', 'card-alesc', '/proposicoes/processo-legislativo')
  const paginas = Math.max(1, ...[...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1])))
  return { cartoes, brutos, paginas }
}

export type FichaAlesc = {
  regime?: string
  materia?: string
  andamentos: { data: string; descricao: string; de?: string; para?: string }[]
}

/** Ficha da proposta: regime, matéria e a linha do tempo de tramitações (em ordem de data). */
export function lerFichaAlesc(html: string): FichaAlesc {
  const campo = (rotulo: string) =>
    limpar(new RegExp(`<th>${rotulo}<\\/th>\\s*<td>([\\s\\S]*?)<\\/td>`).exec(html)?.[1] ?? '') ||
    undefined
  const andamentos: FichaAlesc['andamentos'] = []
  for (const li of html.split('<li class="timeline-item').slice(1)) {
    const descricao = limpar(/<p class="mb-1 fw-bold">([\s\S]*?)<\/p>/.exec(li)?.[1] ?? '')
    const data = dataBR(
      /<p class="mb-1 text-muted">\s*<small>([\s\S]*?)<\/small>/.exec(li)?.[1] ?? '',
    )
    if (!descricao || !data) continue
    const setores = [...li.matchAll(/<small class="text-center">([\s\S]*?)<\/small>/g)].map((m) =>
      limpar(m[1]),
    )
    andamentos.push({
      data,
      descricao,
      ...(setores[0] ? { de: setores[0] } : {}),
      ...(setores[1] ? { para: setores[1] } : {}),
    })
  }
  andamentos.sort((a, b) => a.data.localeCompare(b.data))
  const regime = campo('Regime de tramitação')
  const materia = campo('Matéria legislativa')
  return {
    regime: regime === '-' ? undefined : regime,
    materia: materia === '-' ? undefined : materia,
    andamentos,
  }
}

/** "Deputado Altair Silva", "Deputada Paulinha" viram parlamentar; Governador, comissões, Mesa ficam com o nome. */
export function autoresAlesc(autores: string[]): AutorColetado[] {
  return autores.map((a): AutorColetado => {
    const dep = /^Deputad[oa]\s+(.+)$/i.exec(a)
    if (!dep) return { papel: 'autor', nomeLivre: a }
    const nome = dep[1].trim()
    return {
      papel: 'autor',
      parlamentar: {
        chave: `alesc:parlamentar:${slugify(nome)}`,
        nome,
        uf: 'SC',
        casa: 'assembleia',
      },
    }
  })
}

export function eventoAlesc(descricao: string): TipoEvento {
  const t = descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/^LIDO NO EXPEDIENTE|^PROTOCOLAD/.test(t)) return 'apresentacao'
  if (/ORDEM DO DIA|INCLUID[OA] NA PAUTA|PAUTAD/.test(t)) return 'pauta'
  if (/URGENCIA/.test(t)) return 'urgencia'
  if (/SANCIONAD|PROMULGAD|LEI N[º°O]?\s*\d/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/APROVAD|AUTOGRAFO|REDACAO FINAL/.test(t)) return 'aprovacao'
  if (/PARECER|RELATOR|DISTRIBUID/.test(t)) return 'parecer_relator'
  if (/ARQUIVAD/.test(t)) return 'arquivamento'
  return tipoDoAndamento(descricao)
}

export function statusAlesc(situacao: string): StatusSimplificado {
  const s = situacao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/TRANSFORMAD[OA] EM LEI|SANCIONAD|PROMULGAD|LEI PUBLICADA/.test(s)) return 'norma'
  if (/VETAD[OA] TOTAL|VETO TOTAL MANTIDO/.test(s)) return 'vetada'
  if (/REJEITAD/.test(s)) return 'rejeitada'
  if (/ARQUIVAD|RETIRAD|PREJUDICAD/.test(s)) return 'arquivada'
  if (/AGUARDANDO SANCAO|APROVAD|AUTOGRAFO/.test(s)) return 'aprovada'
  return 'em_tramitacao'
}

export const chaveSC = (id: string) => `alesc:proposicao:${id}`

/** Cartão (e a ficha, quando lida) → pacote no formato comum. */
export function pacoteAlesc(c: CartaoAlesc, f?: FichaAlesc): PacoteProposicao {
  const chave = chaveSC(c.id)
  const url = `${ELEGIS}/proposicoes/${c.id}`
  const data = c.entrada || f?.andamentos[0]?.data || `${c.ano}-01-01`
  const tramitacoes = f?.andamentos.length
    ? f.andamentos.map((a) => ({
        chave: `alesc:tram:${c.id}:${a.data}:${slugify(a.descricao).slice(0, 60)}`,
        proposicao: chave,
        data: a.data,
        orgao: a.para || a.de,
        descricao: a.para && a.de ? `${a.descricao} (${a.de} → ${a.para})` : a.descricao,
        tipoEvento: eventoAlesc(a.descricao),
      }))
    : [
        {
          chave: `alesc:entrada:${c.id}`,
          proposicao: chave,
          data,
          orgao: 'Diretoria Legislativa',
          descricao: 'Entrada na Alesc',
          tipoEvento: 'apresentacao' as const,
        },
      ]
  // A mesma descrição no mesmo dia aparece mais de uma vez (setores diferentes): a chave leva a ordem
  const vistas = new Map<string, number>()
  for (const t of tramitacoes) {
    const n = (vistas.get(t.chave) || 0) + 1
    vistas.set(t.chave, n)
    if (n > 1) t.chave = `${t.chave}:${n}`
  }
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'SC',
      sigla: c.sigla,
      numero: c.numero,
      ano: c.ano,
      ementa: c.ementa,
      dataApresentacao: data,
      statusOficial: [c.situacao, c.setor && `(${c.setor})`].filter(Boolean).join(' '),
      statusSimplificado: statusAlesc(c.situacao),
      etapa: c.setor || undefined,
      regime: /URG[ÊE]NCIA/i.test(f?.regime || '') ? 'urgencia' : 'normal',
      ultimaMovimentacao: f?.andamentos.at(-1)?.data || data,
      urlInteiroTeor: `${url}/documentos`,
      urlFonte: url,
      temasOficiais: f?.materia ? [f.materia] : [],
      autoria: autoresAlesc(c.autores),
    },
    tramitacoes,
    versoes: [],
    votacoes: [],
  }
}
