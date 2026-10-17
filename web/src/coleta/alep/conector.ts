/**
 * Conector da Assembleia Legislativa do Paraná (fonte casa-pr), pela ordem do dia do Plenário. Em cada rodada:
 *   1. lê na página inicial as ordens do dia listadas (próximas e últimas sessões) e baixa cada PDF;
 *   2. propostas acompanhadas (pela chave ou pelo número no estado, "PR:PL 630/2025") ganham o andamento "pauta"
 *      na data da sessão;
 *   3. as demais entram como novas se passam na nota de relevância (ementa), até o teto por rodada.
 * A pesquisa legislativa da Alep passa por captcha, que não é contornado: a apresentação e os andamentos de comissão
 * só chegam quando a Alep der acesso.
 */
import { identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import { baixarArquivo, extrairTextoPdf, type Baixador } from '../textos'
import type { EventoColetado, PacoteProposicao } from '../tipos'
import { ALEP, chavePR, eventoDoItem, lerOrdemAlep, ordensDaInicial, pacoteDoItem } from './mapear'

export type ObterPagina = (url: string) => Promise<string>
const NAVEGADOR =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const obterNaRede: ObterPagina = async (url) => {
  const r = await fetch(url, {
    headers: { 'User-Agent': NAVEGADOR, 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`)
  return r.text()
}

/** Teto de PDFs lidos por rodada (a página inicial costuma listar 5 sessões). */
const MAX_ORDENS = 8

export function criarConectorAlep(
  opcoes: { obter?: ObterPagina; baixar?: Baixador } = {},
): Conector {
  const obter = opcoes.obter || obterNaRede
  const baixar = opcoes.baixar || baixarArquivo()
  return {
    slug: 'casa-pr',
    nome: 'Assembleia Legislativa do Paraná (ordem do dia)',
    uf: 'PR',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const ordens = ordensDaInicial(await obter(`${ALEP}/`))
      if (ordens.length > MAX_ORDENS)
        avisos.push(`${ordens.length} ordens do dia listadas; lidas as ${MAX_ORDENS} primeiras`)

      const pacotes = new Map<string, PacoteProposicao>()
      const eventos: EventoColetado[] = []
      const sessoes: string[] = []
      let itens = 0
      let novas = 0
      for (const o of ordens.slice(0, MAX_ORDENS)) {
        let ordem
        try {
          ordem = lerOrdemAlep((await extrairTextoPdf(new Uint8Array(await baixar(o.url)))).texto)
        } catch (e) {
          avisos.push(`${o.titulo}: ${(e as Error).message}`.slice(0, 200))
          continue
        }
        sessoes.push(`${ordem.sessao} (${ordem.data})`)
        for (const i of ordem.itens) {
          itens++
          const chave = chavePR(i)
          if (ctx.descartadas.has(chave)) continue
          const acompanhada =
            ctx.acompanhadas.has(chave) ||
            ctx.acompanhadas.has(`PR:${identificacaoDe(i.sigla, i.numero, i.ano)}`)
          const ja = pacotes.get(chave)
          if (acompanhada) {
            eventos.push(eventoDoItem(ordem, i, o.url))
            continue
          }
          if (ja) {
            // A mesma proposta em duas sessões listadas: guarda os dois andamentos
            const t = pacoteDoItem(ordem, i, o.url).tramitacoes[0]
            if (!ja.tramitacoes.some((x) => x.chave === t.chave)) ja.tramitacoes.push(t)
            continue
          }
          if (novas >= ctx.maxNovas || ctx.relevancia(i.ementa) < ctx.notaMinima) continue
          novas++
          pacotes.set(chave, pacoteDoItem(ordem, i, o.url))
        }
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )
      if (ordens.length && sessoes.length && !itens)
        avisos.push(
          'nenhum projeto nas ordens do dia lidas (sessões só com audiência ou formato mudou)',
        )

      return {
        pacotes: [...pacotes.values()],
        pautas: [],
        eventos,
        itensListados: itens,
        amostra: {
          sessoes,
          itens,
          acompanhadasNaPauta: eventos.length,
          abertos: [...pacotes.keys()],
        },
        avisos,
      }
    },
  }
}

export const conectorAlep = criarConectorAlep()
