/**
 * Consultas do site público. Sempre com overrideAccess: false, para que as regras de acesso
 * (só pareceres publicados, só proposições públicas) valham também aqui.
 */
import 'server-only'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Artigo, Bioma, Parecer, Proposicao, Tema } from '@/payload-types'

export const payloadSite = async () => getPayload({ config: await config })

const publico = { overrideAccess: false } as const

export type FiltrosLeis = { esfera?: string; situacao?: string; tema?: string; bioma?: string; uf?: string; q?: string; pagina?: number }

export async function listarLeis(f: FiltrosLeis = {}, limite = 20) {
  const payload = await payloadSite()
  const and: Where[] = []
  if (f.esfera) and.push({ esfera: { equals: f.esfera } })
  if (f.uf) and.push({ uf: { equals: f.uf.toUpperCase() } })
  if (f.situacao === 'em_tramitacao') and.push({ statusSimplificado: { equals: 'em_tramitacao' } })
  if (f.situacao === 'aprovada') and.push({ statusSimplificado: { in: ['aprovada', 'norma'] } })
  if (f.tema) and.push({ temas: { in: [f.tema] } })
  if (f.bioma) and.push({ biomas: { in: [f.bioma] } })
  if (f.q?.trim()) {
    const termo = f.q.trim()
    and.push({ or: [{ titulo: { like: termo } }, { ementa: { like: termo } }, { rotulo: { like: termo } }] })
  }
  return payload.find({
    collection: 'proposicoes',
    ...publico,
    where: and.length ? { and } : undefined,
    sort: '-ultimaMovimentacao',
    limit: limite,
    page: f.pagina || 1,
    depth: 1,
  })
}

export async function pareceresDe(ids: (number | string)[]) {
  if (!ids.length) return new Map<number | string, Parecer>()
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'pareceres', ...publico, where: { proposicao: { in: ids } }, limit: ids.length, depth: 0 })
  return new Map(r.docs.map((p) => [typeof p.proposicao === 'object' ? p.proposicao.id : p.proposicao, p]))
}

export async function leiPorSlug(slug: string) {
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'proposicoes', ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 2 })
  const lei = r.docs[0]
  if (!lei) return null
  const [parecer, tramitacoes, votacoes, emendas, versoes, fonte] = await Promise.all([
    payload.find({ collection: 'pareceres', ...publico, where: { proposicao: { equals: lei.id } }, limit: 1, depth: 2 }).then((x) => x.docs[0] || null),
    payload.find({ collection: 'tramitacoes', ...publico, where: { proposicao: { equals: lei.id } }, sort: '-data', limit: 30, depth: 0 }),
    payload.find({ collection: 'votacoes', ...publico, where: { proposicao: { equals: lei.id } }, sort: '-data', limit: 10, depth: 0 }),
    payload.count({ collection: 'emendas', ...publico, where: { proposicao: { equals: lei.id } } }),
    payload.find({ collection: 'versoes', ...publico, where: { proposicao: { equals: lei.id } }, sort: '-data', limit: 10, depth: 0, select: { texto: false } }),
    lei.fonte && typeof lei.fonte === 'object' ? Promise.resolve(lei.fonte) : Promise.resolve(null),
  ])
  return { lei, parecer, tramitacoes: tramitacoes.docs, votacoes: votacoes.docs, emendas: emendas.totalDocs, versoes: versoes.docs, fonte }
}

export async function parecerPorSlug(slug: string) {
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'pareceres', ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 2 })
  const parecer = r.docs[0]
  if (!parecer) return null
  const correcoes = await payload.find({ collection: 'correcoes', ...publico, where: { parecer: { equals: parecer.id } }, sort: '-feitaEm', depth: 0 })
  return { parecer, lei: parecer.proposicao as Proposicao, correcoes: correcoes.docs }
}

export async function listarPareceres(limite = 30, where?: Where) {
  const payload = await payloadSite()
  return payload.find({ collection: 'pareceres', ...publico, where, sort: '-publicadoEm', limit: limite, depth: 1 })
}

export async function emVotacao(dias = 7) {
  const payload = await payloadSite()
  const agora = new Date()
  const ate = new Date(agora.getTime() + dias * 864e5)
  const r = await payload.find({
    collection: 'tramitacoes',
    ...publico,
    where: { tipoEvento: { equals: 'pauta' }, data: { greater_than_equal: agora.toISOString(), less_than_equal: ate.toISOString() } },
    sort: 'data',
    limit: 10,
    depth: 1,
  })
  // Só propostas públicas (a tramitação de uma proposta na triagem não aparece)
  return r.docs.filter((t) => typeof t.proposicao === 'object' && ['ativa', 'monitorada'].includes(t.proposicao.situacaoEditorial))
}

