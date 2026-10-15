/**
 * Câmara dos Deputados (API v2): respostas → formato comum. Funções puras, testadas sobre respostas reais
 * gravadas em tests/fixtures/coleta/camara.
 */
import { etapaDoOrgao, regimeDe, rotuloVersao, statusDaSituacao, tipoDaVersao, tipoDoAndamento, votoDe } from '../classificar'
import {
  exigir,
  type AutorColetado,
  type ParlamentarColetado,
  type PautaColetada,
  type ProposicaoColetada,
  type TipoEvento,
  type TramitacaoColetada,
  type VersaoColetada,
  type VotacaoColetada,
} from '../tipos'
import { dataBrasilia, inteiro, lista, placarDaDescricao, texto } from '../util'

const FONTE = 'Câmara'
export const chaveCamara = (id: number | string) => `camara:${id}`
export const chaveDeputado = (id: number | string) => `camara:deputado:${id}`
const idDaUri = (uri: unknown) => inteiro(/\/(\d+)$/.exec(String(uri || ''))?.[1])
const codteor = (url: unknown) => /codteor=(\d+)/.exec(String(url || ''))?.[1]

/** Tipos de andamento (tabela /referencias/proposicoes/codTipoTramitacao) que o Radar reconhece pelo código. */
const POR_CODIGO: Record<string, TipoEvento> = {
  '100': 'apresentacao',
  '300': 'apresentacao',
  '150': 'pauta',
  '151': 'pauta',
  '196': 'urgencia',
  '215': 'urgencia',
  '322': 'parecer_relator',
  '323': 'parecer_relator',
  '325': 'parecer_relator',
  '326': 'parecer_relator',
  '330': 'parecer_relator',
  '336': 'parecer_relator',
  '210': 'parecer_relator',
  '231': 'votacao',
  '232': 'votacao',
  '233': 'votacao',
  '1231': 'votacao',
  '237': 'aprovacao',
  '238': 'aprovacao',
  '239': 'aprovacao',
  '244': 'aprovacao',
  '127': 'aprovacao',
  '609': 'aprovacao',
  '251': 'sancao',
  '1012': 'sancao',
  '1013': 'veto',
  '134': 'arquivamento',
  '502': 'arquivamento',
  '1024': 'arquivamento',
}

type Tramitacao = {
  dataHora?: string
  sequencia?: number
  siglaOrgao?: string
  regime?: string
  descricaoTramitacao?: string
  codTipoTramitacao?: string
  descricaoSituacao?: string
  despacho?: string
  url?: string | null
}

export function tipoDoAndamentoCamara(t: Tramitacao): TipoEvento {
  const pelaRegra = tipoDoAndamento(t.descricaoTramitacao, t.despacho)
  const cod = String(t.codTipoTramitacao ?? '')
  // "Aprovação de Proposição (Plenário)" e "Aprovação" valem também para emendas e destaques:
  // só é aprovação da proposta quando o despacho diz isso; senão é uma votação.
  if (cod === '1235' || cod === '240') return pelaRegra === 'aprovacao' || pelaRegra === 'urgencia' ? pelaRegra : 'votacao'
  // O despacho pode ser mais específico que o código (ex.: parecer "com substitutivo").
  if (POR_CODIGO[cod] === 'parecer_relator' && pelaRegra === 'substitutivo') return 'substitutivo'
  return POR_CODIGO[cod] ?? pelaRegra
}

type Ficha = {
  id: number
  siglaTipo: string
  numero: number
  ano: number
  ementa: string
  dataApresentacao?: string
  urlInteiroTeor?: string | null
  statusProposicao?: Tramitacao
}

type Autor = { uri?: string | null; nome?: string; tipo?: string; codTipo?: number; ordemAssinatura?: number; proponente?: number }

export function mapearAutoresCamara(autores: unknown): AutorColetado[] {
  return lista<Autor>(autores)
    .filter((a) => a.proponente !== 0)
    .sort((a, b) => (a.ordemAssinatura ?? 99) - (b.ordemAssinatura ?? 99))
    .map((a, i): AutorColetado => {
      const id = /deputados\//.test(a.uri || '') ? idDaUri(a.uri) : undefined
      const papel = i === 0 ? 'autor' : 'coautor'
      return id
        ? { papel, parlamentar: { chave: chaveDeputado(id), nome: exigir(texto(a.nome), FONTE, 'nome', 'autores'), casa: 'camara' } }
        : { papel, nomeLivre: texto(a.nome) || 'Autor não informado' }
    })
}

