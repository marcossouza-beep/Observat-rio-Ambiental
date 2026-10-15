/**
 * Uma rodada de coleta de uma fonte: prepara o contexto, chama o conector, grava, registra a coleta
 * e atualiza a saúde da fonte (última coleta, volume, erro). Regras em docs/ENTREGA.md, seções 1 e 3.
 */
import type { Payload } from 'payload'
import { revalidarSite } from '../hooks/revalidar'
import { pontuar, type Termo } from '../lib/relevancia'
import type { Fonte } from '../payload-types'
import { conectorCamara } from './camara/conector'
import { conectorCongresso } from './congresso/conector'
import { conectorDou } from './dou/conector'
import { buscarNaRede, identificacaoDe, type Buscar, type Conector, type ContextoColeta } from './conector'
import { balancoVazio, gravarEventos, gravarPacote, gravarPautas, type Balanco } from './gravar'
import { conectorSenado } from './senado/conector'
import { preencherTextos, type Baixador } from './textos'
import { ErroFormato } from './tipos'

export const CONECTORES: Record<string, Conector> = { camara: conectorCamara, senado: conectorSenado, congresso: conectorCongresso, dou: conectorDou }

/** Prefixos das chaves de pauta de cada fonte (para tirar da agenda o que saiu de pauta). */
const PREFIXOS_PAUTA: Record<string, string[]> = { camara: ['camara:pauta:'], senado: ['senado:pauta:', 'senado:reuniao:'], congresso: ['congresso:pauta:'], dou: [] }

const FONTES_PADRAO: Record<string, Partial<Fonte>> = {
  camara: { nome: 'Câmara dos Deputados', nivel: 'A', esfera: 'federal' },
  senado: { nome: 'Senado Federal', nivel: 'A', esfera: 'federal' },
  congresso: { nome: 'Congresso Nacional (vetos)', nivel: 'A', esfera: 'federal' },
  dou: { nome: 'Diário Oficial da União (INLABS)', nivel: 'A', esfera: 'federal' },
}

export type ResultadoRodada = { fonte: string; ok: boolean; itens?: number; balanco?: Balanco; avisos?: string[]; erro?: string; ignorada?: string }

