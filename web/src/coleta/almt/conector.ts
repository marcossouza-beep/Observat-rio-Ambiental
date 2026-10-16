/**
 * Conector da Assembleia Legislativa de Mato Grosso (fonte casa-mt). Em cada rodada:
 *   1. de cada tipo que interessa (PL, PLC, PEC, PDL), lê a pesquisa do ano em ordem crescente de número: a primeira
 *      página dá o total, e as últimas trazem as mais novas, até chegar a propostas protocoladas antes da última coleta;
 *   2. novas: entram as que passam na nota de relevância (até o teto por rodada), com os andamentos;
 *   3. acompanhadas (pelo número no estado, "MT:PL 1/2026"): acha o cartão pela pesquisa por número e lê os andamentos;
 *   4. vetos novos a projetos acompanhados viram andamento do projeto vetado.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import type { EventoColetado, PacoteProposicao } from '../tipos'
import {
  ALMT,
  chaveMT,
  eventoDoVeto,
  lerPesquisa,
  lerTramitacoes,
  pacoteAlmt,
  TIPOS_ALMT,
  urlPesquisa,
  type CartaoAlmt,
} from './mapear'

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

/** Tetos por rodada: páginas do fim da lista lidas por tipo e propostas acompanhadas procuradas. */
const MAX_PAGINAS_POR_TIPO = 4
const MAX_ACOMPANHADAS = 15

/** Propostas de Mato Grosso acompanhadas pela identificação no estado ("MT:PL 1/2026"). */
export function acompanhadasDeMatoGrosso(acompanhadas: Set<string>) {
  const r: { sigla: string; numero: number; ano: number }[] = []
  for (const a of acompanhadas) {
    const m = /^MT:([A-Z]+) (\d+)\/(\d{4})$/.exec(a)
    if (m && TIPOS_ALMT.some((t) => t.sigla === m[1]))
      r.push({ sigla: m[1], numero: Number(m[2]), ano: Number(m[3]) })
  }
  return r
}

export function criarConectorAlmt(opcoes: { obter?: ObterPagina } = {}): Conector {
  const obter = opcoes.obter || obterNaRede
  return {
    slug: 'casa-mt',
    nome: 'Assembleia Legislativa de Mato Grosso (pesquisa de proposições)',
    uf: 'MT',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      const ano = Number(dia(ctx.agora).slice(0, 4))
      // Em janeiro, as do ano anterior protocoladas no fim de dezembro ainda contam
      const anos = Number(dia(ctx.agora).slice(5, 7)) === 1 ? [ano - 1, ano] : [ano]
      const acompanhada = (c: { sigla: string; numero: number; ano: number; id?: number }) =>
        (c.id !== undefined && ctx.acompanhadas.has(chaveMT(c.id))) ||
        ctx.acompanhadas.has(`MT:${identificacaoDe(c.sigla, c.numero, c.ano)}`)

      // 1. Cartões recentes de cada tipo (o fim da lista crescente)
      const recentes: CartaoAlmt[] = []
      let paginasLidas = 0
      for (const t of TIPOS_ALMT) {
        for (const a of anos) {
          try {
            const primeira = lerPesquisa(await obter(urlPesquisa({ tipo: t.codigo, ano: a })))
            paginasLidas++
            let cartoes = primeira.paginas === 1 ? primeira.cartoes : []
            for (
              let p = primeira.paginas;
              p > 1 && p > primeira.paginas - MAX_PAGINAS_POR_TIPO;
              p--
            ) {
              const pg = lerPesquisa(
                await obter(urlPesquisa({ tipo: t.codigo, ano: a, pagina: p })),
              )
              paginasLidas++
              cartoes = [...pg.cartoes, ...cartoes]
              // Parou de vir proposta nova: as anteriores são mais antigas ainda
              if (pg.cartoes.length && pg.cartoes.every((c) => (c.data || '9999') < desde)) break
            }
            recentes.push(...cartoes.filter((c) => (c.data || '9999') >= desde))
          } catch (e) {
            avisos.push(`${t.sigla} ${a}: ${(e as Error).message}`.slice(0, 200))
          }
        }
      }

      // 2. Novas pela relevância; vetos viram andamento do projeto vetado
      const pacotes = new Map<string, PacoteProposicao>()
      const eventos: EventoColetado[] = []
      let novas = 0
      const andamentos = async (c: CartaoAlmt) => {
        try {
          return lerTramitacoes(await obter(`${ALMT}/proposicao/${c.id}/tramitacoes`))
        } catch (e) {
          avisos.push(
            `andamentos de ${c.sigla} ${c.numero}/${c.ano}: ${(e as Error).message}`.slice(0, 200),
          )
          return []
        }
      }
      for (const c of recentes) {
        if (c.sigla === 'VET') {
          const ev = eventoDoVeto(c)
          if (ev && ev.alvo.identificacoes?.some((i) => ctx.acompanhadas.has(`MT:${i}`)))
            eventos.push(ev)
          continue
        }
        const chave = chaveMT(c.id)
        if (pacotes.has(chave) || ctx.descartadas.has(chave)) continue
        if (!acompanhada(c)) {
          if (novas >= ctx.maxNovas || ctx.relevancia(c.ementa) < ctx.notaMinima) continue
          novas++
        }
        pacotes.set(chave, pacoteAlmt(c, await andamentos(c)))
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      // 3. Acompanhadas fora das recentes: pesquisa pelo número
      const alvos = acompanhadasDeMatoGrosso(ctx.acompanhadas).filter((a) => a.sigla !== 'VET')
      if (alvos.length > MAX_ACOMPANHADAS)
        avisos.push(
          `${alvos.length} propostas acompanhadas; atualizadas ${MAX_ACOMPANHADAS} nesta rodada`,
        )
      let achadas = 0
      for (const a of alvos.slice(0, MAX_ACOMPANHADAS)) {
        if (
          [...pacotes.values()].some(
            (p) =>
              p.proposicao.sigla === a.sigla &&
              p.proposicao.numero === a.numero &&
              p.proposicao.ano === a.ano,
          )
        )
          continue
        try {
          const tipo = TIPOS_ALMT.find((t) => t.sigla === a.sigla)!.codigo
          const c = lerPesquisa(
            await obter(urlPesquisa({ tipo, numero: a.numero, ano: a.ano })),
          ).cartoes.find((x) => x.numero === a.numero && x.ano === a.ano && x.sigla === a.sigla)
          if (!c) continue
          achadas++
          pacotes.set(chaveMT(c.id), pacoteAlmt(c, await andamentos(c)))
        } catch (e) {
          avisos.push(`${a.sigla} ${a.numero}/${a.ano}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      return {
        pacotes: [...pacotes.values()],
        pautas: [],
        eventos,
        itensListados: recentes.length,
        amostra: {
          recentes: recentes.length,
          paginasLidas,
          acompanhadasAchadas: `${achadas}/${Math.min(alvos.length, MAX_ACOMPANHADAS)}`,
          abertos: [...pacotes.keys()],
        },
        avisos,
      }
    },
  }
}

export const conectorAlmt = criarConectorAlmt()
