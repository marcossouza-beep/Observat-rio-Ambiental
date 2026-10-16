/**
 * Conector do Diário Oficial do Legislativo da Bahia (Alba). Em cada rodada:
 *   1. lista na API da EGBA as edições publicadas desde a última coleta;
 *   2. baixa cada edição (PDF) e separa as matérias;
 *   3. projetos apresentados: os já acompanhados sempre; os novos só com nota de relevância suficiente
 *      (dicionário nacional + palavras-chave da Bahia), até o teto de novas por rodada;
 *   4. matérias que citam no título uma proposta acompanhada (parecer, ordem do dia, redação final) viram andamento.
 * Chave da fonte: casa-ba.
 */
import { dia, identificacaoDe, type Conector, type ResultadoColeta } from '../conector'
import { baixarArquivo, extrairTextoPdf, type Baixador } from '../textos'
import type { EventoColetado, PacoteProposicao } from '../tipos'
import {
  chaveBA,
  EGBA,
  edicoesEgba,
  eventoDaMencao,
  materiasDoDiario,
  mencoesDaMateria,
  pacoteDoProjetoAlba,
  projetoDaMateria,
} from './mapear'

/** Teto de edições lidas por rodada (cada uma é um PDF de ~1 MB). */
const MAX_EDICOES = 8

export function criarConectorAlba(opcoes: { baixar?: Baixador } = {}): Conector {
  const baixar = opcoes.baixar || baixarArquivo()
  return {
    slug: 'casa-ba',
    nome: 'Assembleia Legislativa da Bahia (Diário do Legislativo)',
    uf: 'BA',
    async coletar(ctx): Promise<ResultadoColeta> {
      const avisos: string[] = []
      const desde = dia(ctx.desde)
      const edicoes = edicoesEgba(
        await ctx.buscar(`${EGBA}/apifront/portal/edicoes/ultimas_edicoes.json?subtheme=alba`),
      )
        .filter((e) => e.data >= desde)
        .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
      if (edicoes.length > MAX_EDICOES)
        avisos.push(`${edicoes.length} edições no período; lidas as ${MAX_EDICOES} mais recentes`)

      const acompanhada = (p: { sigla: string; numero: number; ano: number }) =>
        ctx.acompanhadas.has(chaveBA(p)) ||
        ctx.acompanhadas.has(`BA:${identificacaoDe(p.sigla, p.numero, p.ano)}`)
      const pacotes: PacoteProposicao[] = []
      const eventos: EventoColetado[] = []
      const vistos = new Set<string>()
      let novas = 0
      let projetos = 0
      let materias = 0
      for (const e of edicoes.slice(-MAX_EDICOES)) {
        let texto: string
        try {
          texto = (await extrairTextoPdf(new Uint8Array(await baixar(e.url)))).texto
        } catch (err) {
          avisos.push(`edição ${e.numero}: ${(err as Error).message}`.slice(0, 200))
          continue
        }
        for (const m of materiasDoDiario(texto)) {
          materias++
          const p = projetoDaMateria(m)
          if (p) {
            projetos++
            const chave = chaveBA(p)
            if (vistos.has(chave) || ctx.descartadas.has(chave)) continue
            if (!acompanhada(p)) {
              if (
                novas >= ctx.maxNovas ||
                ctx.relevancia(`${p.ementa} ${p.texto.slice(0, 3000)}`) < ctx.notaMinima
              )
                continue
              novas++
            }
            vistos.add(chave)
            pacotes.push(pacoteDoProjetoAlba(p, e))
            continue
          }
          for (const a of mencoesDaMateria(m))
            if (acompanhada(a) || vistos.has(chaveBA(a))) eventos.push(eventoDaMencao(a, m, e))
        }
      }
      if (novas >= ctx.maxNovas)
        avisos.push(
          `limite de ${ctx.maxNovas} propostas novas por rodada atingido; o restante entra nas próximas`,
        )
      if (edicoes.length && !materias)
        avisos.push('nenhuma matéria separada nas edições: o formato do diário pode ter mudado')

      return {
        pacotes,
        pautas: [],
        eventos,
        itensListados: edicoes.length,
        amostra: {
          edicoes: edicoes.map((e) => e.numero),
          materias,
          projetosLidos: projetos,
          abertos: pacotes.map((p) => p.proposicao.chave),
        },
        avisos,
      }
    },
  }
}

export const conectorAlba = criarConectorAlba()
