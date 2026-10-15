/**
 * Senado Federal (Dados Abertos, serviços de "processo"): respostas → formato comum.
 * Funções puras, testadas sobre respostas reais gravadas em tests/fixtures/coleta/senado.
 */
import { etapaDoOrgao, rotuloVersao, statusDaSituacao, tipoDaVersao, tipoDoAndamento, votoDe } from '../classificar'
import {
  exigir,
  type AutorColetado,
  type ParlamentarColetado,
  type PautaColetada,
  type ProposicaoColetada,
  type TipoVersao,
  type TramitacaoColetada,
  type VersaoColetada,
  type VotacaoColetada,
} from '../tipos'
import { dataBrasilia, inteiro, lista, texto } from '../util'

const FONTE = 'Senado'
export const chaveSenado = (id: number | string) => `senado:${id}`
export const chaveMateria = (codigo: number | string) => `senado:materia:${inteiro(codigo) ?? codigo}`
export const chaveSenador = (codigo: number | string) => `senado:parlamentar:${codigo}`
const fotoSenador = (codigo: number | string) => `https://www.senado.leg.br/senadores/img/fotos-oficiais/senador${codigo}.jpg`

/** "TRANSFORMADA EM NORMA JURÍDICA" → "Transformada em norma jurídica". */
export const situacaoLegivel = (s: string | undefined) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : undefined)

type Colegiado = { sigla?: string; nome?: string }
type DocAssociado = { id?: number; siglaTipo?: string; tipo?: string; identificacao?: string; descricao?: string; data?: string; url?: string }
type Informe = { id?: number; data?: string; colegiado?: Colegiado | null; descricao?: string; documentosAssociados?: DocAssociado[] }
type Autoria = { autor?: string; siglaTipo?: string; codigoParlamentar?: number; siglaPartido?: string; uf?: string; ordem?: number }
type Processo = {
  id: number
  codigoMateria?: number
  sigla: string
  numero: string
  ano: number
  identificacao?: string
  conteudo?: { ementa?: string; assuntoEspecifico?: string; assuntoGeral?: string }
  documento?: { id?: number; dataApresentacao?: string; url?: string; autoria?: Autoria[] }
  tramitando?: string
  situacaoAtual?: string
  dataSituacaoAtual?: string
  classificacoes?: { descricao?: string }[]
  autoriaIniciativa?: Autoria[]
  identificacaoProcessoInicial?: string
  outrosNumeros?: { sigla?: string; numero?: string; ano?: number }[]
  autuacoes?: { informesLegislativos?: Informe[] }[]
  ordensDoDia?: { dataSessao?: string; codigoSessao?: number }[]
}
type Relatoria = { codigoParlamentar?: number; nomeParlamentar?: string; siglaPartidoParlamentar?: string; ufParlamentar?: string; siglaColegiado?: string; dataDesignacao?: string; dataDestituicao?: string | null; urlFotoParlamentar?: string }

const identificacao = (sigla?: string, numero?: string | number, ano?: number) => {
  const n = inteiro(numero)
  return sigla && n && ano ? `${sigla} ${n}/${ano}` : undefined
}

function autoresDoSenado(autorias: Autoria[] | undefined): AutorColetado[] {
  return lista<Autoria>(autorias)
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99))
    .map((a, i): AutorColetado => {
      const papel = i === 0 ? 'autor' : 'coautor'
      if (a.siglaTipo === 'SENADOR' && a.codigoParlamentar)
        return { papel, parlamentar: { chave: chaveSenador(a.codigoParlamentar), nome: a.autor || 'Senador(a)', partido: texto(a.siglaPartido), uf: texto(a.uf), casa: 'senado', fotoUrl: fotoSenador(a.codigoParlamentar) } }
      // Deputados aparecem com código do Senado: ficam pelo nome para não duplicar a ficha da Câmara.
      const cargo = a.siglaTipo === 'DEPUTADO' ? 'Dep. ' : ''
      return { papel, nomeLivre: `${cargo}${a.autor || 'Autor não informado'}${a.siglaPartido ? ` (${a.siglaPartido})` : ''}` }
    })
}

