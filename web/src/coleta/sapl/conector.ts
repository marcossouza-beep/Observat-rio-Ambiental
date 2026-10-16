/**
 * Conector do SAPL (Interlegis): um por Assembleia, todos com o mesmo código.
 * Em cada rodada lista as matérias atualizadas desde a última coleta (data_ultima_atualizacao) e os andamentos
 * do período (para não perder a acompanhada cuja tramitação andou sem mudar a data da matéria),
 * fica só com os tipos que interessam (tipoDeInteresse), e busca tramitação e autoria das propostas
 * já acompanhadas e das novas com nota de relevância suficiente (dicionário nacional + palavras-chave do estado).
 */
import { dia, identificacaoDe, type Conector, type ContextoColeta, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import {
  mapearMateria,
  siglaDoTipo,
  tabela,
  tipoDeInteresse,
  type ContextoSapl,
  type Pagina,
  type Registro,
} from './mapear'

/** Assembleias do Norte com a API do SAPL aberta (docs/LEVANTAMENTO.md). Roraima usa o SAPL, mas recusa o acesso. */
export const SAPL_NORTE: { uf: string; nome: string; base: string }[] = [
  { uf: 'ac', nome: 'Assembleia Legislativa do Acre (SAPL)', base: 'https://sapl.al.ac.leg.br' },
  {
    uf: 'am',
    nome: 'Assembleia Legislativa do Amazonas (SAPL)',
    base: 'https://sapl.al.am.leg.br',
  },
  {
    uf: 'ro',
    nome: 'Assembleia Legislativa de Rondônia (SAPL)',
    base: 'https://sapl.al.ro.leg.br',
  },
  {
    uf: 'to',
    nome: 'Assembleia Legislativa do Tocantins (SAPL)',
    base: 'https://sapl.al.to.leg.br',
  },
]

const MAX_PAGINAS = 10
const resultados = (p: unknown) => ((p as Pagina)?.results || []) as Registro[]

async function todas(ctx: ContextoColeta, url: string, maxPaginas = MAX_PAGINAS) {
  const lista: Registro[] = []
  let total = 0
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const p = (await ctx.buscar(`${url}${url.includes('?') ? '&' : '?'}page=${pagina}`)) as Pagina
    lista.push(...resultados(p))
    total = p?.pagination?.total_entries ?? lista.length
    if (!p?.pagination?.next_page) break
  }
  return { lista, total }
}

export function conectorSapl(uf: string, nome: string, base: string): Conector {
  return {
    slug: `casa-${uf}`,
    nome,
    uf: uf.toUpperCase(),
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      // Tabelas da casa: tipos de matéria, situações e unidades de tramitação
      const [tipos, situacoes, unidades] = await Promise.all(
        ['tipomaterialegislativa', 'statustramitacao', 'unidadetramitacao'].map(async (t) =>
          tabela((await todas(ctx, `${base}/api/materia/${t}/?page_size=200`, 3)).lista),
        ),
      )
      const sapl: ContextoSapl = { uf, base, tipos, situacoes, unidades, autores: new Map() }

      const { lista, total } = await todas(
        ctx,
        `${base}/api/materia/materialegislativa/?data_ultima_atualizacao__gte=${dia(ctx.desde)}&o=-data_ultima_atualizacao&page_size=100`,
      )
      const deInteresse = lista.filter((m) => tipoDeInteresse(tipos.get(Number(m.tipo))))

      // Andamentos da semana: tramitação nova nem sempre muda a data de atualização da matéria.
      // As acompanhadas que andaram e não vieram na lista acima são buscadas uma a uma.
      const desde = dia(ctx.desde)
      const tramitadas = (
        await todas(
          ctx,
          `${base}/api/materia/tramitacao/?data_tramitacao__gte=${desde}&o=-data_tramitacao&page_size=100`,
          5,
        )
      ).lista.filter((t) => `${t.data_tramitacao || ''}` >= desde)
      const naLista = new Set(lista.map((m) => Number(m.id)))
      const faltando = [...new Set(tramitadas.map((t) => Number(t.materia)))].filter(
        (id) => id && !naLista.has(id) && ctx.acompanhadas.has(`sapl:${uf}:${id}`),
      )
      for (const id of faltando) {
        try {
          deInteresse.push(
            (await ctx.buscar(`${base}/api/materia/materialegislativa/${id}/`)) as Registro,
          )
        } catch (e) {
          avisos.push(`matéria ${id}: ${(e as Error).message}`.slice(0, 200))
        }
      }

      const pacotes: PacoteProposicao[] = []
      let novas = 0
      for (const m of deInteresse) {
        const chave = `sapl:${uf}:${m.id}`
        if (ctx.descartadas.has(chave)) continue
        // Acompanhada pela chave ou pelo número no estado ("TO:PLO 77/2026", cadastrada à mão pelo autor)
        const acompanhada =
          ctx.acompanhadas.has(chave) ||
          ctx.acompanhadas.has(`${uf.toUpperCase()}:${identificacaoDe(siglaDoTipo(tipos.get(Number(m.tipo))), Number(m.numero), Number(m.ano))}`)
        if (!acompanhada) {
          if (
            novas >= ctx.maxNovas ||
            ctx.relevancia(`${m.ementa || ''} ${m.indexacao || ''}`) < ctx.notaMinima
          )
            continue
          novas++
        }
        const [tram, aut] = await Promise.all([
          ctx.buscar(
            `${base}/api/materia/tramitacao/?materia=${m.id}&page_size=100&o=-data_tramitacao`,
          ),
          ctx.buscar(`${base}/api/materia/autoria/?materia=${m.id}&page_size=50`),
        ])
        for (const a of resultados(aut)) {
          const idAutor = Number(a.autor)
          if (idAutor && !sapl.autores.has(idAutor)) {
            try {
              sapl.autores.set(
                idAutor,
                (await ctx.buscar(`${base}/api/base/autor/${idAutor}/`)) as Registro,
              )
            } catch (e) {
              avisos.push(`autor ${idAutor}: ${(e as Error).message}`.slice(0, 200))
            }
          }
        }
        pacotes.push(mapearMateria(m, resultados(tram), resultados(aut), sapl))
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )

      return {
        pacotes,
        pautas: [],
        itensListados: total,
        amostra: {
          listadas: lista.length,
          deInteresse: deInteresse.length,
          andamentosNoPeriodo: tramitadas.length,
          acompanhadasPorAndamento: faltando.length,
          primeira: lista[0] ?? null,
        },
        avisos,
      }
    },
  }
}

/** Assembleias do Nordeste com a API do SAPL aberta (Fase 6). */
export const SAPL_NE: { uf: string; nome: string; base: string }[] = [
  { uf: 'al', nome: 'Assembleia Legislativa de Alagoas (SAPL)', base: 'https://sapl.al.al.leg.br' },
  { uf: 'pb', nome: 'Assembleia Legislativa da Paraíba (SAPL)', base: 'https://sapl3.al.pb.leg.br' },
  { uf: 'pi', nome: 'Assembleia Legislativa do Piauí (SAPL)', base: 'https://sapl.al.pi.leg.br' },
]

/** Todas as casas com SAPL aberto, de todas as regiões já cobertas. */
export const SAPL_CASAS = [...SAPL_NORTE, ...SAPL_NE]

export const CONECTORES_SAPL: Record<string, Conector> = Object.fromEntries(
  SAPL_CASAS.map((c) => [`casa-${c.uf}`, conectorSapl(c.uf, c.nome, c.base)]),
)
