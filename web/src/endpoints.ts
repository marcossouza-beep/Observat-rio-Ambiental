import type { Endpoint, Payload } from 'payload'
import { situacaoFonte } from './lib/fontes'
import { endpointsSite } from './endpoints-site'
import { TAREFAS } from './tarefas'

/** GET /api/saude — usado pelo monitor externo. Não expõe dados pessoais. */
const saude: Endpoint = {
  path: '/saude',
  method: 'get',
  handler: async (req) => {
    const agora = new Date()
    try {
      const fontes = await req.payload.find({ collection: 'fontes', limit: 200, depth: 0, where: { ativa: { equals: true } } })
      const vencidos = await req.payload.count({
        collection: 'compromissos',
        where: { status: { equals: 'aberto' }, prazoEm: { less_than: agora.toISOString() } },
      })
      return Response.json({
        ok: true,
        banco: 'ok',
        em: agora.toISOString(),
        fontes: fontes.docs.map((f) => ({
          fonte: f.slug,
          situacao: situacaoFonte(
            { manual: f.manual ?? false, ultimaColetaOk: f.ultimaColetaOk ? new Date(f.ultimaColetaOk) : null, itensUltimaColeta: f.itensUltimaColeta, mediaItens30d: f.mediaItens30d },
            agora,
          ),
          ultimaColetaOk: f.ultimaColetaOk ?? null,
        })),
        compromissosVencidos: vencidos.totalDocs,
      })
    } catch (e) {
      return Response.json({ ok: false, banco: 'falha', erro: (e as Error).message }, { status: 503 })
    }
  },
}

/** POST /api/cron/:tarefa — protegido por CRON_SECRET (cabeçalho Authorization: Bearer ...). */
const cron: Endpoint = {
  path: '/cron/:tarefa',
  method: 'post',
  handler: async (req) => {
    const segredo = process.env.CRON_SECRET
    if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
      return Response.json({ ok: false, erro: 'não autorizado' }, { status: 401 })
    }
    const nome = String(req.routeParams?.tarefa || '')
    const tarefa = TAREFAS[nome]
    if (!tarefa) return Response.json({ ok: false, erro: `tarefa desconhecida: ${nome}`, tarefas: Object.keys(TAREFAS) }, { status: 404 })
    const inicio = Date.now()
    try {
      const resumo = await tarefa(req.payload)
      return Response.json({ ok: true, tarefa: nome, ms: Date.now() - inicio, resumo })
    } catch (e) {
      req.payload.logger.error({ err: e, tarefa: nome }, 'Falha na tarefa agendada')
      return Response.json({ ok: false, tarefa: nome, erro: (e as Error).message }, { status: 500 })
    }
  },
}

/**
 * Recalcula nota de relevância e termos encontrados das propostas na Triagem com o dicionário atual
 * (depois de o autor mexer nas palavras-chave). O gancho de Proposições refaz a conta quando a nota está vazia.
 */
export async function recalcularTriagem(payload: Payload) {
  const lista = await payload.find({ collection: 'proposicoes', where: { situacaoEditorial: { equals: 'triagem' } }, limit: 1000, depth: 0, pagination: false, select: { relevancia: true } })
  let mudaram = 0
  for (const p of lista.docs) {
    const r = await payload.update({ collection: 'proposicoes', id: p.id, data: { relevancia: null }, depth: 0 })
    if (r.relevancia !== p.relevancia) mudaram++
  }
  return { propostas: lista.docs.length, mudaram }
}

/** POST /api/triagem/recalcular — botão da Triagem (só equipe). */
const triagemRecalcular: Endpoint = {
  path: '/triagem/recalcular',
  method: 'post',
  handler: async (req) => {
    if (!req.user || (req.user as { collection?: string }).collection !== 'users') return Response.json({ ok: false, erro: 'não autorizado' }, { status: 401 })
    return Response.json({ ok: true, ...(await recalcularTriagem(req.payload)) })
  },
}

export const endpoints = [saude, cron, triagemRecalcular, ...endpointsSite]
