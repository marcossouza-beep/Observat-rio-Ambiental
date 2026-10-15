/**
 * Formato comum entregue por todos os conectores (docs/APIS.md, seção 4).
 * As chaves ("camara:2345678", "senado:processo:123") são estáveis: coletar duas vezes não duplica nada.
 */

export type Casa = 'camara' | 'senado' | 'congresso' | 'presidencia'

export type TipoEvento =
  | 'apresentacao'
  | 'pauta'
  | 'urgencia'
  | 'parecer_relator'
  | 'substitutivo'
  | 'votacao'
  | 'aprovacao'
  | 'sancao'
  | 'veto'
  | 'arquivamento'
  | 'outro'

export type StatusSimplificado = 'em_tramitacao' | 'aprovada' | 'norma' | 'vetada' | 'arquivada' | 'rejeitada'
export type Regime = 'normal' | 'prioridade' | 'urgencia'
export type TipoVersao = 'original' | 'substitutivo' | 'parecer_relator' | 'emenda_aglutinativa' | 'redacao_final' | 'autografo' | 'norma'
export type Voto = 'sim' | 'nao' | 'abstencao' | 'obstrucao' | 'ausente' | 'outro'

export type ParlamentarColetado = {
  chave: string
  nome: string
  partido?: string
  uf?: string
  casa: 'camara' | 'senado'
  fotoUrl?: string
}

export type AutorColetado = { parlamentar?: ParlamentarColetado; nomeLivre?: string; papel: 'autor' | 'coautor' | 'relator'; orgao?: string; data?: string }

export type ProposicaoColetada = {
  chave: string
  casa: Casa
  sigla: string
  numero: number
  ano: number
  ementa: string
  dataApresentacao?: string
  statusOficial?: string
  statusSimplificado?: StatusSimplificado
  etapa?: string
  regime?: Regime
  ultimaMovimentacao?: string
  urlInteiroTeor?: string
  urlFonte?: string
  /** Temas oficiais da casa (ex.: "Meio Ambiente e Desenvolvimento Sustentável"). */
  temasOficiais?: string[]
  autoria?: AutorColetado[]
  /** Outras chaves da mesma proposição na fonte (ex.: código antigo da matéria no Senado). */
  chavesExtras?: string[]
  /** Outros números da mesma proposta (ex.: "PL 3729/2004", número na casa de origem). Servem para juntar Câmara e Senado. */
  outrasIdentificacoes?: string[]
}

export type TramitacaoColetada = {
  chave: string
  proposicao: string
  data: string
  orgao?: string
  descricao: string
  tipoEvento: TipoEvento
  /** Documento citado no andamento (parecer, substitutivo, redação final…). */
  urlDocumento?: string
}

export type VersaoColetada = {
  chave: string
  proposicao: string
  data: string
  tipo: TipoVersao
  rotulo: string
  url: string
  /** Texto integral, quando a fonte já entrega (ex.: Diário Oficial). Dos PDFs, é extraído depois. */
  texto?: string
}

export type VotacaoColetada = {
  chave: string
  proposicao: string
  data: string
  orgao?: string
  descricao?: string
  resultado?: string
  placarSim?: number
  placarNao?: number
  placarAbstencao?: number
  orientacoes?: { bancada: string; orientacao: string }[]
  votos?: { parlamentar: ParlamentarColetado; voto: Voto }[]
}

/** Item de pauta: vira tramitação "pauta" com a data da reunião (alimenta "Em votação esta semana"). */
export type PautaColetada = {
  chave: string
  proposicao: string
  data: string
  orgao?: string
  descricao: string
}

/** Tudo o que um conector sabe sobre uma proposição numa rodada. */
export type PacoteProposicao = {
  proposicao: ProposicaoColetada
  tramitacoes: TramitacaoColetada[]
  versoes: VersaoColetada[]
  votacoes: VotacaoColetada[]
}

/** Campo obrigatório ausente: a fonte mudou de formato. O conector para e avisa (docs/ENTREGA.md). */
export class ErroFormato extends Error {
  constructor(
    public fonte: string,
    public campo: string,
    public onde: string,
  ) {
    super(`Formato da ${fonte} mudou: campo "${campo}" ausente em ${onde}`)
  }
}

export function exigir<T>(valor: T | null | undefined, fonte: string, campo: string, onde: string): T {
  if (valor === null || valor === undefined || valor === '') throw new ErroFormato(fonte, campo, onde)
  return valor
}

/**
 * Fato avulso sobre uma proposta que o site já acompanha (veto, lei publicada no Diário Oficial…).
 * Só é gravado se a proposta for encontrada por uma das chaves ou números.
 */
export type EventoColetado = {
  alvo: { chaves: string[]; identificacoes?: string[] }
  /** Chaves que passam a apontar para a proposta (ex.: o código do veto, para a agenda do Congresso). */
  chavesExtras?: string[]
  tramitacoes: Omit<TramitacaoColetada, 'proposicao'>[]
  versoes?: Omit<VersaoColetada, 'proposicao'>[]
}