export async function contagens() {
  const payload = await payloadSite()
  const [federais, estaduais, pareceres, artigos, ufs] = await Promise.all([
    payload.count({ collection: 'proposicoes', ...publico, where: { esfera: { equals: 'federal' } } }),
    payload.count({ collection: 'proposicoes', ...publico, where: { esfera: { equals: 'estadual' } } }),
    payload.count({ collection: 'pareceres', ...publico }),
    payload.count({ collection: 'artigos', ...publico }),
    payload.find({ collection: 'proposicoes', ...publico, where: { esfera: { equals: 'estadual' } }, limit: 500, depth: 0, select: { uf: true } }),
  ])
  return {
    federais: federais.totalDocs,
    estaduais: estaduais.totalDocs,
    estados: new Set(ufs.docs.map((d) => d.uf).filter(Boolean)).size,
    pareceres: pareceres.totalDocs,
    artigos: artigos.totalDocs,
  }
}

export async function temaOuBioma(tipo: 'temas' | 'biomas', slug: string) {
  const payload = await payloadSite()
  const r = await payload.find({ collection: tipo, ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return (r.docs[0] as Tema | Bioma | undefined) || null
}

export async function listarTemasEBiomas() {
  const payload = await payloadSite()
  const [temas, biomas] = await Promise.all([
    payload.find({ collection: 'temas', ...publico, sort: 'nome', limit: 100, depth: 0 }),
    payload.find({ collection: 'biomas', ...publico, sort: 'nome', limit: 100, depth: 0 }),
  ])
  return { temas: temas.docs, biomas: biomas.docs }
}

export async function listarArtigos(limite = 30) {
  const payload = await payloadSite()
  return payload.find({ collection: 'artigos', ...publico, sort: '-publicadoEm', limit: limite, depth: 1 })
}

export async function artigoPorSlug(slug: string): Promise<Artigo | null> {
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'artigos', ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 2 })
  return r.docs[0] || null
}

/** Para o sitemap: só o que é público e indexável. */
export async function enderecosParaSitemap() {
  const payload = await payloadSite()
  const [leis, pareceres, temas, biomas, artigos, autores, parlamentares] = await Promise.all([
    payload.find({ collection: 'proposicoes', ...publico, limit: 5000, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'pareceres', ...publico, where: { 'seo.indexar': { not_equals: false } }, limit: 5000, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'temas', ...publico, where: { textoAbertura: { exists: true } }, limit: 200, depth: 0, select: { slug: true, updatedAt: true, textoAbertura: true } }),
    payload.find({ collection: 'biomas', ...publico, where: { textoAbertura: { exists: true } }, limit: 200, depth: 0, select: { slug: true, updatedAt: true, textoAbertura: true } }),
    payload.find({ collection: 'artigos', ...publico, limit: 2000, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'autores', ...publico, limit: 100, depth: 0, select: { slug: true, updatedAt: true } }),
    listarParlamentares(),
  ])
  return { leis: leis.docs, pareceres: pareceres.docs, temas: temas.docs.filter((t) => t.textoAbertura), biomas: biomas.docs.filter((b) => b.textoAbertura), artigos: artigos.docs, autores: autores.docs, parlamentares: parlamentares.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })) }
}

export async function autorPorSlug(slug: string) {
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'autores', ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  const autor = r.docs[0]
  if (!autor) return null
  const pareceres = await payload.find({ collection: 'pareceres', ...publico, where: { autor: { equals: autor.id } }, sort: '-publicadoEm', limit: 50, depth: 1 })
  return { autor, pareceres: pareceres.docs }
}

const idDe = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))

