/**
 * Conector do Diário da ALE-RR (Roraima). Em cada rodada:
 *   1. lista na API do WordPress as edições em PDF publicadas desde a última coleta;
 *   2. baixa cada edição e lê o texto;
 *   3. projetos apresentados: os já acompanhados sempre; os novos só com nota de relevância suficiente
 *      (dicionário nacional + palavras-chave de Roraima), até o teto de novas por rodada;
 *   4. autógrafos (projeto aprovado) viram andamento nas propostas acompanhadas.
 * Chave da fonte: casa-rr (a mesma do levantamento).
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import { baixarArquivo, extrairTextoPdf, type Baixador } from '../textos'
import type { EventoColetado, PacoteProposicao } from '../tipos'
import { autografosDaEdicao, chaveRR, DIARIO_RR, edicaoDe, eventoDoAutografo, pacoteDoProjeto, projetosDaEdicao } from './mapear'

type Midia = { date?: string; source_url?: string; title?: { rendered?: string } }

/** Teto de edições lidas por rodada (cada uma é um PDF; a primeira coleta pega só o período recente). */
const MAX_EDICOES = 8

export function criarConectorAlerr(opcoes: { baixar?: Baixador } = {}): Conector {
  const baixar = opcoes.baixar || baixarArquivo()
  return {
    slug: 'casa-rr',
    nome: 'Assembleia Legislativa de Roraima (Diário da ALE-RR)',
    uf: 'RR',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const midia = (await ctx.buscar(
        `${DIARIO_RR}/wp-json/wp/v2/media?per_page=30&mime_type=application/pdf&orderby=date&order=desc&after=${dia(ctx.desde)}T00:00:00`,
      )) as Midia[]
      const edicoes = (Array.isArray(midia) ? midia : [])
        .map((m) => (m.source_url ? edicaoDe(m.title?.rendered || '', m.source_url) : null))
        .filter((e): e is NonNullable<typeof e> => !!e)
        .sort((a, b) => a.numero - b.numero)
      if (edicoes.length > MAX_EDICOES) avisos.push(`${edicoes.length} edições no período; lidas as ${MAX_EDICOES} mais recentes`)

      const pacotes: PacoteProposicao[] = []
      const eventos: EventoColetado[] = []
      const vistos = new Set<string>()
      let novas = 0
      let projetos = 0
      for (const e of edicoes.slice(-MAX_EDICOES)) {
        let texto: string
        try {
          texto = (await extrairTextoPdf(new Uint8Array(await baixar(e.url)))).texto
        } catch (err) {
          avisos.push(`edição ${e.numero}: ${(err as Error).message}`.slice(0, 200))
          continue
        }
        for (const p of projetosDaEdicao(texto)) {
          projetos++
          const chave = chaveRR(p)
          if (vistos.has(chave) || ctx.descartadas.has(chave)) continue
          const acompanhada = ctx.acompanhadas.has(chave) || ctx.acompanhadas.has(`RR:${identificacaoDe(p.sigla, p.numero, p.ano)}`)
          if (!acompanhada) {
            if (novas >= ctx.maxNovas || ctx.relevancia(`${p.ementa} ${p.texto.slice(0, 3000)}`) < ctx.notaMinima) continue
            novas++
          }
          vistos.add(chave)
          pacotes.push(pacoteDoProjeto(p, e))
        }
        for (const a of autografosDaEdicao(texto)) {
          if (ctx.acompanhadas.has(chaveRR(a)) || ctx.acompanhadas.has(`RR:${identificacaoDe(a.sigla, a.numero, a.ano)}`) || vistos.has(chaveRR(a))) eventos.push(eventoDoAutografo(a, e))
        }
      }
      if (novas >= ctx.maxNovas) avisos.push(`limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`)

      return {
        pacotes,
        pautas: [],
        eventos,
        itensListados: edicoes.length,
        amostra: { edicoes: edicoes.map((e) => e.numero), projetosLidos: projetos, abertos: pacotes.map((p) => p.proposicao.chave) },
        avisos,
      }
    },
  }
}

export const conectorAlerr = criarConectorAlerr()