export function mapearFichaCamara(fichaBruta: unknown, extra: { autores?: unknown; temas?: unknown } = {}): ProposicaoColetada {
  const f = exigir(fichaBruta as Ficha | null, FONTE, 'dados', 'ficha')
  const id = exigir(f.id, FONTE, 'id', 'ficha')
  const st = f.statusProposicao || {}
  // A ementa às vezes traz a "NOVA EMENTA" depois da original: fica a mais recente.
  const ementaBruta = exigir(texto(f.ementa), FONTE, 'ementa', `ficha ${id}`)
  const ementa = ementaBruta.split(/NOVA EMENTA:\s*/i).pop()!.trim()
  return {
    chave: chaveCamara(id),
    casa: 'camara',
    sigla: exigir(f.siglaTipo, FONTE, 'siglaTipo', `ficha ${id}`),
    numero: exigir(inteiro(f.numero), FONTE, 'numero', `ficha ${id}`),
    ano: exigir(inteiro(f.ano), FONTE, 'ano', `ficha ${id}`),
    ementa,
    dataApresentacao: dataBrasilia(f.dataApresentacao),
    statusOficial: texto(st.descricaoSituacao),
    statusSimplificado: statusDaSituacao(st.descricaoSituacao),
    etapa: etapaDoOrgao(st.siglaOrgao),
    regime: regimeDe(st.regime),
    ultimaMovimentacao: dataBrasilia(st.dataHora),
    urlInteiroTeor: texto(f.urlInteiroTeor),
    urlFonte: `https://www.camara.leg.br/propostas-legislativas/${id}`,
    temasOficiais: lista<{ tema?: string }>(extra.temas)
      .map((t) => texto(t.tema))
      .filter((t): t is string => !!t),
    autoria: extra.autores ? mapearAutoresCamara(extra.autores) : undefined,
  }
}

/** Andamentos → tramitações; documentos de texto novo (substitutivo, redação final…) → versões. */
export function mapearTramitacoesCamara(chaveProposicao: string, bruto: unknown) {
  const tramitacoes: TramitacaoColetada[] = []
  const versoes: VersaoColetada[] = []
  const idProp = chaveProposicao.split(':').pop()
  for (const t of lista<Tramitacao>(bruto)) {
    const data = dataBrasilia(t.dataHora)
    if (!data || t.sequencia == null) continue
    const tipoEvento = tipoDoAndamentoCamara(t)
    const descricao = [texto(t.descricaoTramitacao), texto(t.despacho)].filter(Boolean).join(': ') || 'Andamento'
    tramitacoes.push({
      chave: `camara:${idProp}:tram:${t.sequencia}`,
      proposicao: chaveProposicao,
      data,
      orgao: texto(t.siglaOrgao),
      descricao,
      tipoEvento,
      urlDocumento: texto(t.url),
    })
    const teor = codteor(t.url)
    const tipoVersao = teor ? tipoDaVersao(t.despacho, t.descricaoTramitacao) : null
    if (teor && tipoVersao) {
      versoes.push({ chave: `camara:teor:${teor}`, proposicao: chaveProposicao, data, tipo: tipoVersao, rotulo: rotuloVersao(tipoVersao, texto(t.siglaOrgao)), url: t.url! })
    }
  }
  // O mesmo documento pode aparecer em mais de um andamento: fica o primeiro.
  const primeiro = <T extends { chave: string }>(l: T[]) => [...new Map(l.reverse().map((x) => [x.chave, x])).values()].reverse()
  return { tramitacoes: primeiro(tramitacoes), versoes: primeiro(versoes) }
}

/** Texto original (inteiro teor da ficha). */
export function versaoOriginalCamara(p: ProposicaoColetada): VersaoColetada | null {
  const teor = codteor(p.urlInteiroTeor)
  if (!teor || !p.urlInteiroTeor) return null
  return { chave: `camara:teor:${teor}`, proposicao: p.chave, data: p.dataApresentacao || new Date(Date.UTC(p.ano, 0, 1, 15)).toISOString(), tipo: 'original', rotulo: 'Texto original', url: p.urlInteiroTeor }
}