export function relatorAtual(relatorias: unknown): AutorColetado | null {
  const r = lista<Relatoria>(relatorias)
    .filter((x) => !x.dataDestituicao && x.codigoParlamentar)
    .sort((a, b) => String(b.dataDesignacao).localeCompare(String(a.dataDesignacao)))[0]
  if (!r) return null
  return {
    papel: 'relator',
    orgao: texto(r.siglaColegiado),
    data: dataBrasilia(r.dataDesignacao),
    parlamentar: { chave: chaveSenador(r.codigoParlamentar!), nome: r.nomeParlamentar || 'Senador(a)', partido: texto(r.siglaPartidoParlamentar), uf: texto(r.ufParlamentar), casa: 'senado', fotoUrl: texto(r.urlFotoParlamentar) },
  }
}

const informes = (p: Processo) => (p.autuacoes || []).flatMap((a) => lista<Informe>(a.informesLegislativos))

export function mapearProcessoSenado(bruto: unknown, relatorias?: unknown): ProposicaoColetada {
  const p = exigir(bruto as Processo | null, FONTE, 'processo', 'detalhe')
  const id = exigir(p.id, FONTE, 'id', 'processo')
  const ultimo = informes(p)
    .filter((i) => i.data)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0]
  const relator = relatorAtual(relatorias)
  const outras = [p.identificacaoProcessoInicial, ...lista<{ sigla?: string; numero?: string; ano?: number }>(p.outrosNumeros).map((o) => identificacao(o.sigla, o.numero, o.ano))]
  const tramitando = p.tramitando === 'Sim' ? true : p.tramitando === 'Não' ? false : null
  return {
    chave: chaveSenado(id),
    casa: 'senado',
    sigla: exigir(p.sigla, FONTE, 'sigla', `processo ${id}`),
    numero: exigir(inteiro(p.numero), FONTE, 'numero', `processo ${id}`),
    ano: exigir(inteiro(p.ano), FONTE, 'ano', `processo ${id}`),
    ementa: exigir(texto(p.conteudo?.ementa), FONTE, 'conteudo.ementa', `processo ${id}`),
    dataApresentacao: dataBrasilia(p.documento?.dataApresentacao),
    statusOficial: situacaoLegivel(texto(p.situacaoAtual)),
    statusSimplificado: /veto/i.test(p.situacaoAtual || '') && /norma/i.test(p.situacaoAtual || '') ? 'norma' : statusDaSituacao(p.situacaoAtual, tramitando),
    etapa: etapaDoOrgao(ultimo?.colegiado?.sigla),
    ultimaMovimentacao: dataBrasilia(ultimo?.data) || dataBrasilia(p.dataSituacaoAtual),
    urlInteiroTeor: texto(p.documento?.url),
    urlFonte: p.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}` : undefined,
    temasOficiais: [p.conteudo?.assuntoEspecifico, ...lista<{ descricao?: string }>(p.classificacoes).map((c) => c.descricao)].filter((t): t is string => !!texto(t)),
    autoria: [...autoresDoSenado(p.autoriaIniciativa), ...(relator ? [relator] : [])],
    chavesExtras: p.codigoMateria ? [chaveMateria(p.codigoMateria)] : [],
    outrasIdentificacoes: [...new Set(outras.filter((x): x is string => !!x).map((x) => x.replace(/ 0+(\d)/, ' $1')))],
  }
}

/** Documento associado a um andamento que é texto novo da proposta. */
const VERSAO_POR_SIGLA: Record<string, TipoVersao> = {
  TEXTO_FINAL: 'redacao_final',
  PARECER_REDACAO: 'redacao_final',
  REDACAO_FINAL: 'redacao_final',
  SUBSTITUTIVO: 'substitutivo',
  EMENDA_SUBSTITUTIVA: 'substitutivo',
}

export function tipoDaVersaoSenado(d: DocAssociado): TipoVersao | null {
  if (d.siglaTipo && VERSAO_POR_SIGLA[d.siglaTipo]) return VERSAO_POR_SIGLA[d.siglaTipo]
  if (/^aut[óo]grafo/i.test(d.identificacao || '')) return 'autografo'
  if (d.siglaTipo === 'EMENDA' || d.siglaTipo === 'PARECER' || d.siglaTipo === 'RELATORIO') return /substitutiv/i.test(`${d.identificacao} ${d.descricao}`) ? 'substitutivo' : null
  return tipoDaVersao(d.identificacao, d.tipo)
}

export function mapearInformesSenado(bruto: unknown) {
  const p = exigir(bruto as Processo | null, FONTE, 'processo', 'informes')
  const chave = chaveSenado(p.id)
  const tramitacoes: TramitacaoColetada[] = []
  const versoes: VersaoColetada[] = []
  for (const i of informes(p)) {
    const data = dataBrasilia(i.data)
    const descricao = texto(i.descricao)
    if (!i.id || !data || !descricao) continue
    const docs = lista<DocAssociado>(i.documentosAssociados)
    tramitacoes.push({
      chave: `senado:informe:${i.id}`,
      proposicao: chave,
      data,
      orgao: texto(i.colegiado?.sigla),
      descricao,
      tipoEvento: tipoDoAndamento(descricao),
      urlDocumento: texto(docs[0]?.url),
    })
    for (const d of docs) {
      const tipo = tipoDaVersaoSenado(d)
      if (tipo && d.id && d.url) versoes.push({ chave: `senado:doc:${d.id}`, proposicao: chave, data: dataBrasilia(d.data) || data, tipo, rotulo: rotuloVersao(tipo, texto(i.colegiado?.sigla)), url: d.url })
    }
  }
  if (p.documento?.id && p.documento.url) {
    versoes.push({ chave: `senado:doc:${p.documento.id}`, proposicao: chave, data: dataBrasilia(p.documento.dataApresentacao) || new Date(Date.UTC(p.ano, 0, 1, 15)).toISOString(), tipo: 'original', rotulo: 'Texto original', url: p.documento.url })
  }
  // A mesma versão pode aparecer em dois andamentos: fica a primeira.
  // Um andamento pode aparecer em mais de uma autuação, e a mesma versão em dois andamentos: fica o primeiro.
  const primeiro = <T extends { chave: string }>(l: T[]) => [...new Map(l.reverse().map((x) => [x.chave, x])).values()].reverse()
  return { tramitacoes: primeiro(tramitacoes), versoes: primeiro(versoes) }
}

type VotoSenado = { codigoParlamentar?: number; nomeParlamentar?: string; siglaPartidoParlamentar?: string; siglaUFParlamentar?: string; siglaVotoParlamentar?: string }
type VotacaoSenado = {
  codigoSessaoVotacao?: number
  idProcesso?: number
  dataSessao?: string
  descricaoVotacao?: string
  resultadoVotacao?: string
  votacaoSecreta?: string
  totalVotosSim?: number | null
  totalVotosNao?: number | null
  totalVotosAbstencao?: number | null
  votos?: VotoSenado[]
}

export function senadorDoVoto(v: VotoSenado): ParlamentarColetado {
  return { chave: chaveSenador(v.codigoParlamentar!), nome: v.nomeParlamentar || 'Senador(a)', partido: texto(v.siglaPartidoParlamentar), uf: texto(v.siglaUFParlamentar), casa: 'senado', fotoUrl: fotoSenador(v.codigoParlamentar!) }
}

export function mapearVotacoesSenado(bruto: unknown): VotacaoColetada[] {
  return lista<VotacaoSenado>(bruto).flatMap((v): VotacaoColetada[] => {
    if (!v.codigoSessaoVotacao || !v.idProcesso) return []
    const secreta = v.votacaoSecreta === 'S'
    const votos = secreta ? [] : lista<VotoSenado>(v.votos).filter((x) => x.codigoParlamentar).map((x) => ({ parlamentar: senadorDoVoto(x), voto: votoDe(x.siglaVotoParlamentar) }))
    const contar = (voto: string) => votos.filter((x) => x.voto === voto).length
    return [
      {
        chave: `senado:votacao:${v.codigoSessaoVotacao}`,
        proposicao: chaveSenado(v.idProcesso),
        data: exigir(dataBrasilia(v.dataSessao), FONTE, 'dataSessao', `votação ${v.codigoSessaoVotacao}`),
        orgao: 'PLEN',
        descricao: texto(v.descricaoVotacao),
        resultado: v.resultadoVotacao === 'A' ? 'Aprovada' : v.resultadoVotacao === 'R' ? 'Rejeitada' : texto(v.resultadoVotacao),
        placarSim: v.totalVotosSim ?? (votos.length ? contar('sim') : undefined),
        placarNao: v.totalVotosNao ?? (votos.length ? contar('nao') : undefined),
        placarAbstencao: v.totalVotosAbstencao ?? (votos.length ? contar('abstencao') : undefined),
        votos,
      },
    ]
  })
}

type SessaoPlenario = { Data?: string; Hora?: string; SituacaoSessao?: string; TipoSessao?: string; Casa?: string; CodigoSessao?: string; Materias?: { Materia?: unknown } }
type MateriaPauta = { CodigoMateria?: string; Apreciacao?: string; DescricaoIdentificacaoMateria?: string }

/** Agenda do Plenário (Senado e Congresso). As matérias vêm pelo código antigo ("CodigoMateria"). */
export function mapearAgendaPlenarioSenado(bruto: unknown): PautaColetada[] {
  const sessoes = lista<SessaoPlenario>((bruto as { AgendaPlenario?: { Sessoes?: { Sessao?: unknown } } })?.AgendaPlenario?.Sessoes?.Sessao)
  return sessoes.flatMap((s): PautaColetada[] => {
    if (/cancelad|n[ãa]o realizada/i.test(s.SituacaoSessao || '')) return []
    const data = dataBrasilia(s.Data && s.Hora ? `${s.Data}T${s.Hora}` : s.Data)
    if (!data) return []
    const plenario = s.Casa === 'CN' ? 'do Congresso' : 'do Plenário do Senado'
    return lista<MateriaPauta>(s.Materias?.Materia)
      .filter((m) => m.CodigoMateria)
      .map((m) => ({
        chave: `senado:pauta:${s.CodigoSessao}:${inteiro(m.CodigoMateria)}`,
        proposicao: chaveMateria(m.CodigoMateria!),
        data,
        orgao: s.Casa === 'CN' ? 'CN' : 'PLEN',
        descricao: `Na pauta ${plenario}${m.Apreciacao ? ` (${texto(m.Apreciacao)})` : ''}`,
      }))
  })
}

type Reuniao = { codigo?: string; dataInicio?: string; situacao?: string; colegiadoCriador?: { sigla?: string }; partes?: unknown }
type Parte = { isDeliberativa?: string; finalidade?: string; itens?: unknown }
type ItemReuniao = { doma?: { idProcesso?: string } }

/** Agenda das comissões: itens deliberativos com o processo indicado. */
export function mapearAgendaComissoesSenado(bruto: unknown): PautaColetada[] {
  const reunioes = lista<Reuniao>((bruto as { AgendaReuniao?: { reunioes?: { reuniao?: unknown } } })?.AgendaReuniao?.reunioes?.reuniao)
  return reunioes.flatMap((r): PautaColetada[] => {
    const data = dataBrasilia(r.dataInicio)
    if (!r.codigo || !data || /cancelad/i.test(r.situacao || '')) return []
    const orgao = texto(r.colegiadoCriador?.sigla)
    return lista<Parte>(r.partes)
      .filter((p) => p.isDeliberativa !== 'false')
      .flatMap((p) => lista<ItemReuniao>(p.itens))
      .filter((it) => it.doma?.idProcesso)
      .map((it) => ({
        chave: `senado:reuniao:${r.codigo}:${it.doma!.idProcesso}`,
        proposicao: chaveSenado(it.doma!.idProcesso!),
        data,
        orgao,
        descricao: `Na pauta da ${orgao || 'comissão'}`,
      }))
  })
}

/** Item da busca (/processo?numdias=…): o bastante para decidir se vale abrir a ficha. */
export type ResumoSenado = { id: number; identificacao?: string; ementa?: string; tipoDocumento?: string; dataUltimaAtualizacao?: string; codigoMateria?: number }
export const resumosSenado = (bruto: unknown) => lista<ResumoSenado>(bruto).filter((x) => x.id)