/** Página do parlamentar: votos em propostas públicas (com o caráter do parecer), autorias, relatorias e emendas. */
export async function parlamentarPorSlug(slug: string) {
  const payload = await payloadSite()
  const r = await payload.find({ collection: 'parlamentares', ...publico, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  const parlamentar = r.docs[0]
  if (!parlamentar) return null
  const [votos, autoriasR, emendasR] = await Promise.all([
    payload.find({ collection: 'votos', ...publico, where: { parlamentar: { equals: parlamentar.id } }, limit: 3000, depth: 0, pagination: false }),
    payload.find({ collection: 'proposicoes', ...publico, where: { 'autoria.parlamentar': { equals: parlamentar.id } }, limit: 500, depth: 0, sort: '-ultimaMovimentacao' }),
    payload.find({ collection: 'emendas', ...publico, where: { parlamentar: { equals: parlamentar.id } }, limit: 500, depth: 0 }),
  ])
  const votacoes = votos.docs.length
    ? await payload.find({ collection: 'votacoes', ...publico, where: { id: { in: votos.docs.map((v) => idDe(v.votacao)) } }, limit: 3000, depth: 0, pagination: false })
    : { docs: [] }
  const propIds = [...new Set([...votacoes.docs.map((v) => idDe(v.proposicao)), ...emendasR.docs.map((e) => idDe(e.proposicao))])]
  // Só propostas públicas (a regra de acesso já filtra as da triagem)
  const props = propIds.length ? await payload.find({ collection: 'proposicoes', ...publico, where: { id: { in: propIds } }, limit: propIds.length, depth: 0 }) : { docs: [] }
  const leis = new Map<number, Proposicao>([...props.docs, ...autoriasR.docs].map((p) => [p.id, p]))
  const todas = [...leis.keys()]
  const pareceres = todas.length ? await payload.find({ collection: 'pareceres', ...publico, where: { proposicao: { in: todas } }, limit: todas.length, depth: 0 }) : { docs: [] }
  const parecerDe = new Map(pareceres.docs.map((p) => [idDe(p.proposicao), p]))
  const votacaoDe = new Map(votacoes.docs.map((v) => [v.id, v]))

  const listaVotos = votos.docs
    .map((v) => {
      const vot = votacaoDe.get(idDe(v.votacao))
      const lei = vot ? leis.get(idDe(vot.proposicao)) : undefined
      if (!vot || !lei) return null
      const par = parecerDe.get(lei.id)
      return { id: v.id, voto: v.voto, data: vot.data, orgao: vot.orgao, descricao: vot.descricao, resultado: vot.resultado, lei, carater: (par?.carater as Parecer['carater']) || null, parecerSlug: par?.slug }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.data.localeCompare(a.data))

  const papelDe = (p: Proposicao) => (p.autoria || []).filter((a) => idDe(a.parlamentar) === parlamentar.id).map((a) => a.papel || 'autor')
  const autorias = autoriasR.docs.filter((p) => papelDe(p).some((x) => x !== 'relator'))
  const relatorias = autoriasR.docs.filter((p) => papelDe(p).includes('relator'))
  const emendas = emendasR.docs.filter((e) => leis.has(idDe(e.proposicao))).map((e) => ({ ...e, lei: leis.get(idDe(e.proposicao))! }))
  const caraterDe = (id: number) => (parecerDe.get(id)?.carater as Parecer['carater']) || null
  return { parlamentar, votos: listaVotos, autorias, relatorias, emendas, caraterDe: Object.fromEntries(todas.map((id) => [id, caraterDe(id)])) as Record<number, Parecer['carater'] | null> }
}

/** Parlamentares com atuação em propostas públicas (autoria, relatoria ou voto). */
export async function listarParlamentares(f: { casa?: string; uf?: string } = {}) {
  const payload = await payloadSite()
  const props = await payload.find({ collection: 'proposicoes', ...publico, limit: 5000, depth: 0, pagination: false, select: { autoria: true } })
  const atuacao = new Map<number, { votos: number; autorias: number }>()
  const soma = (id: number, k: 'votos' | 'autorias') => atuacao.set(id, { votos: 0, autorias: 0, ...atuacao.get(id), [k]: (atuacao.get(id)?.[k] || 0) + 1 })
  for (const p of props.docs) for (const a of p.autoria || []) if (a.parlamentar) soma(idDe(a.parlamentar), 'autorias')
  const ids = props.docs.map((p) => p.id)
  if (ids.length) {
    const votacoes = await payload.find({ collection: 'votacoes', ...publico, where: { proposicao: { in: ids } }, limit: 5000, depth: 0, pagination: false, select: { data: true } })
    if (votacoes.docs.length) {
      const votos = await payload.find({ collection: 'votos', ...publico, where: { votacao: { in: votacoes.docs.map((v) => v.id) } }, limit: 200000, depth: 0, pagination: false, select: { parlamentar: true } })
      for (const v of votos.docs) soma(idDe(v.parlamentar), 'votos')
    }
  }
  if (!atuacao.size) return []
  const where: Where = { id: { in: [...atuacao.keys()] } }
  if (f.casa) where.casa = { equals: f.casa }
  if (f.uf) where.uf = { equals: f.uf.toUpperCase() }
  const r = await payload.find({ collection: 'parlamentares', ...publico, where, limit: 2000, depth: 0, sort: 'nome', pagination: false })
  return r.docs.map((p) => ({ ...p, ...atuacao.get(p.id)! }))
}
