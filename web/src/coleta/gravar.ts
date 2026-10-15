/**
 * Grava no banco o que os conectores trouxeram, sem duplicar nada (docs/APIS.md, seção 4):
 * cada item tem uma chave da fonte; coletar duas vezes não cria nada novo.
 *
 * Também:
 * - junta a mesma proposta nas duas casas (pelas chaves extras e pelo número, ex.: "PL 2159/2021");
 * - cria os alertas do Radar para o autor (pauta, urgência, substitutivo, votação, sanção, veto, texto novo);
 * - tira da agenda o que saiu de pauta.
 */
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import type { Proposicao } from '../payload-types'
import { EVENTOS_DO_RADAR } from './classificar'
import { identificacaoDe } from './conector'
import type { EventoColetado, ParlamentarColetado, PacoteProposicao, PautaColetada, ProposicaoColetada, TipoEvento, TramitacaoColetada, VersaoColetada } from './tipos'

/** Sem revalidar a cada item: a coleta revalida o site uma vez no fim. */
const SILENCIO = { semRevalidar: true }

export type Balanco = {
  novas: number
  atualizadas: number
  tramitacoes: number
  versoes: number
  votacoes: number
  votos: number
  pautas: number
  pautasRemovidas: number
  alertas: number
}
export const balancoVazio = (): Balanco => ({ novas: 0, atualizadas: 0, tramitacoes: 0, versoes: 0, votacoes: 0, votos: 0, pautas: 0, pautasRemovidas: 0, alertas: 0 })

type Opcoes = { payload: Payload; fonteId: number; agora: Date; desde: Date; balanco: Balanco }

const ROTULO_ALERTA: Partial<Record<TipoEvento, string>> = {
  pauta: 'Entrou na pauta',
  urgencia: 'Urgência aprovada',
  substitutivo: 'Substitutivo apresentado',
  votacao: 'Votação',
  aprovacao: 'Aprovação',
  sancao: 'Sanção',
  veto: 'Veto',
}

/**
 * Acha a proposição pela chave da fonte, por uma chave extra ou pelo número da proposta.
 * O número ("PL 12/2026") só junta propostas da mesma esfera e, nas estaduais, do mesmo estado.
 */
export async function acharProposicao(payload: Payload, chaves: string[], identificacoes: string[] = [], local: { esfera?: string; uf?: string } = {}): Promise<Proposicao | null> {
  const ou: Record<string, unknown>[] = [{ chaveOrigem: { in: chaves } }, { chavesExtras: { in: chaves } }]
  const esfera = local.esfera || 'federal'
  for (const id of identificacoes) {
    const m = /^([A-Z]+)\s+0*(\d+)\/(\d{4})$/.exec(id.trim())
    if (!m) continue
    const mesmo: Record<string, unknown>[] = [{ sigla: { equals: m[1] } }, { numero: { equals: Number(m[2]) } }, { ano: { equals: Number(m[3]) } }, { esfera: { equals: esfera } }]
    if (esfera !== 'federal') {
      if (!local.uf) continue
      mesmo.push({ uf: { equals: local.uf } })
    }
    ou.push({ and: mesmo })
  }
  const r = await payload.find({ collection: 'proposicoes', where: { or: ou } as never, limit: 1, depth: 0 })
  return (r.docs[0] as Proposicao) || null
}

async function criarAlerta(o: Opcoes, dados: { proposicao: number; tipo: string; titulo: string; data: string; chave: string; link?: string }) {
  const existe = await o.payload.count({ collection: 'alertas', where: { chave: { equals: dados.chave } } })
  if (existe.totalDocs) return
  await o.payload.create({ collection: 'alertas', data: { ...dados, titulo: dados.titulo.slice(0, 250), tipo: dados.tipo as never } })
  o.balanco.alertas++
}

/** Só o que aconteceu desde a última coleta vira alerta (o histórico de uma proposta nova não). */
const recente = (o: Opcoes, data: string) => new Date(data).getTime() >= o.desde.getTime() - 2 * 864e5

const parlamentaresCache = new Map<string, number>()

