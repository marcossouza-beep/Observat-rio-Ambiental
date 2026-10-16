/**
 * Conector da Assembleia Legislativa de Minas Gerais (fonte casa-mg), pela API de dados abertos. Em cada rodada:
 *   1. de cada tipo (PL, PLC, PEC), lê as páginas do ano em ordem decrescente de número até chegar a proposições
 *      publicadas antes da última coleta;
 *   2. novas: entram as que passam na nota de relevância (ementa e indexação), até o teto por rodada;
 *   3. acompanhadas (pela chave ou pelo número no estado, "MG:PL 6187/2026"): pesquisa pelo número, com o histórico.
 * A API pede no máximo duas chamadas ao mesmo tempo e um segundo entre elas: aqui são sequenciais, com intervalo.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import {
  chaveMG,
  itensAlmg,
  pacoteAlmg,
  TIPOS_ALMG,
  urlPesquisaAlmg,
  type ItemAlmg,
} from './mapear'

/** Tetos por rodada: páginas lidas por tipo (20 itens cada) e propostas acompanhadas procuradas. */
const MAX_PAGINAS_POR_TIPO = 5
const MAX_ACOMPANHADAS = 20
const INTERVALO_MS = 1100

/** Propostas de Minas acompanhadas, pela chave (almg:PL-6187-2026) ou pela identificação no estado (MG:PL 6187/2026). */
export function acompanhadasDeMinas(acompanhadas: Set<string>) {
  const r = new Map<string, { sigla: string; numero: number; ano: number }>()
  for (const a of acompanhadas) {
    const m = /^almg:([A-Z]+)-(\d+)-(\d{4})$/.exec(a) || /^MG:([A-Z]+) (\d+)\/(\d{4})$/.exec(a)
    if (m && TIPOS_ALMG.includes(m[1]))
      r.set(`${m[1]}-${Number(m[2])}-${m[3]}`, {
        sigla: m[1],
        numero: Number(m[2]),
        ano: Number(m[3]),
      })
  }
  return [...r.values()]
}

export function criarConectorAlmg(
  opcoes: { esperar?: (ms: number) => Promise<void> } = {},
): Conector {
  const esperar = opcoes.esperar || ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)))
  return {
    slug: 'casa-mg',
    nome: 'Assembleia Legislativa de Minas Gerais (dados abertos)',
    uf: 'MG',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      const ano = Number(dia(ctx.agora).slice(0, 4))
      let chamadas = 0
      const buscar = async (url: string) => {
        if (chamadas++) await esperar(INTERVALO_MS)
        return itensAlmg(await ctx.buscar(url))
      }

      // 1. Recentes de cada tipo (a lista vem do número maior para o menor)
      const recentes: ItemAlmg[] = []
      for (const tipo of TIPOS_ALMG) {
        try {
          for (let p = 1; p <= MAX_PAGINAS_POR_TIPO; p++) {
            const { itens } = await buscar(urlPesquisaAlmg({ tipo, ano, pagina: p }))
            recentes.push(...itens.filter((i) => (i.dataPublicacao || '9999') >= desde))
            if (!itens.length || itens.some((i) => (i.dataPublicacao || '9999') < desde)) break
            if (p === MAX_PAGINAS_POR_TIPO)
              avisos.push(
                `${tipo}: mais de ${MAX_PAGINAS_POR_TIPO * 20} proposições no período; lidas as mais novas`,
              )
          }
        } catch (e) {
          avisos.push(`${tipo}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      // 2. Novas pela relevância (acompanhadas que aparecem entre as recentes já vêm completas)
      const pacotes = new Map<string, PacoteProposicao>()
      let novas = 0
      for (const i of recentes) {
        const p = pacoteAlmg(i)
        if (!p) continue
        const { chave, sigla, numero, ano: a } = p.proposicao
        if (pacotes.has(chave) || ctx.descartadas.has(chave)) continue
        const acompanhada =
          ctx.acompanhadas.has(chave) ||
          ctx.acompanhadas.has(`MG:${identificacaoDe(sigla, numero, a)}`)
        if (!acompanhada) {
          if (
            novas >= ctx.maxNovas ||
            ctx.relevancia(`${p.proposicao.ementa} ${i.indexacao || ''}`) < ctx.notaMinima
          )
            continue
          novas++
        }
        pacotes.set(chave, p)
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      // 3. Acompanhadas: pesquisa pelo número (o item traz o histórico inteiro)
      const alvos = acompanhadasDeMinas(ctx.acompanhadas).filter(
        (a) => !pacotes.has(chaveMG(a.sigla, a.numero, a.ano)),
      )
      if (alvos.length > MAX_ACOMPANHADAS)
        avisos.push(
          `${alvos.length} propostas acompanhadas; atualizadas ${MAX_ACOMPANHADAS} nesta rodada`,
        )
      let achadas = 0
      for (const a of alvos.slice(0, MAX_ACOMPANHADAS)) {
        try {
          const { itens } = await buscar(
            urlPesquisaAlmg({ tipo: a.sigla, numero: a.numero, ano: a.ano }),
          )
          const p = itens
            .map(pacoteAlmg)
            .find((x) => x && x.proposicao.numero === a.numero && x.proposicao.ano === a.ano)
          if (!p) continue
          achadas++
          pacotes.set(p.proposicao.chave, p)
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
          paginasLidas: chamadas,
          acompanhadasAchadas: `${achadas}/${Math.min(alvos.length, MAX_ACOMPANHADAS)}`,
          abertos: [...pacotes.keys()],
        },
        avisos,
      }
    },
  }
}

export const conectorAlmg = criarConectorAlmg()
