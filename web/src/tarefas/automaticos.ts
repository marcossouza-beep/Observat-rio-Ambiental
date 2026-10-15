/**
 * E-mails automáticos: alerta diário (19h) e resumo semanal (sexta, 17h).
 * Buscam os dados, montam o conteúdo (lib/resumo) e põem na fila; a tarefa de 15 minutos envia.
 * Só entram propostas públicas (parecer prometido ou acompanhando) e só quem aceitou cada tipo de e-mail.
 */
import type { Payload } from 'payload'
import { enfileirar, linkDescadastro, modelo } from '../lib/email'
import type { Carater } from '../lib/indicadores'
import { textoDe } from '../lib/publicacao'
import { EVENTOS_PUBLICOS, montarAlerta, montarResumo, type EventoResumo, type LeiResumo, type TipoEventoPublico } from '../lib/resumo'
import type { Proposicao } from '../payload-types'

const PUBLICAS = ['ativa', 'monitorada']
const id = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))
const ids = (v: unknown) => (Array.isArray(v) ? v.map(id).filter((x) => typeof x === 'number') : [])

function leiResumo(p: Proposicao): LeiResumo {
  return { id: p.id, rotulo: p.rotulo || `${p.sigla} ${p.numero}/${p.ano}`, titulo: p.titulo, slug: p.slug || String(p.id), temas: ids(p.temas), biomas: ids(p.biomas), uf: p.uf }
}

async function leisPublicas(payload: Payload, propIds: number[]) {
  if (!propIds.length) return new Map<number, LeiResumo>()
  const r = await payload.find({ collection: 'proposicoes', where: { id: { in: propIds }, situacaoEditorial: { in: PUBLICAS } }, limit: propIds.length, depth: 0 })
  return new Map(r.docs.map((p) => [p.id, leiResumo(p)]))
}

async function eventos(payload: Payload, where: Record<string, unknown>) {
  const r = await payload.find({ collection: 'tramitacoes', where: where as never, limit: 3000, depth: 0, sort: '-data' })
  return r.docs.map(
    (t): EventoResumo => ({ leiId: id(t.proposicao), tipo: t.tipoEvento as TipoEventoPublico, descricao: t.descricao, data: t.data, orgao: t.orgao }),
  )
}

/** Inscritos que aceitam um tipo de e-mail (paginado). */
async function inscritos(payload: Payload, campo: 'alertas' | 'resumoSemanal', extra: Record<string, unknown>[] = []) {
  const todos = []
  for (let pagina = 1; ; pagina++) {
    const r = await payload.find({
      collection: 'assinantes',
      where: { and: [{ [campo]: { equals: true } }, { aceitaEmails: { equals: true } }, { confirmadoEm: { exists: true } }, ...extra] } as never,
      limit: 500,
      page: pagina,
      depth: 0,
    })
    todos.push(...r.docs)
    if (!r.hasNextPage) break
  }
  return todos
}

/** Alerta diário: o que andou desde o último envio nas leis que cada pessoa segue (no máximo 1 e-mail por dia). */
export async function alertasDiarios(payload: Payload, agora = new Date()) {
  const g = await payload.findGlobal({ slug: 'emails-automaticos', depth: 0 })
  const desde = g.alertas?.ultimoEnvio ? new Date(g.alertas.ultimoEnvio) : new Date(agora.getTime() - 864e5)
  if (agora.getTime() - desde.getTime() < 12 * 36e5) return { ignorado: 'já enviado nas últimas 12 horas' }
  // Andamentos gravados desde o último envio (pela data de gravação: a coleta pode trazer fatos de dias antes)
  const novos = (await eventos(payload, { createdAt: { greater_than: desde.toISOString() }, tipoEvento: { in: EVENTOS_PUBLICOS } }))
    // Pauta só interessa se a reunião ainda vai acontecer
    .filter((e) => e.tipo !== 'pauta' || e.data >= agora.toISOString())
  const leis = await leisPublicas(payload, [...new Set(novos.map((e) => e.leiId))])
  let pessoas = 0
  if (leis.size) {
    for (const a of await inscritos(payload, 'alertas', [{ seguindo: { in: [...leis.keys()] } }])) {
      const porLei = ids(a.seguindo)
        .filter((l) => leis.has(l))
        .map((l) => ({ lei: leis.get(l)!, eventos: novos.filter((e) => e.leiId === l) }))
      const c = montarAlerta(a, porLei)
      if (!c) continue
      const m = modelo({ ...c, descadastro: linkDescadastro(a.id), motivo: 'Você recebe este alerta porque segue estas leis e pediu o alerta diário.' })
      await enfileirar(payload, { tipo: 'alerta', para: a.email, assunto: c.assunto, ...m, assinante: a.id })
      pessoas++
    }
  }
  await payload.updateGlobal({ slug: 'emails-automaticos', data: { alertas: { ultimoEnvio: agora.toISOString(), ultimoTotal: pessoas } } })
  return { andamentos: novos.length, leis: leis.size, pessoas }
}