async function parlamentar(o: Opcoes, p: ParlamentarColetado): Promise<number> {
  const guardado = parlamentaresCache.get(p.chave)
  if (guardado) return guardado
  const r = await o.payload.find({ collection: 'parlamentares', where: { chaveOrigem: { equals: p.chave } }, limit: 1, depth: 0 })
  let id = r.docs[0]?.id
  const dados = { nome: p.nome, partido: p.partido, uf: p.uf, casa: p.casa, fotoUrl: p.fotoUrl, chaveOrigem: p.chave }
  if (!id) id = (await o.payload.create({ collection: 'parlamentares', data: dados })).id
  else if (r.docs[0].partido !== p.partido && p.partido) await o.payload.update({ collection: 'parlamentares', id, data: { partido: p.partido, uf: p.uf } })
  parlamentaresCache.set(p.chave, id)
  return id
}

async function autoria(o: Opcoes, p: ProposicaoColetada) {
  const linhas = []
  for (const a of p.autoria || []) {
    linhas.push({ papel: a.papel, orgao: a.orgao, data: a.data, nomeLivre: a.nomeLivre, parlamentar: a.parlamentar ? await parlamentar(o, a.parlamentar) : undefined })
  }
  return linhas
}

const novasChaves = (atual: Proposicao, p: ProposicaoColetada) =>
  [...new Set([...(atual.chavesExtras || []), ...(atual.chaveOrigem === p.chave ? [] : [p.chave]), ...(p.chavesExtras || [])])].filter((c) => c !== atual.chaveOrigem)

/** Cria ou atualiza a proposição. Devolve a proposição e se ela é nova. */
async function gravarProposicao(o: Opcoes, p: ProposicaoColetada): Promise<{ doc: Proposicao; nova: boolean }> {
  const identificacoes = [identificacaoDe(p.sigla, p.numero, p.ano), ...(p.outrasIdentificacoes || [])]
  const atual = await acharProposicao(o.payload, [p.chave, ...(p.chavesExtras || [])], identificacoes, { esfera: p.esfera, uf: p.uf })
  const ficha = {
    statusOficial: p.statusOficial,
    statusSimplificado: p.statusSimplificado,
    etapa: p.etapa,
    regime: p.regime,
    ultimaMovimentacao: p.ultimaMovimentacao,
    casa: p.casa,
    fonte: o.fonteId,
  }
  if (!atual) {
    const doc = (await o.payload.create({
      collection: 'proposicoes',
      context: SILENCIO,
      data: {
        sigla: p.sigla,
        numero: p.numero,
        ano: p.ano,
        esfera: p.esfera || 'federal',
        uf: p.esfera === 'estadual' ? p.uf : undefined,
        ementa: p.ementa,
        dataApresentacao: p.dataApresentacao,
        urlInteiroTeor: p.urlInteiroTeor,
        urlFonte: p.urlFonte,
        autoria: await autoria(o, p),
        temasOficiais: p.temasOficiais,
        chaveOrigem: p.chave,
        chavesExtras: p.chavesExtras,
        origem: 'api',
        situacaoEditorial: 'triagem',
        ...ficha,
      },
    })) as Proposicao
    o.balanco.novas++
    return { doc, nova: true }
  }

  const dados: Record<string, unknown> = { chavesExtras: novasChaves(atual, p), temasOficiais: [...new Set([...(atual.temasOficiais || []), ...(p.temasOficiais || [])])] }
  // A ficha (situação, etapa, regime) segue a casa onde a proposta andou por último.
  const maisNova = !atual.ultimaMovimentacao || (p.ultimaMovimentacao && p.ultimaMovimentacao >= atual.ultimaMovimentacao)
  if (maisNova) Object.assign(dados, ficha, { urlFonte: p.urlFonte || atual.urlFonte })
  if (!atual.ementa) dados.ementa = p.ementa
  if (!atual.urlInteiroTeor) dados.urlInteiroTeor = p.urlInteiroTeor
  if (!atual.dataApresentacao) dados.dataApresentacao = p.dataApresentacao
  if (!atual.autoria?.length) dados.autoria = await autoria(o, p)
  else {
    // Relator: troca o desta casa pelo atual
    const relator = p.autoria?.find((a) => a.papel === 'relator')
    if (relator?.parlamentar) {
      const id = await parlamentar(o, relator.parlamentar)
      const jaE = atual.autoria.some((a) => a.papel === 'relator' && (typeof a.parlamentar === 'object' ? a.parlamentar?.id : a.parlamentar) === id)
      if (!jaE) {
        const outros = atual.autoria.filter((a) => a.papel !== 'relator').map((a) => ({ ...a, parlamentar: typeof a.parlamentar === 'object' && a.parlamentar ? a.parlamentar.id : a.parlamentar }))
        dados.autoria = [...outros, { papel: 'relator', orgao: relator.orgao, data: relator.data, parlamentar: id }]
      }
    }
  }
  const doc = (await o.payload.update({ collection: 'proposicoes', id: atual.id, context: SILENCIO, data: dados as never })) as Proposicao
  o.balanco.atualizadas++
  if (maisNova && p.statusSimplificado && atual.statusSimplificado && p.statusSimplificado !== atual.statusSimplificado) {
    await criarAlerta(o, {
      proposicao: atual.id,
      tipo: 'situacao',
      titulo: `Mudou de situação: ${p.statusOficial || p.statusSimplificado}`,
      data: p.ultimaMovimentacao || o.agora.toISOString(),
      chave: `situacao:${atual.id}:${p.statusSimplificado}:${p.ultimaMovimentacao?.slice(0, 10)}`,
      link: p.urlFonte,
    })
  }
  return { doc, nova: false }
}

