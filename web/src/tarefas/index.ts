/**
 * Tarefas agendadas, chamadas por /api/cron/<tarefa> (GitHub Actions, ver .github/workflows/agendamentos.yml).
 */
import type { Payload } from 'payload'
import { enfileirar, enviarRegistro, linkDescadastro, modelo } from '../lib/email'
import { estadoDaFonte, limiteDaFonte, situacaoFonte } from '../lib/fontes'
import { SITE_URL } from '../lib/rotulos'
import { alertasDiarios, resumoSemanal } from './automaticos'

type Resumo = Record<string, unknown>

/** Verificação horária: fontes atrasadas, compromissos vencidos. Grava em Verificações. */
export async function verificar(payload: Payload, agora = new Date()): Promise<Resumo> {
  const fontes = await payload.find({ collection: 'fontes', where: { ativa: { equals: true } }, limit: 200, depth: 0 })
  const problemas: { fonte: string; situacao: string }[] = []
  const avisar: AvisoFonte[] = []
  for (const f of fontes.docs) {
    const s = situacaoFonte(estadoDaFonte(f), agora)
    const problema = s === 'atrasada' || s === 'volume_baixo'
    if (problema) problemas.push({ fonte: f.slug, situacao: s })
    // Aviso à equipe: na primeira vez que passa do limite e, se continuar, uma vez por dia; zera quando a fonte volta
    const ultimoAviso = f.alertaEnviadoEm ? new Date(f.alertaEnviadoEm).getTime() : 0
    if (problema && agora.getTime() - ultimoAviso >= 24 * 3_600_000) {
      avisar.push({ nome: f.nome, situacao: s, ultima: f.ultimaColetaOk, limite: limiteDaFonte(estadoDaFonte(f)), erro: f.erro })
      await payload.update({ collection: 'fontes', id: f.id, data: { alertaEnviadoEm: agora.toISOString() }, depth: 0 })
    } else if (!problema && f.alertaEnviadoEm) {
      await payload.update({ collection: 'fontes', id: f.id, data: { alertaEnviadoEm: null }, depth: 0 })
    }
  }
  if (avisar.length) await avisarEquipe(payload, avisar)
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

type AvisoFonte = { nome: string; situacao: string; ultima?: string | null; limite: number; erro?: string | null }

const dataBR = (d?: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : 'nunca'

/** E-mail à equipe (administradores e autores) com as fontes que passaram do limite. */
async function avisarEquipe(payload: Payload, fontes: AvisoFonte[]) {
  const equipe = await payload.find({ collection: 'users', where: { papel: { in: ['admin', 'autor'] } }, limit: 50, depth: 0 })
  if (!equipe.docs.length) return
  const assunto = fontes.length === 1 ? `Fonte com problema: ${fontes[0].nome}` : `${fontes.length} fontes com problema`
  const m = modelo({
    titulo: assunto,
    paragrafos: [
      'A coleta continua tentando a cada rodada; os dados anteriores seguem no site com a data da última coleta. Este aviso se repete uma vez por dia enquanto o problema continuar.',
    ],
    secoes: [
      {
        titulo: 'Fontes',
        itens: fontes.map((f) => ({
          texto: `${f.nome}: ${f.situacao === 'atrasada' ? `sem coleta desde ${dataBR(f.ultima)} (tolerância de ${f.limite} h)` : 'volume muito abaixo do normal (possível mudança no site)'}`,
          ...(f.erro ? { detalhe: f.erro.split('\n')[0].slice(0, 200) } : {}),
        })),
      },
    ],
    botao: { texto: 'Abrir as fontes no painel', url: `${SITE_URL}/admin/collections/fontes` },
  })
  for (const u of equipe.docs) await enfileirar(payload, { tipo: 'aviso_equipe', para: u.email, assunto, ...m })
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
  'alertas-diarios': alertasDiarios,
  'resumo-semanal': resumoSemanal,
}
