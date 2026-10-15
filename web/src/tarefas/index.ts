/**
 * Tarefas agendadas, chamadas por /api/cron/<tarefa> (GitHub Actions, ver .github/workflows/agendamentos.yml).
 */
import type { Payload } from 'payload'
import { situacaoFonte } from '../lib/fontes'

type Resumo = Record<string, unknown>

/** Verificação horária: fontes atrasadas, compromissos vencidos. Grava em Verificações. */
export async function verificar(payload: Payload, agora = new Date()): Promise<Resumo> {
  const fontes = await payload.find({ collection: 'fontes', where: { ativa: { equals: true } }, limit: 200, depth: 0 })
  const problemas: { fonte: string; situacao: string }[] = []
  for (const f of fontes.docs) {
    const s = situacaoFonte(
      {
        manual: f.manual ?? false,
        ultimaColetaOk: f.ultimaColetaOk ? new Date(f.ultimaColetaOk) : null,
        itensUltimaColeta: f.itensUltimaColeta,
        mediaItens30d: f.mediaItens30d,
      },
      agora,
    )
    if (s === 'atrasada' || s === 'volume_baixo') problemas.push({ fonte: f.slug, situacao: s })
  }
  await payload.create({
    collection: 'verificacoes',
    data: {
      tipo: 'fonte',
      resultado: problemas.length ? 'alerta' : 'ok',
      detalhe: problemas.length ? problemas.map((p) => `${p.fonte}: ${p.situacao}`).join('; ') : 'Todas as fontes em dia',
      dados: { problemas },
    },
  })

  const vencidos = await payload.find({
    collection: 'compromissos',
    where: { status: { equals: 'aberto' }, prazoEm: { less_than: agora.toISOString() } },
    limit: 0,
    depth: 0,
  })
  await payload.create({
    collection: 'verificacoes',
    data: {
      tipo: 'compromissos',
      resultado: vencidos.totalDocs ? 'alerta' : 'ok',
      detalhe: vencidos.totalDocs ? `${vencidos.totalDocs} compromissos públicos vencidos` : 'Nenhum compromisso vencido',
    },
  })
  return { fontesComProblema: problemas, compromissosVencidos: vencidos.totalDocs }
}

/** Publica os pareceres agendados cuja hora chegou (as travas de publicação continuam valendo). */
export async function publicarAgendados(payload: Payload, agora = new Date()): Promise<Resumo> {
  const prontos = await payload.find({
    collection: 'pareceres',
    where: { status: { equals: 'agendado' }, agendadoPara: { less_than_equal: agora.toISOString() } },
    limit: 50,
    depth: 0,
  })
  const publicados: (string | number)[] = []
  const erros: string[] = []
  for (const p of prontos.docs) {
    try {
      await payload.update({ collection: 'pareceres', id: p.id, data: { status: 'publicado' } })
      publicados.push(p.id)
    } catch (e) {
      erros.push(`${p.id}: ${(e as Error).message}`)
    }
  }
  if (erros.length) {
    await payload.create({
      collection: 'verificacoes',
      data: { tipo: 'compromissos', resultado: 'falha', detalhe: `Parecer agendado não publicado: ${erros.join(' | ')}`.slice(0, 500) },
    })
  }
  return { publicados, erros }
}

/** Remove amostras de coleta com mais de 90 dias e verificações com mais de 180. */
export async function limpar(payload: Payload, agora = new Date()): Promise<Resumo> {
  const dias = (n: number) => new Date(agora.getTime() - n * 864e5).toISOString()
  const c = await payload.delete({ collection: 'coletas', where: { inicio: { less_than: dias(90) } } })
  const v = await payload.delete({ collection: 'verificacoes', where: { createdAt: { less_than: dias(180) } } })
  return { coletasRemovidas: c.docs.length, verificacoesRemovidas: v.docs.length }
}

export const TAREFAS: Record<string, (p: Payload) => Promise<Resumo>> = {
  verificacao: verificar,
  'publicar-agendados': publicarAgendados,
  limpeza: limpar,
}
