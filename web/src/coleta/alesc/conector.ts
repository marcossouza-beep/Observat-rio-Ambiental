/**
 * Conector da Assembleia Legislativa de Santa Catarina (fonte casa-sc), pelo e-Legis. Em cada rodada:
 *   1. lê a lista do processo legislativo, das mais novas para as mais antigas, até chegar a propostas com entrada
 *      antes da última coleta (PL, PLC, PEC e PDL; o resto da lista fica de fora);
 *   2. novas: entram as que passam na nota de relevância (ementa), até o teto por rodada, com a ficha de tramitações;
 *   3. acompanhadas (pela chave ou pelo número no estado, "SC:PL 640/2026"): lista filtrada pelo número e a ficha.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import {
  chaveSC,
  ELEGIS,
  lerFichaAlesc,
  lerListaAlesc,
  pacoteAlesc,
  TIPOS_ALESC,
  urlListaAlesc,
  type CartaoAlesc,
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

/** Tetos por rodada: páginas da lista (10 cartões cada) e propostas acompanhadas procuradas. */
const MAX_PAGINAS = 10
const MAX_ACOMPANHADAS = 20

/** Propostas de Santa Catarina acompanhadas pela identificação no estado ("SC:PL 640/2026"). */
export function acompanhadasDeSantaCatarina(acompanhadas: Set<string>) {
  const siglas = Object.values(TIPOS_ALESC).map((t) => t.sigla)
  const r: { sigla: string; numero: number; ano: number }[] = []
  for (const a of acompanhadas) {
    const m = /^SC:([A-Z]+) (\d+)\/(\d{4})$/.exec(a)
    if (m && siglas.includes(m[1])) r.push({ sigla: m[1], numero: Number(m[2]), ano: Number(m[3]) })
  }
  return r
}

export function criarConectorAlesc(opcoes: { obter?: ObterPagina } = {}): Conector {
  const obter = opcoes.obter || obterNaRede
  return {
    slug: 'casa-sc',
    nome: 'Assembleia Legislativa de Santa Catarina (e-Legis)',
    uf: 'SC',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      let paginasLidas = 0

      // 1. Recentes (a lista vem da mais nova para a mais antiga; entradas sem data contam como recentes)
      const recentes: CartaoAlesc[] = []
      try {
        for (let p = 1; p <= MAX_PAGINAS; p++) {
          const { cartoes, brutos } = lerListaAlesc(await obter(urlListaAlesc({ pagina: p })))
          paginasLidas++
          recentes.push(...cartoes.filter((c) => (c.entrada || '9999') >= desde))
          if (!brutos || cartoes.some((c) => (c.entrada || '9999') < desde)) break
          if (p === MAX_PAGINAS)
            avisos.push(`mais de ${MAX_PAGINAS * 10} proposições no período; lidas as mais novas`)
        }
      } catch (e) {
        avisos.push(`lista: ${(e as Error).message}`.slice(0, 200))
      }

      const completo = async (c: CartaoAlesc) => {
        try {
          paginasLidas++
          return pacoteAlesc(
            c,
            lerFichaAlesc(await obter(`${ELEGIS}/proposicoes/${c.id}/tramitacoes`)),
          )
        } catch (e) {
          avisos.push(
            `ficha de ${c.sigla} ${c.numero}/${c.ano}: ${(e as Error).message}`.slice(0, 200),
          )
          return pacoteAlesc(c)
        }
      }

      // 2. Novas pela relevância
      const pacotes = new Map<string, PacoteProposicao>()
      let novas = 0
      for (const c of recentes) {
        const chave = chaveSC(c.id)
        if (pacotes.has(chave) || ctx.descartadas.has(chave)) continue
        const acompanhada =
          ctx.acompanhadas.has(chave) ||
          ctx.acompanhadas.has(`SC:${identificacaoDe(c.sigla, c.numero, c.ano)}`)
        if (!acompanhada) {
          if (novas >= ctx.maxNovas || ctx.relevancia(c.ementa) < ctx.notaMinima) continue
          novas++
        }
        pacotes.set(chave, await completo(c))
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      // 3. Acompanhadas fora das recentes: lista filtrada pelo número
      const ja = new Set(
        [...pacotes.values()].map(
          (p) => `${p.proposicao.sigla} ${p.proposicao.numero}/${p.proposicao.ano}`,
        ),
      )
      const alvos = acompanhadasDeSantaCatarina(ctx.acompanhadas).filter(
        (a) => !ja.has(`${a.sigla} ${a.numero}/${a.ano}`),
      )
      if (alvos.length > MAX_ACOMPANHADAS)
        avisos.push(
          `${alvos.length} propostas acompanhadas; atualizadas ${MAX_ACOMPANHADAS} nesta rodada`,
        )
      let achadas = 0
      for (const a of alvos.slice(0, MAX_ACOMPANHADAS)) {
        try {
          paginasLidas++
          const c = lerListaAlesc(await obter(urlListaAlesc(a))).cartoes.find(
            (x) => x.sigla === a.sigla && x.numero === a.numero && x.ano === a.ano,
          )
          if (!c) continue
          achadas++
          pacotes.set(chaveSC(c.id), await completo(c))
        } catch (e) {
          avisos.push(`${a.sigla} ${a.numero}/${a.ano}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      return {
        pacotes: [...pacotes.values()],
        pautas: [],
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

export const conectorAlesc = criarConectorAlesc()
