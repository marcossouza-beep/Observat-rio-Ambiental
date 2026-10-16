/**
 * SAPL (Interlegis) → formato comum. Uma única leitura serve a todas as Assembleias que usam o SAPL
 * (no Norte: AC, AM, RO e TO; ver docs/LEVANTAMENTO.md). Funções puras, testadas sobre respostas reais
 * gravadas em tests/fixtures/coleta/sapl/.
 *
 * Chaves: sapl:<uf>:<id da matéria>, sapl:<uf>:tram:<id>, sapl:<uf>:texto:<id>, sapl:<uf>:parlamentar:<id>.
 */
import { tipoDoAndamento, statusDaSituacao } from '../classificar'
import { dataBrasilia } from '../util'
import {
  ErroFormato,
  type AutorColetado,
  type PacoteProposicao,
  type StatusSimplificado,
  type TipoEvento,
  type TramitacaoColetada,
} from '../tipos'

export type Registro = Record<string, unknown>
export type Pagina = {
  pagination?: { next_page?: number | null; total_entries?: number }
  results?: Registro[]
}

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const numero = (v: unknown) =>
  typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const tabela = (lista: Registro[] | undefined) =>
  new Map((lista || []).map((r) => [Number(r.id), r]))

/**
 * Tipos de matéria que interessam ao observatório: projetos de lei e de código (de qualquer autoria), PEC, medidas
 * provisórias, decretos legislativos e vetos. Ficam de fora indicações (e "indicativos de projeto de lei"),
 * requerimentos, moções, emendas e substitutivos a projetos, prestações de contas etc.
 */
export function tipoDeInteresse(tipo: Registro | undefined): boolean {
  const d = normal(`${tipo?.descricao || ''}`)
  if (!d) return false
  if (
    /indicac|indicativ|requerimento|mocao|aplauso|pesar|prestacao de contas|eleicao|composicao|nulo|anexo|recurso|emenda (modificativa|aditiva|supressiva)|substitutiv|oficio|parecer|resolucao/.test(
      d,
    )
  )
    return false
  // Emendas a projetos ("Emenda Aditiva", "Emendas LDO", "Sub-Emenda") ficam de fora; a emenda à Constituição, não
  if (/^(sub ?-?)?emendas?\b/.test(d) && !/constitui/.test(d)) return false
  return /projeto de lei|projeto de codigo|emenda constitucional|emenda a constitui|medida provisoria|decreto legislativo|mensagem de veto|veto/.test(
    d,
  )
}

