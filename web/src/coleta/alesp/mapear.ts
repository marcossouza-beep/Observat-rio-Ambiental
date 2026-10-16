/**
 * Assembleia Legislativa de São Paulo (Alesp) → formato comum, pela API da aplicação de processo legislativo
 * (legis-api-portal-prd.al.sp.gov.br, achada com navegador em 16/10/2026; os dados abertos em arquivo têm 132 MB e não
 * servem para 4 coletas ao dia):
 *  - pesquisa: /processo?flPropositura=true&ano=&listaIdTipoProcesso=1&numero=&page=&size=&sort=desc (mais novas primeiro);
 *  - ficha: /processo/detalhes/principais/<id> (etapa, regime, última tramitação, norma, veto, autores, indexação);
 *  - andamentos: /processo/tramitacoes/<id>?page=&size=&sort=asc.
 * Funções puras, testadas sobre respostas reais gravadas em tests/fixtures/coleta/alesp/.
 *
 * Chaves: alesp:processo:<idProcesso> (proposta), alesp:tram:<id>:<data>:<texto>, alesp:parlamentar:<número>.
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

export const ALESP_API = 'https://legis-api-portal-prd.al.sp.gov.br'
export const ALESP = 'https://www.al.sp.gov.br'

/** Tipos de processo que interessam (id da API → sigla). */
export const TIPOS_ALESP: Record<number, string> = { 1: 'PL', 2: 'PLC', 5: 'PEC', 4: 'PDL' }
const ID_DA_SIGLA: Record<string, number> = Object.fromEntries(
  Object.entries(TIPOS_ALESP).map(([id, s]) => [s, Number(id)]),
)

export function urlPesquisaAlesp(f: {
  ano?: number
  sigla?: string
  numero?: number
  pagina?: number
  tamanho?: number
}): string {
  const q = new URLSearchParams({
    page: String(f.pagina || 0),
    size: String(f.tamanho || 50),
    sort: 'desc',
    flPropositura: 'true',
  })
  if (f.ano) q.set('ano', String(f.ano))
  if (f.numero) q.set('numero', String(f.numero))
  for (const id of f.sigla ? [ID_DA_SIGLA[f.sigla]] : Object.keys(TIPOS_ALESP).map(Number))
    q.append('listaIdTipoProcesso', String(id))
  return `${ALESP_API}/processo?${q.toString()}`
}

export type ResumoAlesp = {
  idProcesso: number
  tipoProcesso?: string
  numeroTipo?: number
  anoTipo?: number
  descricao?: string
  resumo?: string
  dtPublicacao?: string
  autorPrincipal?: string
  tipoAutorPrincipal?: string
  numeroAutorPrincipal?: number
  siglaPartidoPrincipal?: string | null
  transformadoNorma?: boolean | null
  houveVeto?: boolean | null
}

/** Itens de uma página da pesquisa (Spring: content, totalPages). */
export function lerPesquisaAlesp(r: unknown): { itens: ResumoAlesp[]; paginas: number } {
  const p = r as { content?: ResumoAlesp[]; totalPages?: number } | null
  if (!p || !Array.isArray(p.content)) throw new ErroFormato('alesp', 'content', '/processo')
  return { itens: p.content, paginas: Number(p.totalPages || 1) }
}

/** Sigla e número da proposta: "PL" + numeroTipo/anoTipo ("Projeto de Lei 884/2026"). */
export function identidadeAlesp(
  i: ResumoAlesp,
): { sigla: string; numero: number; ano: number } | null {
  const sigla = Object.values(TIPOS_ALESP).includes(String(i.tipoProcesso))
    ? String(i.tipoProcesso)
    : null
  const m = /(\d+)\s*\/\s*(\d{4})/.exec(i.descricao || '')
  const numero = Number(i.numeroTipo || m?.[1])
  const ano = Number(i.anoTipo || m?.[2])
  return sigla && numero && ano ? { sigla, numero, ano } : null
}

export type DetalhesAlesp = {
  idProcesso: number
  idTipoProcesso?: number
  numeroProcesso?: number
  anoProcesso?: number
  dtPublicacao?: string
  dtAutuacao?: string
  descricao?: string
  resumo?: string
  etapa?: string
  regimeTramitacao?: string
  ultimaTramitacao?: string
  transformadoNorma?: boolean
  descricaoNorma?: string | null
  urlNorma?: string | null
  houveVeto?: boolean
  tipoVeto?: string
  deliberacaoAlesp?: string | null
  urlSemPapel?: string
  indexadores?: { txTesauro?: string }[]
  autores?: { numero?: number; nome?: string; partido?: string | null }[]
}

export type AndamentoAlesp = { data: string; descricao: string }

