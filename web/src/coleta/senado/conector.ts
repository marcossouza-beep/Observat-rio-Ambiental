/**
 * Conector do Senado (serviços de "processo"): lista o que foi atualizado desde a última coleta,
 * abre o processo do que o site acompanha ou do que é relevante, e lê a agenda do Plenário e das comissões.
 */
import { dia, SIGLAS_ACOMPANHADAS, type Conector, type ContextoColeta, type ResultadoColeta } from '../conector'
import type { PacoteProposicao } from '../tipos'
import {
  chaveMateria,
  chaveSenado,
  mapearAgendaComissoesSenado,
  mapearAgendaPlenarioSenado,
  mapearInformesSenado,
  mapearProcessoSenado,
  mapearVotacoesSenado,
  resumosSenado,
  type ResumoSenado,
} from './mapear'

export { SENADO_DADOS as SENADO } from './mapear'
import { SENADO_DADOS as SENADO } from './mapear'
const compacto = (d: string) => d.replace(/-/g, '')

async function pacote(ctx: ContextoColeta, id: number): Promise<PacoteProposicao> {
  const [detalhe, relatorias, votacoes] = await Promise.all([
    ctx.buscar(`${SENADO}/processo/${id}`),
    ctx.buscar(`${SENADO}/processo/relatoria?idProcesso=${id}`),
    ctx.buscar(`${SENADO}/votacao?idProcesso=${id}`),
  ])
  const proposicao = mapearProcessoSenado(detalhe, relatorias)
  const { tramitacoes, versoes } = mapearInformesSenado(detalhe)
  return { proposicao, tramitacoes, versoes, votacoes: mapearVotacoesSenado(votacoes) }
}

const siglaDe = (r: ResumoSenado) => /^([A-Z]+)\s/.exec(r.identificacao || '')?.[1] || ''

export const conectorSenado: Conector = {
  slug: 'senado',
  nome: 'Senado Federal',
  async coletar(ctx): Promise<ResultadoColeta> {
    // "numdias": atualizados nos últimos N dias (máximo 30)
    const dias = Math.min(30, Math.max(1, Math.ceil((ctx.agora.getTime() - ctx.desde.getTime()) / 864e5) + 1))
    const resumos = resumosSenado(await ctx.buscar(`${SENADO}/processo?numdias=${dias}&tramitando=S`)).filter((r) => SIGLAS_ACOMPANHADAS.includes(siglaDe(r)))
    const avisos: string[] = []

    const acompanhadas: number[] = []
    const candidatas: { id: number; nota: number }[] = []
    for (const r of resumos) {
      const chaves = [chaveSenado(r.id), r.codigoMateria ? chaveMateria(r.codigoMateria) : '', r.identificacao || ''].filter(Boolean)
      if (chaves.some((c) => ctx.descartadas.has(c))) continue
      if (chaves.some((c) => ctx.acompanhadas.has(c))) acompanhadas.push(r.id)
      else {
        const nota = ctx.relevancia(r.ementa || '')
        if (nota >= ctx.notaMinima) candidatas.push({ id: r.id, nota })
      }
    }
    candidatas.sort((a, b) => b.nota - a.nota)
    if (candidatas.length > ctx.maxNovas) avisos.push(`${candidatas.length - ctx.maxNovas} propostas novas ficaram para a próxima coleta`)

    const pacotes: PacoteProposicao[] = []
    for (const id of [...acompanhadas, ...candidatas.slice(0, ctx.maxNovas).map((c) => c.id)]) pacotes.push(await pacote(ctx, id))

    // Agenda: Plenário do mês (e do próximo, se a semana atravessa o mês) e comissões dos próximos 7 dias.
    const hoje = dia(ctx.agora)
    const daqui7 = dia(ctx.agora, 7)
    const meses = [...new Set([hoje.slice(0, 7), daqui7.slice(0, 7)])]
    const pautas = []
    for (const m of meses) pautas.push(...mapearAgendaPlenarioSenado(await ctx.buscar(`${SENADO}/plenario/agenda/mes/${compacto(m === hoje.slice(0, 7) ? hoje : `${m}-01`)}`)))
    pautas.push(...mapearAgendaComissoesSenado(await ctx.buscar(`${SENADO}/comissao/agenda/${compacto(hoje)}/${compacto(daqui7)}`)))
    const naSemana = pautas.filter((p) => p.data >= ctx.agora.toISOString().slice(0, 10) && p.data <= `${daqui7}T23:59`)

    return {
      pacotes,
      pautas: naSemana,
      itensListados: resumos.length,
      amostra: { listados: resumos.length, abertos: pacotes.map((p) => p.proposicao.chave), pautas: naSemana.length, exemplo: resumos[0] },
      avisos,
    }
  },
}
