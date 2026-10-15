/**
 * Conector do Congresso Nacional: vetos às propostas acompanhadas (com o resultado da apreciação)
 * e a agenda das sessões do Congresso da semana.
 */
import { dia, type Conector, type ResultadoColeta } from '../conector'
import { mapearAgendaPlenarioSenado, SENADO_DADOS } from '../senado/mapear'
import type { EventoColetado } from '../tipos'
import { alvoDoVeto, eventoDoVeto, vetoDoResultado, vetosDoAno } from './mapear'

const compacto = (d: string) => d.replace(/-/g, '')

export const conectorCongresso: Conector = {
  slug: 'congresso',
  nome: 'Congresso Nacional',
  async coletar(ctx): Promise<ResultadoColeta> {
    const ano = ctx.agora.getUTCFullYear()
    // No começo do ano ainda tramitam vetos do ano anterior
    const anos = ctx.agora.getUTCMonth() < 3 ? [ano - 1, ano] : [ano]
    const vetos = []
    for (const a of anos) vetos.push(...vetosDoAno(await ctx.buscar(`${SENADO_DADOS}/materia/vetos/${a}`)))

    const eventos: EventoColetado[] = []
    for (const v of vetos) {
      const alvo = alvoDoVeto(v)
      if ([...alvo.chaves, ...alvo.identificacoes].some((c) => ctx.descartadas.has(c))) continue
      if (![...alvo.chaves, ...alvo.identificacoes].some((c) => ctx.acompanhadas.has(c))) continue
      const resultado = v.Materia?.EmTramitacao === 'Não' && v.Materia.Codigo ? vetoDoResultado(await ctx.buscar(`${SENADO_DADOS}/plenario/resultado/veto/materia/${v.Materia.Codigo}`)) : undefined
      const e = eventoDoVeto(v, resultado)
      if (e) eventos.push(e)
    }

    const pautas = mapearAgendaPlenarioSenado(await ctx.buscar(`${SENADO_DADOS}/plenario/agenda/cn/${compacto(dia(ctx.agora))}/${compacto(dia(ctx.agora, 7))}`), 'CN')
    return {
      pacotes: [],
      pautas,
      eventos,
      itensListados: vetos.length,
      amostra: { vetos: vetos.length, dePropostasAcompanhadas: eventos.length, pautas: pautas.length, exemplo: vetos[0]?.Materia },
      avisos: [],
    }
  },
}
