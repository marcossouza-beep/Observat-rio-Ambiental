/**
 * O que todo conector recebe e devolve numa rodada de coleta.
 * A busca na rede é injetada (`buscar`), para os testes rodarem com respostas gravadas.
 */
import { obterJson, type OpcoesHttp } from './http'
import type { EventoColetado, PacoteProposicao, PautaColetada } from './tipos'

export type Buscar = (url: string) => Promise<unknown>
export const buscarNaRede = (o: OpcoesHttp = {}): Buscar => (url) => obterJson(url, o)

export type ContextoColeta = {
  /** Última coleta bem-sucedida (com folga de 1 dia, ver docs/APIS.md, seção 4). */
  desde: Date
  agora: Date
  /** Chaves e identificações ("PL 2159/2021") das propostas que o site já acompanha (triagem, ativa, monitorada). */
  acompanhadas: Set<string>
  /** Propostas descartadas na triagem: não voltam. */
  descartadas: Set<string>
  /** Nota de relevância pelo dicionário de palavras-chave. */
  relevancia: (texto: string) => number
  /** Nota mínima para uma proposta nova entrar na triagem. */
  notaMinima: number
  /** Teto de propostas novas abertas por rodada (protege a fonte e o tempo da coleta). */
  maxNovas: number
  buscar: Buscar
}

export type ResultadoColeta = {
  pacotes: PacoteProposicao[]
  pautas: PautaColetada[]
  /** Fatos avulsos sobre propostas acompanhadas (vetos, publicação no DOU). */
  eventos?: EventoColetado[]
  /** Quantos itens a fonte listou (para a média de volume e o alarme de volume baixo). */
  itensListados: number
  /** Pequena amostra da resposta bruta, guardada em Coletas por 90 dias. */
  amostra: Record<string, unknown>
  avisos: string[]
}

export type Conector = {
  slug: string
  nome: string
  /** Motivo para não rodar (ex.: faltam credenciais); null quando está pronto. */
  naoConfigurado?: () => string | null
  coletar: (ctx: ContextoColeta) => Promise<ResultadoColeta>
}

export const SIGLAS_ACOMPANHADAS = ['PL', 'PLP', 'PEC', 'MPV', 'PDL', 'PLV']

export const dia = (d: Date, n = 0) => new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10)
export const identificacaoDe = (sigla: string, numero: number | string, ano: number | string) => `${sigla} ${Number(numero)}/${ano}`
