/**
 * Regras que transformam o texto oficial (andamentos, situações, votos) nas categorias do site.
 * Valem para a Câmara e o Senado: as duas casas descrevem os mesmos atos com palavras parecidas.
 */
import { normalizar } from '../lib/relevancia'
import type { Regime, StatusSimplificado, TipoEvento, TipoVersao, Voto } from './tipos'

const tem = (t: string, re: RegExp) => re.test(t)

/** Tipo do andamento, a partir da descrição e do despacho (sem acento, minúsculas). */
export function tipoDoAndamento(...partes: (string | null | undefined)[]): TipoEvento {
  const t = normalizar(partes.filter(Boolean).join(' · '))
  if (!t) return 'outro'
  // Sanção com veto parcial é sanção (vira lei); o veto em si tramita depois, no Congresso.
  if (tem(t, /sancionad/)) return 'sancao'
  if (tem(t, /\bvet(o|ad[ao]|os)\b/) && !tem(t, /sem veto/)) return 'veto'
  if (tem(t, /remetid[ao] a sancao|enviad[ao] a sancao|despacho a sancao|remessa a sancao|envio a sancao/)) return 'aprovacao'
  if (tem(t, /sancionad|\bsancao\b|transformad[ao] (em|na) (norma|lei)|norma juridica gerada/)) return 'sancao'
  if (tem(t, /\barquiv(ad[ao]|amento)\b/) && !tem(t, /desarquiv/)) return 'arquivamento'
  if (tem(t, /urgencia/) && tem(t, /aprovad|aprovacao|requerimento|regime de urgencia|deferid/)) return 'urgencia'
  if (tem(t, /substitutivo/)) return 'substitutivo'
  if (tem(t, /parecer (d[oa]|de) relator|apresentacao do parecer|parecer proferido|aprovad[ao] o parecer|parecer aprovado/)) return 'parecer_relator'
  if (tem(t, /aprovad[ao] (a|o) (materia|projeto|proposicao|redacao final|substitutivo)|aprovad[ao] em (primeiro|segundo|unico) turno|materia aprovada|projeto aprovado/))
    return 'aprovacao'
  if (tem(t, /\bvotacao\b|em votacao|votacao nominal|votacao simbolica/)) return 'votacao'
  if (tem(t, /ordem do dia|pronta para pauta|incluid[ao] (na|em) pauta|inclusao (na|em) pauta|\bem pauta\b|pautad[ao]/)) return 'pauta'
  if (tem(t, /apresentacao d[ae] proposicao|^apresentacao\b|proposicao apresentada|leitura em plenario|recebimento.*autoria/)) return 'apresentacao'
  return 'outro'
}

/** Situação simplificada (cards e filtros do site) a partir da situação oficial. */
export function statusDaSituacao(situacao: string | null | undefined, tramitando?: boolean | null): StatusSimplificado {
  const t = normalizar(situacao || '')
  if (tem(t, /norma juridica|transformad[ao] (em|na) (lei|norma)|lei ordinaria|lei complementar|sancionad|promulgad/)) return 'norma'
  if (tem(t, /vetad[ao] total/)) return 'vetada'
  if (tem(t, /rejeitad|retirad[ao] pel[oa]|prejudicad/)) return 'rejeitada'
  if (tem(t, /arquivad|perdeu a eficacia|eficacia encerrada|tramitacao encerrada/)) return 'arquivada'
  if (tem(t, /aguardando sancao|remetid[ao] a sancao|enviad[ao] a sancao|aguardando promulgacao/)) return 'aprovada'
  if (tramitando === false) return 'arquivada'
  return 'em_tramitacao'
}

export function regimeDe(texto: string | null | undefined): Regime {
  const t = normalizar(texto || '')
  if (tem(t, /urgencia/)) return 'urgencia'
  if (tem(t, /prioridade/)) return 'prioridade'
  return 'normal'
}

/** Voto individual. Códigos de ausência do Senado (AP, LS, MIS…) contam como ausente. */
export function votoDe(texto: string | null | undefined): Voto {
  const t = normalizar(texto || '')
  if (t === 'sim') return 'sim'
  if (t === 'nao') return 'nao'
  if (tem(t, /absten/)) return 'abstencao'
  if (tem(t, /obstru/)) return 'obstrucao'
  if (tem(t, /ausen|licen|missao|^(ap|ls|lp|lc|mis|ncom|rep|ats|lsp|lai|p-nrv|nrv)$/)) return 'ausente'
  return 'outro'
}

/**
 * Documento que é uma nova versão do texto, quando o andamento traz arquivo.
 * Parecer sem substitutivo não muda o texto: não conta como versão.
 */
export function tipoDaVersao(...partes: (string | null | undefined)[]): TipoVersao | null {
  const t = normalizar(partes.filter(Boolean).join(' · '))
  if (tem(t, /emenda aglutinativa/)) return 'emenda_aglutinativa'
  if (tem(t, /redacao final/)) return 'redacao_final'
  if (tem(t, /substitutivo/)) return 'substitutivo'
  if (tem(t, /autografo|remessa ao senado|remetid[ao] (a|ao) (camara|senado)/)) return 'autografo'
  return null
}

const ROTULO_VERSAO: Record<TipoVersao, string> = {
  original: 'Texto original',
  substitutivo: 'Substitutivo',
  parecer_relator: 'Parecer do relator',
  emenda_aglutinativa: 'Emenda aglutinativa',
  redacao_final: 'Redação final',
  autografo: 'Texto enviado à outra casa',
  norma: 'Lei publicada',
}

export const rotuloVersao = (tipo: TipoVersao, orgao?: string) => (orgao ? `${ROTULO_VERSAO[tipo]} (${orgao === 'PLEN' ? 'Plenário' : orgao})` : ROTULO_VERSAO[tipo])

/** Etapa mostrada no site a partir do órgão onde a proposta está. */
export function etapaDoOrgao(sigla: string | null | undefined): string | undefined {
  if (!sigla) return undefined
  const s = sigla.toUpperCase()
  if (s === 'PLEN' || s === 'PLENARIO') return 'Plenário'
  if (s === 'MESA' || s === 'SGM' || s === 'SECEX' || s === 'CCP') return 'Mesa'
  return 'Comissões'
}

/** Eventos que o Radar leva ao painel do autor (docs/ROADMAP.md, Fase 2). */
export const EVENTOS_DO_RADAR: TipoEvento[] = ['pauta', 'urgencia', 'substitutivo', 'votacao', 'aprovacao', 'sancao', 'veto']