async function chavesExistentes(o: Opcoes, colecao: 'tramitacoes' | 'versoes' | 'votacoes', chaves: string[]) {
  const existentes = new Set<string>()
  for (let i = 0; i < chaves.length; i += 200) {
    const r = await o.payload.find({ collection: colecao, where: { chaveOrigem: { in: chaves.slice(i, i + 200) } }, limit: 200, depth: 0, select: { chaveOrigem: true } })
    for (const d of r.docs as { chaveOrigem?: string | null }[]) if (d.chaveOrigem) existentes.add(d.chaveOrigem)
  }
  return existentes
}

type SemProposicao<T> = Omit<T, 'proposicao'>

async function gravarTramitacoes(o: Opcoes, id: number, tramitacoes: SemProposicao<TramitacaoColetada>[], alertar: boolean) {
  const ja = await chavesExistentes(o, 'tramitacoes', tramitacoes.map((t) => t.chave))
  for (const t of tramitacoes) {
    if (ja.has(t.chave)) continue
    await o.payload.create({
      collection: 'tramitacoes',
      context: SILENCIO,
      data: { proposicao: id, data: t.data, orgao: t.orgao, descricao: t.descricao.slice(0, 4000), tipoEvento: t.tipoEvento, urlDocumento: t.urlDocumento, chaveOrigem: t.chave },
    })
    o.balanco.tramitacoes++
    if (alertar && EVENTOS_DO_RADAR.includes(t.tipoEvento) && recente(o, t.data)) {
      await criarAlerta(o, { proposicao: id, tipo: t.tipoEvento, titulo: `${ROTULO_ALERTA[t.tipoEvento]}: ${t.descricao}`, data: t.data, chave: `tram:${t.chave}`, link: t.urlDocumento })
    }
  }
}

async function gravarVersoes(o: Opcoes, id: number, versoes: SemProposicao<VersaoColetada>[], alertar: boolean) {
  const ja = await chavesExistentes(o, 'versoes', versoes.map((v) => v.chave))
  for (const v of versoes) {
    if (ja.has(v.chave)) continue
    // O gancho de Versões marca o parecer como desatualizado se o texto for posterior ao analisado.
    await o.payload.create({
      collection: 'versoes',
      context: SILENCIO,
      data: {
        proposicao: id,
        data: v.data,
        tipo: v.tipo,
        rotulo: v.rotulo,
        url: v.url,
        texto: v.texto?.slice(0, 400_000),
        hash: createHash('sha256').update(v.texto || v.url).digest('hex').slice(0, 32),
        chaveOrigem: v.chave,
      },
    })
    o.balanco.versoes++
    if (alertar && v.tipo !== 'original' && recente(o, v.data)) {
      await criarAlerta(o, { proposicao: id, tipo: 'nova_versao', titulo: `Texto novo: ${v.rotulo}`, data: v.data, chave: `versao:${v.chave}`, link: v.url })
    }
  }
}

/** Fatos avulsos (vetos, publicação no DOU) sobre propostas que o site já tem. */
export async function gravarEventos(o: Opcoes, eventos: EventoColetado[]) {
  for (const e of eventos) {
    const prop = await acharProposicao(o.payload, e.alvo.chaves, e.alvo.identificacoes)
    if (!prop || prop.situacaoEditorial === 'descartada') continue
    const extras = (e.chavesExtras || []).filter((c) => c !== prop.chaveOrigem && !(prop.chavesExtras || []).includes(c))
    if (extras.length) await o.payload.update({ collection: 'proposicoes', id: prop.id, context: SILENCIO, data: { chavesExtras: [...(prop.chavesExtras || []), ...extras] } })
    await gravarTramitacoes(o, prop.id, e.tramitacoes, true)
    if (e.versoes?.length) await gravarVersoes(o, prop.id, e.versoes, true)
  }
}

