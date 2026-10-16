/**
 * Assembleia Legislativa de Minas Gerais (ALMG) → formato comum. A API de dados abertos
 * (dadosabertos.almg.gov.br/ws/proposicoes/pesquisa/direcionada?formato=json&tipo=PL&ano=2026&tp=20&p=1) devolve as
 * proposições em ordem decrescente de número, cada uma completa: autor, ementa, situação, local, regime, data da última
 * ação, indexação temática e o histórico inteiro de tramitação. Regras de uso: no máximo duas chamadas ao mesmo tempo e
 * um segundo entre uma e outra.
 * Funções puras, testadas sobre respostas reais gravadas em tests/fixtures/coleta/almg/.
 *
 * Chaves: almg:<SIGLA>-<número>-<ano> (proposta), almg:tram:<proposta>:<passo>, almg:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import { tipoDoAndamento } from '../classificar'
import { ErroFormato, type AutorColetado, type PacoteProposicao, type StatusSimplificado, type TipoEvento } from '../tipos'

export const ALMG_API = 'https://dadosabertos.almg.gov.br'
export const ALMG = 'https://www.almg.gov.br'

/** Tipos que interessam (sigla da API). */
export const TIPOS_ALMG = ['PL', 'PLC', 'PEC']

export type ItemAlmg = {
  siglaTipoProjeto?: string
  tipoProjeto?: string
  numero?: string | number
  ano?: string | number
  autor?: string
  ementa?: string
  indexacao?: string
  situacao?: string
  situacaoGeral?: string
  dataPublicacao?: string
  regime?: string
  local?: string
  dataUltimaAcao?: string
  listaHistoricoTramitacoes?: { passo?: number; data?: string; local?: string; historico?: string }[]
  linksTextos?: { descricao?: string; url?: string }[]
  resumo?: string
}

export type RespostaAlmg = { resultado?: { noDocumentos?: number; tamanhoPagina?: number; numPagina?: number; erro?: unknown; listaItem?: ItemAlmg[] } }

/** Endereço da pesquisa direcionada (tp = itens por página; p = página). */
export function urlPesquisaAlmg(f: { tipo: string; ano?: number; numero?: number; pagina?: number; tamanho?: number }): string {
  const q = new URLSearchParams({ formato: 'json', tipo: f.tipo })
  if (f.numero) q.set('num', String(f.numero))
  if (f.ano) q.set('ano', String(f.ano))
  q.set('tp', String(f.tamanho || 20))
  if (f.pagina && f.pagina > 1) q.set('p', String(f.pagina))
  return `${ALMG_API}/ws/proposicoes/pesquisa/direcionada?${q.toString()}`
}

/** Itens da resposta; formato inesperado vira ErroFormato (a fonte avisa na saúde das fontes). */
export function itensAlmg(r: unknown): { itens: ItemAlmg[]; total: number } {
  const res = (r as RespostaAlmg | null)?.resultado
  if (!res || (res.listaItem !== undefined && !Array.isArray(res.listaItem))) throw new ErroFormato('almg', 'resultado.listaItem', 'proposicoes/pesquisa/direcionada')
  return { itens: res.listaItem || [], total: Number(res.noDocumentos || 0) }
}

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** "Deputado Fulano", "Deputada Fulana" viram parlamentar; Governador, Tribunal, comissões ficam com o nome. */
export function autoresAlmg(autor: string | undefined): AutorColetado[] {
  return (autor || '')
    .split(/\n|,(?=\s*Deputad)/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a): AutorColetado => {
      const dep = /^Deputad[oa]s?\s+(.+)$/i.exec(a)
      if (!dep) return { papel: 'autor', nomeLivre: a }
      const nome = capitalizar(dep[1].trim())
      return { papel: 'autor', parlamentar: { chave: `almg:parlamentar:${slugify(nome)}`, nome, uf: 'MG', casa: 'assembleia' } }
    })
}

