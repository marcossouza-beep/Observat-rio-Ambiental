/**
 * Conector da Câmara: lista o que tramitou desde a última coleta, abre a ficha completa
 * do que o site acompanha ou do que é relevante pelo dicionário, e lê a pauta da semana.
 */
import { dia, identificacaoDe, SIGLAS_ACOMPANHADAS, type Conector, type ContextoColeta, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import { lista } from '../util'
import {
  chaveCamara,
  eventoDeliberativo,
  mapearFichaCamara,
  mapearPautaCamara,
  mapearTramitacoesCamara,
  mapearVotacaoCamara,
  versaoOriginalCamara,
  votacaoNominal,
} from './mapear'

export const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2'
const TEMA_MEIO_AMBIENTE = 48

type Item = { id: number; siglaTipo: string; numero: number; ano: number; ementa?: string }
type Pagina = { dados?: unknown; links?: { rel: string; href: string }[] }

async function listar(ctx: ContextoColeta, url: string, maxPaginas = 30): Promise<Item[]> {
  const itens: Item[] = []
  let proxima: string | undefined = url
  for (let n = 0; proxima && n < maxPaginas; n++) {
    const pagina = (await ctx.buscar(proxima)) as Pagina
    itens.push(...lista<Item>(pagina?.dados))
    proxima = pagina?.links?.find((l) => l.rel === 'next')?.href
  }
  return itens
}

async function pacote(ctx: ContextoColeta, id: number, nova: boolean): Promise<PacoteProposicao> {
  const base = `${CAMARA}/proposicoes/${id}`
  const desde = dia(ctx.desde, -1)
  const [ficha, autores, temas, tram, votacoes] = await Promise.all([
    ctx.buscar(base),
    ctx.buscar(`${base}/autores`),
    ctx.buscar(`${base}/temas`),
    // Proposta nova: histórico inteiro. Já acompanhada: só o que mudou.
    ctx.buscar(nova ? `${base}/tramitacoes` : `${base}/tramitacoes?dataInicio=${desde}`),
    ctx.buscar(`${base}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro`),
  ])
  const proposicao = mapearFichaCamara((ficha as Pagina)?.dados, { autores: (autores as Pagina)?.dados, temas: (temas as Pagina)?.dados })
  const { tramitacoes, versoes } = mapearTramitacoesCamara(proposicao.chave, (tram as Pagina)?.dados)
  const original = versaoOriginalCamara(proposicao)
  if (original && !versoes.some((v) => v.chave === original.chave)) versoes.unshift(original)

  // Votações: as do período (ou as 5 últimas, se a proposta é nova). Votos individuais só nas nominais.
  const todas = lista<{ id: string; data?: string; descricao?: string }>((votacoes as Pagina)?.dados)
  const recentes = nova ? todas.slice(0, 5) : todas.filter((v) => (v.data || '') >= desde)
  const votacoesColetadas = []
  for (const v of recentes) {
    if (votacaoNominal(v)) {
      const [votos, orientacoes] = await Promise.all([ctx.buscar(`${CAMARA}/votacoes/${v.id}/votos`), ctx.buscar(`${CAMARA}/votacoes/${v.id}/orientacoes`)])
      votacoesColetadas.push(mapearVotacaoCamara(proposicao.chave, v, (votos as Pagina)?.dados, (orientacoes as Pagina)?.dados))
    } else votacoesColetadas.push(mapearVotacaoCamara(proposicao.chave, v))
  }
  return { proposicao, tramitacoes, versoes, votacoes: votacoesColetadas }
}

export const conectorCamara: Conector = {
  slug: 'camara',
  nome: 'Câmara dos Deputados',
  async coletar(ctx): Promise<ResultadoColeta> {
    const periodo = `dataInicio=${dia(ctx.desde, -1)}&dataFim=${dia(ctx.agora)}`
    const siglas = SIGLAS_ACOMPANHADAS.map((s) => `siglaTipo=${s}`).join('&')
    const [movimentadas, doTema] = await Promise.all([
      listar(ctx, `${CAMARA}/proposicoes?${siglas}&${periodo}&itens=100&ordem=DESC&ordenarPor=id`),
      listar(ctx, `${CAMARA}/proposicoes?${siglas}&codTema=${TEMA_MEIO_AMBIENTE}&${periodo}&itens=100&ordem=DESC&ordenarPor=id`, 5),
    ])
    const tema = new Set(doTema.map((p) => p.id))
    const unicas = [...new Map([...doTema, ...movimentadas].map((p) => [p.id, p])).values()]
    const avisos: string[] = []

    const acompanhadas: Item[] = []
    const candidatas: { item: Item; nota: number }[] = []
    for (const p of unicas) {
      const chave = chaveCamara(p.id)
      const ident = identificacaoDe(p.siglaTipo, p.numero, p.ano)
      if (ctx.descartadas.has(chave)) continue
      if (ctx.acompanhadas.has(chave) || ctx.acompanhadas.has(ident)) acompanhadas.push(p)
      else {
        const nota = ctx.relevancia(p.ementa || '') + (tema.has(p.id) ? 30 : 0)
        if (nota >= ctx.notaMinima) candidatas.push({ item: p, nota })
      }
    }
    candidatas.sort((a, b) => b.nota - a.nota)
    if (candidatas.length > ctx.maxNovas) avisos.push(`${candidatas.length - ctx.maxNovas} propostas novas ficaram para a próxima coleta`)

    const pacotes: PacoteProposicao[] = []
    for (const p of acompanhadas) pacotes.push(await pacote(ctx, p.id, !ctx.acompanhadas.has(chaveCamara(p.id))))
    for (const { item } of candidatas.slice(0, ctx.maxNovas)) pacotes.push(await pacote(ctx, item.id, true))

    // Pauta da semana: reuniões e sessões deliberativas de hoje a 7 dias.
    const eventos = lista<{ id: number; descricaoTipo?: string; situacao?: string }>(
      ((await ctx.buscar(`${CAMARA}/eventos?dataInicio=${dia(ctx.agora)}&dataFim=${dia(ctx.agora, 7)}&itens=100&ordem=ASC&ordenarPor=dataHoraInicio`)) as Pagina)?.dados,
    ).filter(eventoDeliberativo)
    const pautas = []
    for (const e of eventos) {
      const itens = (await ctx.buscar(`${CAMARA}/eventos/${e.id}/pauta`)) as Pagina
      pautas.push(...mapearPautaCamara(e, itens?.dados))
    }

    return {
      pacotes,
      pautas,
      itensListados: unicas.length,
      amostra: { listadas: unicas.length, doTema: doTema.length, abertas: pacotes.map((p) => p.proposicao.chave), eventos: eventos.length, exemplo: unicas[0] },
      avisos,
    }
  },
}
