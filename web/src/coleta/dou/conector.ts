/**
 * Conector do Diário Oficial da União (INLABS): baixa a Seção 1 e as edições extras de cada dia
 * desde a última coleta, lê os atos e separa:
 * - fatos de propostas acompanhadas (lei publicada, medida provisória, mensagem de veto);
 * - atos novos relevantes pelo dicionário (leis, decretos, MPs, atos de MMA, Ibama, ICMBio…), que entram na Triagem.
 */
import { dia, type Conector, type ResultadoColeta } from '../conector'
import type { EventoColetado, PacoteProposicao } from '../tipos'
import { lerZip } from '../zip'
import { baixarEdicao, entrarInlabs, type Baixar } from './inlabs'
import { classificarAto, lerAto } from './mapear'

export function criarConectorDou(opcoes: { email?: string; senha?: string; baixar?: Baixar } = {}): Conector {
  const email = () => opcoes.email ?? process.env.INLABS_EMAIL
  const senha = () => opcoes.senha ?? process.env.INLABS_SENHA
  return {
    slug: 'dou',
    nome: 'Diário Oficial da União',
    naoConfigurado: () => (email() && senha() ? null : 'faltam os segredos INLABS_EMAIL e INLABS_SENHA'),
    async coletar(ctx): Promise<ResultadoColeta> {
      const cookie = await entrarInlabs(email()!, senha()!, opcoes.baixar)
      // Do dia da última coleta até hoje (no máximo 7 dias): edição normal e extras
      const dias: string[] = []
      for (let d = new Date(Math.max(ctx.desde.getTime(), ctx.agora.getTime() - 6 * 864e5)); dia(d) <= dia(ctx.agora); d = new Date(d.getTime() + 864e5)) dias.push(dia(d))
      const eventos: EventoColetado[] = []
      const candidatos: { pacote: PacoteProposicao; nota: number }[] = []
      const edicoes: string[] = []
      let atos = 0
      for (const data of dias) {
        for (const secao of ['DO1', 'DO1E']) {
          const zip = await baixarEdicao(cookie, data, secao, opcoes.baixar)
          if (!zip) continue
          edicoes.push(`${data}-${secao}`)
          for (const arq of lerZip(zip, (n) => n.toLowerCase().endsWith('.xml'))) {
            const ato = lerAto(arq.conteudo.toString('utf8'))
            if (!ato) continue
            atos++
            const r = classificarAto(ato, ctx)
            if (r.evento) eventos.push(r.evento)
            if (r.pacote) candidatos.push({ pacote: r.pacote, nota: r.nota ?? 0 })
          }
        }
      }
      candidatos.sort((a, b) => b.nota - a.nota)
      const avisos = candidatos.length > ctx.maxNovas ? [`${candidatos.length - ctx.maxNovas} atos relevantes ficaram de fora (limite por coleta)`] : []
      return {
        pacotes: candidatos.slice(0, ctx.maxNovas).map((c) => c.pacote),
        pautas: [],
        eventos,
        itensListados: atos,
        amostra: { edicoes, atos, eventos: eventos.length, relevantes: candidatos.length, exemplo: candidatos[0]?.pacote.proposicao },
        avisos,
      }
    },
  }
}

export const conectorDou = criarConectorDou()