export function eventoAlmg(historico: string): TipoEvento {
  const t = historico.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/^PROPOSICAO RECEBIDA EM PLENARIO|PUBLICADO NO DL/.test(t) && /RECEBIDA EM PLENARIO/.test(t)) return 'apresentacao'
  if (/SANCIONAD|LEI N[º°O]?\s*\d/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/INCLUID[OA] NA ORDEM DO DIA|ORDEM DO DIA/.test(t)) return 'pauta'
  if (/APROVAD[OA]/.test(t)) return 'aprovacao'
  if (/PARECER|RELATOR|DESIGNAD[OA]/.test(t)) return 'parecer_relator'
  if (/ARQUIVAD/.test(t)) return 'arquivamento'
  if (/URGENCIA/.test(t)) return 'urgencia'
  return tipoDoAndamento(historico)
}

export function statusAlmg(i: ItemAlmg): StatusSimplificado {
  const s = `${i.situacao || ''} ${i.situacaoGeral || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/TRANSFORMAD[OA] EM (LEI|NORMA)|SANCIONAD|PROMULGAD/.test(s)) return 'norma'
  if (/VETAD[OA] TOTAL|VETO TOTAL MANTIDO/.test(s)) return 'vetada'
  if (/REJEITAD/.test(s)) return 'rejeitada'
  if (/ARQUIVAD|RETIRAD|PREJUDICAD/.test(s)) return 'arquivada'
  if (/AGUARDANDO SANCAO|ENVIAD[OA] A SANCAO|APROVAD[OA] EM (2|SEGUNDO|TURNO UNICO)|REDACAO FINAL APROVADA/.test(s)) return 'aprovada'
  return 'em_tramitacao'
}

export const chaveMG = (sigla: string, numero: number, ano: number) => `almg:${sigla}-${numero}-${ano}`
export const urlProposicaoAlmg = (sigla: string, numero: number, ano: number) =>
  `${ALMG}/atividade-parlamentar/projetos-de-lei/texto/?tipo=${sigla}&num=${numero}&ano=${ano}`

/** Item da API → pacote no formato comum, com o histórico inteiro como andamentos. */
export function pacoteAlmg(i: ItemAlmg): PacoteProposicao | null {
  const sigla = String(i.siglaTipoProjeto || '').trim()
  const numero = Number(i.numero)
  const ano = Number(i.ano)
  if (!sigla || !numero || !ano) return null
  const chave = chaveMG(sigla, numero, ano)
  const id = `${sigla}-${numero}-${ano}`
  const tramitacoes = (i.listaHistoricoTramitacoes || [])
    .filter((h) => h.data && h.historico)
    .map((h, n) => {
      const texto = h.historico!.replace(/\s*\n\s*/g, ' ').trim()
      return {
        chave: `almg:tram:${id}:${h.passo ?? n + 1}`,
        proposicao: chave,
        data: h.data!.slice(0, 10),
        orgao: h.local?.trim() || undefined,
        descricao: texto.slice(0, 1000),
        tipoEvento: eventoAlmg(texto),
      }
    })
  const temas = (i.indexacao || '')
    .split('\n')
    .map((l) => /^\/Tema\/(.+)$/.exec(l.trim())?.[1]?.split('/')[0])
    .filter((t): t is string => !!t)
  const apresentacao = i.dataPublicacao || tramitacoes[0]?.data
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'MG',
      sigla,
      numero,
      ano,
      ementa: (i.ementa || '').trim(),
      dataApresentacao: apresentacao,
      statusOficial: [i.situacao, i.local && `(${i.local})`].filter(Boolean).join(' '),
      statusSimplificado: statusAlmg(i),
      etapa: i.local || undefined,
      regime: /URG[ÊE]NCIA/i.test(i.regime || '') ? 'urgencia' : 'normal',
      ultimaMovimentacao: i.dataUltimaAcao || tramitacoes.at(-1)?.data || apresentacao,
      urlInteiroTeor: urlProposicaoAlmg(sigla, numero, ano),
      urlFonte: urlProposicaoAlmg(sigla, numero, ano),
      temasOficiais: [...new Set(temas)],
      autoria: autoresAlmg(i.autor),
    },
    tramitacoes,
    versoes: [],
    votacoes: [],
  }
}