/** Resumo semanal: sai sozinho na sexta; a nota do autor entra no topo e some depois. */
export async function resumoSemanal(payload: Payload, agora = new Date()) {
  const g = await payload.findGlobal({ slug: 'emails-automaticos', depth: 0 })
  const r = g.resumo || {}
  if (r.ultimoEnvio && agora.getTime() - new Date(r.ultimoEnvio).getTime() < 3 * 864e5) return { ignorado: 'resumo já enviado nesta semana' }
  if (r.pular) {
    await payload.updateGlobal({ slug: 'emails-automaticos', data: { resumo: { ...r, pular: false } } })
    return { ignorado: 'o autor pediu para não enviar esta semana' }
  }
  const inicio = new Date(agora.getTime() - 7 * 864e5).toISOString()
  const fim = agora.toISOString()
  const daqui7 = new Date(agora.getTime() + 7 * 864e5).toISOString()

  const [pareceres, andou, pauta, biomas] = await Promise.all([
    payload.find({ collection: 'pareceres', where: { status: { equals: 'publicado' }, publicadoEm: { greater_than: inicio } }, limit: 50, depth: 0, sort: '-publicadoEm' }),
    eventos(payload, { data: { greater_than: inicio, less_than_equal: fim }, tipoEvento: { in: EVENTOS_PUBLICOS.filter((t) => t !== 'pauta') } }),
    eventos(payload, { data: { greater_than_equal: fim, less_than_equal: daqui7 }, tipoEvento: { equals: 'pauta' } }),
    payload.find({ collection: 'biomas', limit: 50, depth: 0 }),
  ])
  const leis = await leisPublicas(payload, [...new Set([...andou, ...pauta].map((e) => e.leiId).concat(pareceres.docs.map((p) => id(p.proposicao))))])

  // Caráter dos pareceres publicados das leis citadas (sentido do voto)
  const comParecer = await payload.find({ collection: 'pareceres', where: { status: { equals: 'publicado' }, proposicao: { in: [...leis.keys()] } }, limit: 1000, depth: 0 })
  const carater = new Map(comParecer.docs.filter((p) => p.carater).map((p) => [id(p.proposicao), p.carater as Carater]))

  const pessoas = await inscritos(payload, 'resumoSemanal')
  // Votos da semana dos parlamentares seguidos por alguém
  const seguidos = [...new Set(pessoas.flatMap((a) => ids(a.seguirParlamentares)))]
  const votos = []
  if (seguidos.length) {
    const votacoes = await payload.find({ collection: 'votacoes', where: { data: { greater_than: inicio } }, limit: 500, depth: 0 })
    const leisVot = await leisPublicas(payload, [...new Set(votacoes.docs.map((v) => id(v.proposicao)))])
    for (const [k, v] of leisVot) leis.set(k, v)
    const porVotacao = new Map(votacoes.docs.map((v) => [v.id, v]))
    if (porVotacao.size) {
      const vs = await payload.find({ collection: 'votos', where: { votacao: { in: [...porVotacao.keys()] }, parlamentar: { in: seguidos } }, limit: 5000, depth: 1 })
      for (const v of vs.docs) {
        const vot = porVotacao.get(id(v.votacao))!
        const p = v.parlamentar as { id: number; nome: string; partido?: string | null; uf?: string | null }
        if (leis.has(id(vot.proposicao))) votos.push({ parlamentarId: p.id, nome: p.nome, partido: p.partido, uf: p.uf, voto: v.voto, leiId: id(vot.proposicao), data: vot.data })
      }
    }
  }

  const dados = {
    inicio,
    fim,
    nota: r.nota,
    leis,
    pareceres: pareceres.docs
      .filter((p) => leis.has(id(p.proposicao)))
      .map((p) => ({ leiId: id(p.proposicao), titulo: p.titulo || leis.get(id(p.proposicao))!.rotulo, slug: p.slug || '', carater: p.carater as Carater | null, resumo: textoDe(p.secoes?.resumo) })),
    eventos: andou.filter((e) => leis.has(e.leiId)),
    pauta: pauta.filter((e) => leis.has(e.leiId)),
    votos,
    carater,
    ufsDoBioma: new Map(biomas.docs.map((b) => [b.id, (b.ufs || []).map((u) => u.toUpperCase())])),
  }

  let enviados = 0
  for (const a of pessoas) {
    const c = montarResumo({ nome: a.nome, uf: a.uf, temas: ids(a.temas), biomas: ids(a.biomas), seguindo: ids(a.seguindo), seguirParlamentares: ids(a.seguirParlamentares) }, dados)
    if (!c) continue
    const m = modelo({ ...c, descadastro: linkDescadastro(a.id), motivo: 'Você recebe o resumo semanal porque pediu na sua inscrição.' })
    await enfileirar(payload, { tipo: 'resumo', para: a.email, assunto: c.assunto, ...m, assinante: a.id })
    enviados++
  }
  await payload.updateGlobal({ slug: 'emails-automaticos', data: { resumo: { nota: '', pular: false, ultimoEnvio: agora.toISOString(), ultimoTotal: enviados } } })
  return { pareceres: dados.pareceres.length, andou: dados.eventos.length, pauta: dados.pauta.length, votos: votos.length, pessoas: enviados }
}
