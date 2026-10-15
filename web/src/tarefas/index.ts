/**
 * Tarefas agendadas, chamadas por /api/cron/<tarefa> (GitHub Actions, ver .github/workflows/agendamentos.yml).
 */
import type { Payload } from 'payload'
import { enfileirar, enviarRegistro, linkDescadastro, modelo } from '../lib/email'
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
  // O conteúdo dos e-mails enviados não precisa ficar guardado (LGPD): mantém só o registro.
  await payload.update({ collection: 'envios', where: { status: { equals: 'enviado' }, createdAt: { less_than: dias(30) } }, data: { html: null, texto: null } })
  const v = await payload.delete({ collection: 'verificacoes', where: { createdAt: { less_than: dias(180) } } })
  return { coletasRemovidas: c.docs.length, verificacoesRemovidas: v.docs.length }
}

/** Monta a lista de destinatários dos comunicados cuja hora chegou e põe na fila. */
export async function processarComunicados(payload: Payload, agora = new Date()): Promise<Resumo> {
  const prontos = await payload.find({
    collection: 'comunicados',
    where: { status: { equals: 'agendado' }, or: [{ agendadoPara: { exists: false } }, { agendadoPara: { less_than_equal: agora.toISOString() } }] },
    limit: 10,
    depth: 0,
  })
  const feitos: { id: number | string; pessoas: number }[] = []
  for (const c of prontos.docs) {
    const and: Record<string, unknown>[] = [{ aceitaEmails: { equals: true } }, { confirmadoEm: { exists: true } }]
    if (c.perfis?.length) and.push({ perfil: { in: c.perfis } })
    if (c.subperfis?.length) and.push({ or: [{ subperfil: { in: c.subperfis } }, { curso: { in: c.subperfis } }] })
    if (c.uf) and.push({ uf: { equals: c.uf.toUpperCase() } })
    const r = await payload.find({ collection: 'assinantes', where: { and } as never, limit: 20000, pagination: false, depth: 0 })
    for (const a of r.docs) {
      const m = modelo({
        titulo: c.assunto,
        paragrafos: c.mensagem.replace(/\{nome\}/g, a.nome?.split(' ')[0] || '').split(/\n{2,}/),
        descadastro: linkDescadastro(a.id),
      })
      await enfileirar(payload, { tipo: 'comunicado', para: a.email, assunto: c.assunto, ...m, assinante: a.id, comunicado: c.id })
    }
    await payload.update({ collection: 'comunicados', id: c.id, data: { status: 'enviado', totalPrevisto: r.docs.length, enviadoEm: agora.toISOString() } })
    feitos.push({ id: c.id, pessoas: r.docs.length })
  }
  return { comunicados: feitos }
}

/** Envia o que está na fila (até 200 por rodada), com até 4 tentativas por e-mail. */
export async function enviarFila(payload: Payload): Promise<Resumo> {
  const fila = await payload.find({ collection: 'envios', where: { status: { equals: 'fila' } }, sort: 'createdAt', limit: 200, depth: 0 })
  let ok = 0
  for (const e of fila.docs) if (await enviarRegistro(payload, e)) ok++
  const falhas = fila.docs.length - ok
  if (falhas) await payload.create({ collection: 'verificacoes', data: { tipo: 'email', resultado: 'alerta', detalhe: `${falhas} e-mails falharam nesta rodada (nova tentativa na próxima)` } })
  return { enviados: ok, falhas }
}

/** Rodada de 15 minutos: publica agendados, monta comunicados e esvazia a fila. */
export async function quinzeMinutos(payload: Payload): Promise<Resumo> {
  return {
    publicacao: await publicarAgendados(payload),
    comunicados: await processarComunicados(payload),
    fila: await enviarFila(payload),
  }
}

export const TAREFAS: Record<string, (p: Payload) => Promise<Resumo>> = {
  verificacao: verificar,
  'publicar-agendados': publicarAgendados,
  comunicados: processarComunicados,
  'enviar-fila': enviarFila,
  'quinze-minutos': quinzeMinutos,
  limpeza: limpar,
}