/** Sigla da matéria como a Assembleia usa (PLO, PLG, PEC, MP…); sem sigla, as iniciais do tipo. */
export function siglaDoTipo(tipo: Registro | undefined): string {
  const s = texto(tipo?.sigla)
    ?.replace(/[^A-Za-z-]/g, '')
    .toUpperCase()
  if (s) return s
  return (
    `${tipo?.descricao || 'MAT'}`
      .split(/\s+/)
      .filter((p) => p.length > 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'MAT'
  )
}

/** Nome do órgão da unidade de tramitação, sem o código ("01 - CCJ - Comissão de…" → "CCJ - Comissão de…"). */
export const nomeDaUnidade = (u: Registro | undefined) =>
  texto(u?.__str__)?.replace(/^\s*\d+\s*-\s*/, '')

/** Tipo do andamento a partir da situação do SAPL (antes das regras gerais, que foram feitas para Câmara e Senado). */
export function eventoDaSituacao(situacao: string, urgente = false): TipoEvento {
  const t = normal(situacao)
  if (
    /retirad|cancelament|desarquiv|aguardando|distribu|encaminhament|despachad|leitura|anexad|apensad|correcao|procuradoria/.test(
      t,
    )
  ) {
    if (/aguardando a inclusao na ordem do dia|pronta para (a )?ordem do dia/.test(t))
      return 'pauta'
    return 'outro'
  }
  if (/lei sancionada|lei promulgada|promulgacao de decreto|veto .*promulgado/.test(t))
    return 'sancao'
  if (/veto/.test(t) && !/rejeitado/.test(t)) return 'veto'
  if (/aprovad[ao] em (1|2|primeiro|segundo)/.test(t)) return 'votacao'
  if (/aprovad/.test(t)) return 'aprovacao'
  if (/rejeitad/.test(t)) return 'votacao'
  if (/arquivad/.test(t)) return 'arquivamento'
  if (urgente) return 'urgencia'
  return tipoDoAndamento(situacao)
}

/** Situação simples a partir da última situação da matéria. */
export function statusDaMateria(
  situacao: string | undefined,
  emTramitacao: boolean | undefined,
): StatusSimplificado {
  const t = normal(situacao || '')
  if (/lei sancionada|lei promulgada|promulgacao de decreto/.test(t)) return 'norma'
  if (/aguardando (autografo|promulgacao)|autografo de lei|aguardando sancao/.test(t))
    return 'aprovada'
  if (/^proposicao aprovada$|aprovada pelo plenario|redacao final aprovada/.test(t))
    return 'aprovada'
  if (/rejeitad|retirad[ao] pelo autor|cancelamento a pedido/.test(t)) return 'rejeitada'
  if (/arquivad|encaminhamento ao arquivo/.test(t)) return 'arquivada'
  return statusDaSituacao(situacao, emTramitacao)
}

export type ContextoSapl = {
  uf: string
  /** Endereço do SAPL da casa, sem barra no fim (ex.: https://sapl.al.to.leg.br). */
  base: string
  tipos: Map<number, Registro>
  situacoes: Map<number, Registro>
  unidades: Map<number, Registro>
  autores: Map<number, Registro>
}

/** Autor: deputado vira parlamentar (página própria); governo, tribunais e mesa ficam com o nome e o cargo. */
export function autorDe(
  autoria: Registro,
  ctx: ContextoSapl,
  primeiro: boolean,
): AutorColetado | null {
  const a = ctx.autores.get(Number(autoria.autor))
  if (!a) return null
  const nome = texto(a.nome) || texto(a.__str__)
  if (!nome) return null
  const papel = primeiro ? 'autor' : 'coautor'
  const parlamentarId = numero(a.object_id)
  if (parlamentarId && a.content_type != null && !texto(a.cargo)) {
    return {
      papel,
      parlamentar: {
        chave: `sapl:${ctx.uf}:parlamentar:${parlamentarId}`,
        nome,
        uf: ctx.uf.toUpperCase(),
        casa: 'assembleia',
      },
    }
  }
  const cargo = texto(a.cargo)
  return { papel, nomeLivre: cargo ? `${nome} (${cargo})` : nome }
}

/** Matéria + tramitações + autorias → pacote no formato comum. */
export function mapearMateria(
  m: Registro,
  tramitacoes: Registro[],
  autorias: Registro[],
  ctx: ContextoSapl,
): PacoteProposicao {
  const fonte = `sapl-${ctx.uf}`
  const id = numero(m.id)
  if (!id) throw new ErroFormato(fonte, 'id', 'materialegislativa')
  const num = numero(m.numero)
  const ano = numero(m.ano)
  const ementa = texto(m.ementa)
  if (!num || !ano) throw new ErroFormato(fonte, 'numero/ano', `materialegislativa ${id}`)
  if (!ementa) throw new ErroFormato(fonte, 'ementa', `materialegislativa ${id}`)
  const tipo = ctx.tipos.get(Number(m.tipo))
  const chave = `sapl:${ctx.uf}:${id}`

  // Andamentos do mais antigo para o mais novo
  const ordenadas = [...tramitacoes].sort((a, b) =>
    `${a.data_tramitacao}${a.id}`.localeCompare(`${b.data_tramitacao}${b.id}`),
  )
  const andamentos: TramitacaoColetada[] = ordenadas.flatMap((t) => {
    const data = dataBrasilia(t.data_tramitacao)
    if (!data) return []
    const situacao = texto(ctx.situacoes.get(Number(t.status))?.descricao) || 'Andamento'
    const obs = texto(t.texto)
    const orgao =
      nomeDaUnidade(ctx.unidades.get(Number(t.unidade_tramitacao_destino))) ||
      nomeDaUnidade(ctx.unidades.get(Number(t.unidade_tramitacao_local)))
    return [
      {
        chave: `sapl:${ctx.uf}:tram:${t.id}`,
        proposicao: chave,
        data,
        orgao,
        descricao: obs ? `${situacao}: ${obs}` : situacao,
        tipoEvento: eventoDaSituacao(situacao, t.urgente === true),
      },
    ]
  })
  const ultima = ordenadas.at(-1)
  const situacaoAtual = ultima
    ? texto(ctx.situacoes.get(Number(ultima.status))?.descricao)
    : undefined
  const autoria = [...autorias]
    .sort((a, b) => Number(b.primeiro_autor === true) - Number(a.primeiro_autor === true))
    .map((a, i) => autorDe(a, ctx, a.primeiro_autor === true || i === 0))
    .filter((a): a is AutorColetado => !!a)
  const pdf = texto(m.texto_original)
  const apresentacao = dataBrasilia(m.data_apresentacao)
  const atualizacao = dataBrasilia(m.data_ultima_atualizacao)

  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: ctx.uf.toUpperCase(),
      sigla: siglaDoTipo(tipo),
      numero: num,
      ano,
      ementa,
      dataApresentacao: apresentacao,
      statusOficial: situacaoAtual,
      statusSimplificado: statusDaMateria(situacaoAtual, m.em_tramitacao !== false),
      etapa: andamentos.at(-1)?.orgao,
      regime: tramitacoes.some((t) => t.urgente === true) ? 'urgencia' : 'normal',
      ultimaMovimentacao: andamentos.at(-1)?.data || atualizacao,
      urlInteiroTeor: pdf,
      urlFonte: `${ctx.base}/materia/${id}`,
      autoria,
      temasOficiais: texto(m.indexacao) ? [String(m.indexacao).slice(0, 200)] : undefined,
    },
    tramitacoes: andamentos,
    versoes:
      pdf && (apresentacao || atualizacao)
        ? [
            {
              chave: `sapl:${ctx.uf}:texto:${id}`,
              proposicao: chave,
              data: (apresentacao || atualizacao)!,
              tipo: 'original',
              rotulo: 'Texto original',
              url: pdf,
            },
          ]
        : [],
    votacoes: [],
  }
}
