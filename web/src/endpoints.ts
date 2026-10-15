import type { Endpoint } from 'payload'
import { situacaoFonte } from './lib/fontes'
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

export const endpoints = [saude, cron]