/** Tramitações (página da API): data e descrição, com os nomes que a aplicação aceita. */
export function lerTramitacoesAlesp(r: unknown): AndamentoAlesp[] {
  const lista = Array.isArray(r) ? r : ((r as { content?: unknown[] } | null)?.content ?? [])
  return (lista as Record<string, unknown>[])
    .map((a) => ({
      data: String(a.data ?? a.dtTramitacao ?? a.dataAndamento ?? '').slice(0, 10),
      descricao: String(a.descricao ?? a.andamento ?? '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.data) && a.descricao)
}

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** Deputado (número de parlamentar) vira parlamentar; Governador, Mesa, tribunais ficam com o nome. */
export function autoresAlesp(
  d: Pick<DetalhesAlesp, 'autores'>,
  resumo?: ResumoAlesp,
): AutorColetado[] {
  const lista = d.autores?.length
    ? d.autores
    : resumo?.autorPrincipal
      ? [
          {
            numero: resumo.numeroAutorPrincipal,
            nome: resumo.autorPrincipal,
            partido: resumo.siglaPartidoPrincipal,
          },
        ]
      : []
  const parlamentar = resumo?.tipoAutorPrincipal === 'Parlamentar'
  return lista
    .filter((a) => a.nome)
    .map((a): AutorColetado => {
      const nome = capitalizar(a.nome!)
      if (
        /GOVERNADOR|MESA|TRIBUNAL|DEFENSORIA|MINIST[ÉE]RIO|COMISS/i.test(a.nome!) ||
        (!a.partido && !parlamentar)
      )
        return { papel: 'autor', nomeLivre: nome }
      return {
        papel: 'autor',
        parlamentar: {
          chave: `alesp:parlamentar:${a.numero ?? slugify(nome)}`,
          nome,
          uf: 'SP',
          casa: 'assembleia',
          ...(a.partido ? { partido: a.partido } : {}),
        },
      }
    })
}

export function eventoAlesp(descricao: string): TipoEvento {
  const t = descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/^INICIO DA TRAMITACAO|^PUBLICADO NO DIARIO OFICIAL|^LEITURA|PROTOCOLAD/.test(t))
    return 'apresentacao'
  // "Pauta de 1ª sessão (Emenda)" é o prazo de emendas, não a pauta de votação
  if (/^PAUTA DE \d+. SESSAO|^PUBLICADAS? AS? EMENDA/.test(t)) return 'outro'
  if (/ORDEM DO DIA|INCLUID[OA] NA PAUTA/.test(t)) return 'pauta'
  if (/URGENCIA/.test(t)) return 'urgencia'
  if (/SANCIONAD|PROMULGAD|LEI N[º°O]?\s*\d/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/APROVAD|AUTOGRAFO|REDACAO FINAL/.test(t)) return 'aprovacao'
  if (/PARECER|RELATOR/.test(t)) return 'parecer_relator'
  if (/ARQUIVAD/.test(t)) return 'arquivamento'
  return tipoDoAndamento(descricao)
}

export function statusAlesp(d: DetalhesAlesp): StatusSimplificado {
  if (d.transformadoNorma) return 'norma'
  if (d.houveVeto && /TOTAL/i.test(d.tipoVeto || '')) return 'vetada'
  const s = `${d.etapa || ''} ${d.deliberacaoAlesp || ''} ${d.ultimaTramitacao || ''}`.toUpperCase()
  if (/REJEITAD/.test(s)) return 'rejeitada'
  if (/ARQUIVAD|RETIRAD/.test(s)) return 'arquivada'
  if (/APROVAD|AUT[ÓO]GRAFO|SAN[ÇC][ÃA]O/.test(s)) return 'aprovada'
  return 'em_tramitacao'
}

export const chaveSP = (id: number) => `alesp:processo:${id}`

/** Resumo da pesquisa + ficha (+ andamentos) → pacote no formato comum. */
export function pacoteAlesp(
  r: ResumoAlesp,
  d?: DetalhesAlesp,
  andamentos: AndamentoAlesp[] = [],
): PacoteProposicao | null {
  const ident = identidadeAlesp(r)
  if (!ident) return null
  const chave = chaveSP(r.idProcesso)
  const data = (
    d?.dtPublicacao ||
    r.dtPublicacao ||
    andamentos[0]?.data ||
    `${ident.ano}-01-01`
  ).slice(0, 10)
  const tramitacoes = andamentos.length
    ? andamentos.map((a) => ({
        chave: `alesp:tram:${r.idProcesso}:${a.data}:${slugify(a.descricao).slice(0, 60)}`,
        proposicao: chave,
        data: a.data,
        descricao: a.descricao,
        tipoEvento: eventoAlesp(a.descricao),
      }))
    : [
        {
          chave: `alesp:publicacao:${r.idProcesso}`,
          proposicao: chave,
          data,
          orgao: 'Plenário',
          descricao: `${r.descricao || `${ident.sigla} ${ident.numero}/${ident.ano}`} publicado`,
          tipoEvento: 'apresentacao' as const,
        },
      ]
  const url = `${ALESP}/processo/${r.idProcesso}`
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'SP',
      sigla: ident.sigla,
      numero: ident.numero,
      ano: ident.ano,
      ementa: (d?.resumo || r.resumo || '').trim(),
      dataApresentacao: data,
      statusOficial:
        [d?.etapa, d?.ultimaTramitacao, d?.descricaoNorma].filter(Boolean).join(' · ') ||
        'Publicado na Alesp',
      statusSimplificado: d ? statusAlesp(d) : r.transformadoNorma ? 'norma' : 'em_tramitacao',
      etapa: d?.etapa || undefined,
      regime: /URG[ÊE]NCIA/i.test(d?.regimeTramitacao || '')
        ? 'urgencia'
        : /PRIORIDADE/i.test(d?.regimeTramitacao || '')
          ? 'prioridade'
          : 'normal',
      ultimaMovimentacao: andamentos.at(-1)?.data || data,
      urlInteiroTeor: d?.urlSemPapel || url,
      urlFonte: url,
      temasOficiais: (d?.indexadores || []).map((i) => i.txTesauro).filter((t): t is string => !!t),
      autoria: autoresAlesp(d || {}, r),
    },
    tramitacoes,
    versoes: [],
    votacoes: [],
  }
}