async function fonteDe(payload: Payload, slug: string): Promise<Fonte> {
  const r = await payload.find({ collection: 'fontes', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  if (r.docs[0]) return r.docs[0]
  return payload.create({ collection: 'fontes', data: { slug, conector: slug, nome: slug, ...FONTES_PADRAO[slug], frequencia: '6h, 12h, 18h, 23h' } as never })
}

/** O que o site já acompanha e o que foi descartado, por chave e, nas federais, por número ("PL 2159/2021"). */
async function propostasConhecidas(payload: Payload) {
  const acompanhadas = new Set<string>()
  const descartadas = new Set<string>()
  let pagina = 1
  for (;;) {
    const r = await payload.find({
      collection: 'proposicoes',
      limit: 500,
      page: pagina,
      depth: 0,
      select: { chaveOrigem: true, chavesExtras: true, sigla: true, numero: true, ano: true, situacaoEditorial: true, esfera: true },
    })
    for (const p of r.docs) {
      const alvo = p.situacaoEditorial === 'descartada' ? descartadas : acompanhadas
      // O número só identifica sozinho as federais ("PL 12/2026" existe em vários estados)
      const numero = p.esfera === 'federal' && p.sigla && p.numero && p.ano ? identificacaoDe(p.sigla, p.numero, p.ano) : null
      for (const c of [p.chaveOrigem, ...(p.chavesExtras || []), numero]) if (c) alvo.add(c)
    }
    if (!r.hasNextPage) break
    pagina++
  }
  return { acompanhadas, descartadas }
}

/** Dicionário nacional e, para uma fonte estadual, também as palavras-chave do estado. */
async function relevancia(payload: Payload, uf?: string) {
  const ou: Record<string, unknown>[] = [{ uf: { exists: false } }, { uf: { equals: '' } }]
  if (uf) ou.push({ uf: { equals: uf.toUpperCase() } })
  const dic = await payload.find({ collection: 'palavras-chave', where: { or: ou } as never, limit: 2000, depth: 0, pagination: false })
  const termos = dic.docs.map((d) => ({ termo: d.termo, peso: d.peso, exclusao: !!d.exclusao, grupo: d.grupo || undefined }) as Termo)
  return (texto: string) => pontuar(texto, termos).nota
}

/** Média de itens das coletas bem-sucedidas dos últimos 30 dias (base do alarme de volume baixo). */
async function mediaItens(payload: Payload, fonteId: number, agora: Date) {
  const r = await payload.find({
    collection: 'coletas',
    where: { fonte: { equals: fonteId }, ok: { equals: true }, inicio: { greater_than: new Date(agora.getTime() - 30 * 864e5).toISOString() } },
    limit: 200,
    depth: 0,
    select: { itens: true },
  })
  const v = r.docs.map((d) => d.itens).filter((n): n is number => typeof n === 'number')
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

export async function coletarFonte(payload: Payload, slug: string, opcoes: { agora?: Date; buscar?: Buscar; conector?: Conector } = {}): Promise<ResultadoRodada> {
  const conector = opcoes.conector || CONECTORES[slug]
  if (!conector) return { fonte: slug, ok: false, erro: 'conector desconhecido' }
  const agora = opcoes.agora || new Date()
  const fonte = await fonteDe(payload, slug)
  if (fonte.ativa === false) return { fonte: slug, ok: true, ignorada: 'fonte desativada nos Ajustes' }
  if (fonte.manual) return { fonte: slug, ok: true, ignorada: 'fonte de cadastro manual' }
  const falta = conector.naoConfigurado?.()
  if (falta) return { fonte: slug, ok: true, ignorada: falta }

  const ajustes = await payload.findGlobal({ slug: 'ajustes', depth: 0 })
  const desde = fonte.ultimaColetaOk ? new Date(fonte.ultimaColetaOk) : new Date(agora.getTime() - 7 * 864e5)
  const { acompanhadas, descartadas } = await propostasConhecidas(payload)
  const ctx: ContextoColeta = {
    desde,
    agora,
    acompanhadas,
    descartadas,
    relevancia: await relevancia(payload, conector.uf),
    notaMinima: ajustes.coleta?.notaMinima ?? 40,
    maxNovas: ajustes.coleta?.maxNovas ?? 40,
    buscar: opcoes.buscar || buscarNaRede(),
  }
  const coleta = await payload.create({ collection: 'coletas', data: { fonte: fonte.id, inicio: agora.toISOString(), ok: false } })
  const balanco = balancoVazio()
  const avisos: string[] = []
  try {
    const r = await conector.coletar(ctx)
    avisos.push(...r.avisos)
    const o = { payload, fonteId: fonte.id, agora, desde, balanco }
    for (const pacote of r.pacotes) {
      try {
        await gravarPacote(o, pacote)
      } catch (e) {
        if (e instanceof ErroFormato) throw e
        const det = (e as { data?: { collection?: string; errors?: { path?: string }[] } }).data
        avisos.push(`${pacote.proposicao.chave}: ${(e as Error).message}${det?.collection ? ` (${det.collection})` : ''}`.slice(0, 300))
      }
    }
    await gravarEventos(o, r.eventos || [])
    await gravarPautas(o, r.pautas, PREFIXOS_PAUTA[slug] || [])
    const fim = new Date()
    await payload.update({
      collection: 'coletas',
      id: coleta.id,
      data: { fim: fim.toISOString(), ok: true, itens: r.itensListados, amostra: { ...r.amostra, balanco, avisos } as never },
    })
    await payload.update({
      collection: 'fontes',
      id: fonte.id,
      data: { ultimaColeta: agora.toISOString(), ultimaColetaOk: agora.toISOString(), itensUltimaColeta: r.itensListados, mediaItens30d: await mediaItens(payload, fonte.id, agora), erro: avisos.length ? avisos.join('\n').slice(0, 2000) : null },
    })
    await revalidarSite()
    return { fonte: slug, ok: true, itens: r.itensListados, balanco, avisos }
  } catch (e) {
    const erro = (e as Error).message
    await payload.update({ collection: 'coletas', id: coleta.id, data: { fim: new Date().toISOString(), ok: false, erro, amostra: { balanco } as never } })
    await payload.update({ collection: 'fontes', id: fonte.id, data: { ultimaColeta: agora.toISOString(), erro } })
    // Formato mudou: a coleta desta fonte para; os dados anteriores ficam no ar com a data (docs/ENTREGA.md).
    await payload.create({
      collection: 'verificacoes',
      data: { tipo: 'fonte', resultado: e instanceof ErroFormato ? 'falha' : 'alerta', detalhe: `${conector.nome}: ${erro}`.slice(0, 500), dados: { fonte: slug, balanco } },
    })
    if (balanco.tramitacoes || balanco.novas) await revalidarSite()
    return { fonte: slug, ok: false, erro, balanco }
  }
}

export async function coletar(payload: Payload, fontes = Object.keys(CONECTORES), opcoes: { agora?: Date; buscar?: Buscar; baixarArquivo?: Baixador } = {}) {
  const resultados: ResultadoRodada[] = []
  // Uma fonte por vez: se uma cai, as outras continuam.
  for (const f of fontes) resultados.push(await coletarFonte(payload, f, opcoes))
  // Texto integral das versões novas (PDF → texto), algumas por rodada
  let textos: Awaited<ReturnType<typeof preencherTextos>> | { erro: string }
  try {
    textos = await preencherTextos(payload, { baixar: opcoes.baixarArquivo })
  } catch (e) {
    textos = { erro: (e as Error).message }
  }
  return { resultados, textos }
}
