/**
 * Conector da Assembleia Legislativa de São Paulo (fonte casa-sp), pela API da aplicação de processo legislativo.
 * Em cada rodada:
 *   1. pesquisa as proposituras do ano (PL, PLC, PEC, PDL), das mais novas para as mais antigas, até sair do período;
 *   2. novas: entram as que passam na nota de relevância (ementa), até o teto por rodada, com ficha e andamentos;
 *   3. acompanhadas (pela chave ou pelo número no estado, "SP:PL 884/2026"): pesquisa pelo número, ficha e andamentos.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import {
  ALESP_API,
  chaveSP,
  identidadeAlesp,
  lerPesquisaAlesp,
  lerTramitacoesAlesp,
  pacoteAlesp,
  TIPOS_ALESP,
  urlPesquisaAlesp,
  type DetalhesAlesp,
  type ResumoAlesp,
} from './mapear'

/** Tetos por rodada: páginas da pesquisa (50 itens cada) e propostas acompanhadas procuradas. */
const MAX_PAGINAS = 6
const MAX_ACOMPANHADAS = 20

/** Propostas de São Paulo acompanhadas pela identificação no estado ("SP:PL 884/2026"); a chave é por processo. */
export function acompanhadasDeSaoPaulo(acompanhadas: Set<string>) {
  const siglas = Object.values(TIPOS_ALESP)
  const r: { sigla: string; numero: number; ano: number }[] = []
  for (const a of acompanhadas) {
    const m = /^SP:([A-Z]+) (\d+)\/(\d{4})$/.exec(a)
    if (m && siglas.includes(m[1])) r.push({ sigla: m[1], numero: Number(m[2]), ano: Number(m[3]) })
  }
  return r
}

export function criarConectorAlesp(): Conector {
  return {
    slug: 'casa-sp',
    nome: 'Assembleia Legislativa de São Paulo (processo legislativo)',
    uf: 'SP',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      const ano = Number(dia(ctx.agora).slice(0, 4))
      let chamadas = 0
      const buscar = (url: string) => (chamadas++, ctx.buscar(url))

      // 1. Recentes (a pesquisa vem da mais nova para a mais antiga)
      const recentes: ResumoAlesp[] = []
      try {
        for (let p = 0; p < MAX_PAGINAS; p++) {
          const { itens, paginas } = lerPesquisaAlesp(
            await buscar(urlPesquisaAlesp({ ano, pagina: p })),
          )
          recentes.push(...itens.filter((i) => (i.dtPublicacao || '9999') >= desde))
          if (
            !itens.length ||
            p + 1 >= paginas ||
            itens.some((i) => (i.dtPublicacao || '9999') < desde)
          )
            break
          if (p + 1 === MAX_PAGINAS)
            avisos.push(`mais de ${MAX_PAGINAS * 50} proposituras no período; lidas as mais novas`)
        }
      } catch (e) {
        avisos.push(`pesquisa: ${(e as Error).message}`.slice(0, 200))
      }

      // Ficha e andamentos de uma proposta (sem eles, entra só com a publicação)
      const completo = async (r: ResumoAlesp): Promise<PacoteProposicao | null> => {
        let d: DetalhesAlesp | undefined
        let andamentos: ReturnType<typeof lerTramitacoesAlesp> = []
        try {
          d = (await buscar(
            `${ALESP_API}/processo/detalhes/principais/${r.idProcesso}`,
          )) as DetalhesAlesp
          andamentos = lerTramitacoesAlesp(
            await buscar(
              `${ALESP_API}/processo/tramitacoes/${r.idProcesso}?page=0&size=200&sort=asc`,
            ),
          )
        } catch (e) {
          avisos.push(
            `ficha de ${r.descricao || r.idProcesso}: ${(e as Error).message}`.slice(0, 200),
          )
        }
        return pacoteAlesp(r, d, andamentos)
      }

      // 2. Novas pela relevância
      const pacotes = new Map<string, PacoteProposicao>()
      let novas = 0
      for (const r of recentes) {
        const ident = identidadeAlesp(r)
        if (!ident) continue
        const chave = chaveSP(r.idProcesso)
        if (pacotes.has(chave) || ctx.descartadas.has(chave)) continue
        const acompanhada =
          ctx.acompanhadas.has(chave) ||
          ctx.acompanhadas.has(`SP:${identificacaoDe(ident.sigla, ident.numero, ident.ano)}`)
        if (!acompanhada) {
          if (novas >= ctx.maxNovas || ctx.relevancia(r.resumo || '') < ctx.notaMinima) continue
          novas++
        }
        const p = await completo(r)
        if (p) pacotes.set(chave, p)
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      // 3. Acompanhadas fora das recentes: pesquisa pelo número
      const ja = new Set(
        [...pacotes.values()].map(
          (p) => `${p.proposicao.sigla} ${p.proposicao.numero}/${p.proposicao.ano}`,
        ),
      )
      const alvos = acompanhadasDeSaoPaulo(ctx.acompanhadas).filter(
        (a) => !ja.has(`${a.sigla} ${a.numero}/${a.ano}`),
      )
      if (alvos.length > MAX_ACOMPANHADAS)
        avisos.push(
          `${alvos.length} propostas acompanhadas; atualizadas ${MAX_ACOMPANHADAS} nesta rodada`,
        )
      let achadas = 0
      for (const a of alvos.slice(0, MAX_ACOMPANHADAS)) {
        try {
          const { itens } = lerPesquisaAlesp(
            await buscar(
              urlPesquisaAlesp({ sigla: a.sigla, numero: a.numero, ano: a.ano, tamanho: 10 }),
            ),
          )
          const r = itens.find((i) => {
            const x = identidadeAlesp(i)
            return x?.sigla === a.sigla && x.numero === a.numero && x.ano === a.ano
          })
          if (!r) continue
          const p = await completo(r)
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

export const conectorAlesp = criarConectorAlesp()