export async function gravarPacote(o: Opcoes, pacote: PacoteProposicao) {
  const { doc, nova } = await gravarProposicao(o, pacote.proposicao)
  if (doc.situacaoEditorial === 'descartada') return doc
  const id = doc.id
  const alertar = !nova

  await gravarTramitacoes(o, id, pacote.tramitacoes, alertar)
  await gravarVersoes(o, id, pacote.versoes, alertar)

  const jaVot = await chavesExistentes(o, 'votacoes', pacote.votacoes.map((v) => v.chave))
  for (const v of pacote.votacoes) {
    if (jaVot.has(v.chave)) continue
    const votacao = await o.payload.create({
      collection: 'votacoes',
      context: SILENCIO,
      data: {
        proposicao: id,
        data: v.data,
        orgao: v.orgao,
        descricao: v.descricao?.slice(0, 500),
        resultado: v.resultado,
        placarSim: v.placarSim,
        placarNao: v.placarNao,
        placarAbstencao: v.placarAbstencao,
        votosNominaisPublicados: !!v.votos?.length,
        orientacoes: v.orientacoes,
        chaveOrigem: v.chave,
      },
    })
    o.balanco.votacoes++
    for (const voto of v.votos || []) {
      await o.payload.create({ collection: 'votos', context: SILENCIO, data: { votacao: votacao.id, parlamentar: await parlamentar(o, voto.parlamentar), voto: voto.voto } })
      o.balanco.votos++
    }
    if (alertar && recente(o, v.data)) {
      const placar = v.placarSim != null ? ` (Sim ${v.placarSim} × Não ${v.placarNao ?? 0})` : ''
      await criarAlerta(o, { proposicao: id, tipo: 'votacao', titulo: `Votação ${v.orgao === 'PLEN' ? 'no Plenário' : v.orgao ? `na ${v.orgao}` : ''}: ${v.resultado || v.descricao || ''}${placar}`, data: v.data, chave: `votacao:${v.chave}` })
    }
  }
  return doc
}

/**
 * Pauta da semana: vira tramitação "pauta" com a data da reunião (alimenta "Em votação esta semana").
 * Só para propostas que o site já tem. O que saiu de pauta, sai da agenda.
 */
export async function gravarPautas(o: Opcoes, pautas: PautaColetada[], prefixos: string[]) {
  const vistas = new Set<string>()
  for (const pa of pautas) {
    const prop = await acharProposicao(o.payload, [pa.proposicao])
    if (!prop || prop.situacaoEditorial === 'descartada') continue
    vistas.add(pa.chave)
    const r = await o.payload.find({ collection: 'tramitacoes', where: { chaveOrigem: { equals: pa.chave } }, limit: 1, depth: 0 })
    if (r.docs[0]) {
      if (r.docs[0].data !== pa.data) await o.payload.update({ collection: 'tramitacoes', id: r.docs[0].id, context: SILENCIO, data: { data: pa.data } })
      continue
    }
    await o.payload.create({ collection: 'tramitacoes', context: SILENCIO, data: { proposicao: prop.id, data: pa.data, orgao: pa.orgao, descricao: pa.descricao, tipoEvento: 'pauta', chaveOrigem: pa.chave } })
    o.balanco.pautas++
    await criarAlerta(o, { proposicao: prop.id, tipo: 'pauta', titulo: pa.descricao, data: pa.data, chave: `pauta:${pa.chave}` })
  }
  // Itens futuros desta fonte que não vieram nesta coleta saíram de pauta.
  const futuras = await o.payload.find({
    collection: 'tramitacoes',
    where: { and: [{ tipoEvento: { equals: 'pauta' } }, { data: { greater_than: o.agora.toISOString() } }, { or: prefixos.map((p) => ({ chaveOrigem: { like: p } })) }] } as never,
    limit: 500,
    depth: 0,
  })
  for (const t of futuras.docs) {
    if (t.chaveOrigem && !vistas.has(t.chaveOrigem) && prefixos.some((p) => t.chaveOrigem!.startsWith(p))) {
      await o.payload.delete({ collection: 'tramitacoes', id: t.id, context: SILENCIO })
      o.balanco.pautasRemovidas++
    }
  }
}