type VotacaoBruta = { id: string; data?: string; dataHoraRegistro?: string; siglaOrgao?: string; descricao?: string; aprovacao?: number | null }
type VotoBruto = { tipoVoto?: string; deputado_?: { id: number; nome: string; siglaPartido?: string; siglaUf?: string; urlFoto?: string } }
type OrientacaoBruta = { siglaPartidoBloco?: string; orientacaoVoto?: string; siglaBancada?: string; orientacao?: string }

export function deputadoDoVoto(d: NonNullable<VotoBruto['deputado_']>): ParlamentarColetado {
  return { chave: chaveDeputado(d.id), nome: d.nome, partido: texto(d.siglaPartido), uf: texto(d.siglaUf), casa: 'camara', fotoUrl: texto(d.urlFoto) }
}

export function mapearVotacaoCamara(chaveProposicao: string, votacao: unknown, votos?: unknown, orientacoes?: unknown): VotacaoColetada {
  const v = exigir(votacao as VotacaoBruta | null, FONTE, 'votação', chaveProposicao)
  const id = exigir(v.id, FONTE, 'id', 'votação')
  const listaVotos = lista<VotoBruto>(votos)
    .filter((x) => x.deputado_?.id)
    .map((x) => ({ parlamentar: deputadoDoVoto(x.deputado_!), voto: votoDe(x.tipoVoto) }))
  const doTexto = placarDaDescricao(v.descricao)
  const contar = (voto: string) => listaVotos.filter((x) => x.voto === voto).length
  return {
    chave: `camara:votacao:${id}`,
    proposicao: chaveProposicao,
    data: exigir(dataBrasilia(v.dataHoraRegistro || v.data), FONTE, 'data', `votação ${id}`),
    orgao: texto(v.siglaOrgao),
    descricao: texto(v.descricao),
    resultado: v.aprovacao === 1 ? 'Aprovada' : v.aprovacao === 0 ? 'Rejeitada' : undefined,
    placarSim: listaVotos.length ? contar('sim') : doTexto.placarSim,
    placarNao: listaVotos.length ? contar('nao') : doTexto.placarNao,
    placarAbstencao: listaVotos.length ? contar('abstencao') : doTexto.placarAbstencao,
    orientacoes: lista<OrientacaoBruta>(orientacoes)
      .map((o) => ({ bancada: texto(o.siglaPartidoBloco || o.siglaBancada) || '', orientacao: texto(o.orientacaoVoto || o.orientacao) || '' }))
      .filter((o) => o.bancada && o.orientacao),
    votos: listaVotos,
  }
}

/** Votação nominal (com votos individuais) só quando a descrição traz placar. */
export const votacaoNominal = (v: { descricao?: string }) => /Sim:\s*\d+/i.test(v.descricao || '')

type Evento = { id: number; dataHoraInicio?: string; situacao?: string; descricaoTipo?: string; orgaos?: { sigla?: string }[] }
type ItemPauta = {
  ordem?: number
  situacaoItem?: string | null
  proposicao_?: { id?: number; siglaTipo?: string } | null
  proposicaoRelacionada_?: { id?: number } | null
}

/** Eventos que deliberam (sessões e reuniões deliberativas) e não foram cancelados. */
export const eventoDeliberativo = (e: Evento) => /deliberativ/i.test(e.descricaoTipo || '') && !/n[ãa]o deliberativ/i.test(e.descricaoTipo || '') && !/cancelad/i.test(e.situacao || '')

export function mapearPautaCamara(evento: unknown, itens: unknown): PautaColetada[] {
  const e = evento as Evento
  const data = dataBrasilia(e?.dataHoraInicio)
  if (!e?.id || !data || !eventoDeliberativo(e)) return []
  const orgao = e.orgaos?.map((o) => o.sigla).filter(Boolean).join('/') || undefined
  return lista<ItemPauta>(itens).flatMap((it): PautaColetada[] => {
    if (/retirad|adiad/i.test(it.situacaoItem || '')) return []
    // O item de pauta costuma ser o parecer (PRL); a proposta principal vem em "proposicaoRelacionada_".
    const alvo = it.proposicaoRelacionada_?.id ?? it.proposicao_?.id
    if (!alvo) return []
    return [
      {
        chave: `camara:pauta:${e.id}:${alvo}`,
        proposicao: chaveCamara(alvo),
        data,
        orgao,
        descricao: `Na pauta ${orgao === 'PLEN' ? 'do Plenário' : `da ${orgao}`} (${e.descricaoTipo})`,
      },
    ]
  })
}
