/**
 * Diário Oficial do Legislativo da Bahia (egbanet.egba.ba.gov.br/alba) → formato comum.
 * O site da Alba só tem proposições até 01/08/2025 e o sistema novo (nopapercloud) recusa acesso de fora pelo Cloudflare.
 * O diário sai todo dia útil, com a API de edições da EGBA (JSON) e o PDF completo. Cada matéria vem entre marcadores
 * "<#E.G.B#id#página#...>" e "<#E.G.B#id#página#.../>". Em "EXPEDIENTE DESPACHADO PELA PRESIDÊNCIA" saem os projetos
 * apresentados, com cabeçalho ("PROJETO DE LEI Nº 26.393/2026"), ementa, texto, justificativa, assinatura e as comissões.
 * Funções puras, testadas sobre edição real gravada em tests/fixtures/coleta/alba/.
 *
 * Chaves: alba:<SIGLA>-<número>-<ano> (proposta), alba:pub:<edição>:<proposta>, alba:materia:<id da matéria>,
 * alba:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import { tipoDoAndamento } from '../classificar'
import type { AutorColetado, EventoColetado, PacoteProposicao, TipoEvento } from '../tipos'

export const EGBA = 'https://egbanet.egba.ba.gov.br'

export type EdicaoAlba = {
  id: number
  numero: number
  data: string
  url: string
  suplemento: boolean
}

/** Itens de /apifront/portal/edicoes/ultimas_edicoes.json?subtheme=alba → edições ("16/10/2026" → 2026-10-16). */
export function edicoesEgba(json: unknown): EdicaoAlba[] {
  const itens = (json as { itens?: Record<string, unknown>[] } | null)?.itens
  if (!Array.isArray(itens)) return []
  return itens
    .map((i) => {
      const d = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(i.data || ''))
      const id = Number(i.id)
      if (!d || !id) return null
      return {
        id,
        numero: Number(i.numero) || 0,
        data: `${d[3]}-${d[2]}-${d[1]}`,
        url: `${EGBA}/alba/portal/edicoes/download/${id}`,
        suplemento: Number(i.suplemento) === 1,
      }
    })
    .filter((e): e is EdicaoAlba => !!e)
}

export type MateriaAlba = { id: number; texto: string }

/** Linhas que não são da matéria: cabeçalho de página e sumário ("ATOS DA MESA DIRETORA ����...4"). */
const lixo = (l: string) =>
  /�{3,}|^SALVADOR, BAHIA, .+ DI[ÁA]RIO OFICIAL/.test(l) || /^SAP - DEPARTAMENTO/.test(l)

/** Matérias da edição, na ordem do diário. */
export function materiasDoDiario(texto: string): MateriaAlba[] {
  const r: MateriaAlba[] = []
  for (const m of texto.matchAll(/<#E\.G\.B#(\d+)#\d+#\d+>([\s\S]*?)<#E\.G\.B#\1#\d+#\d+\/>/g)) {
    const corpo = m[2]
      .replace(/<#E\.G\.B#[^>]*>/g, ' ')
      .split('\n')
      .filter((l) => !lixo(l.trim()))
      .join('\n')
      .trim()
    if (corpo) r.push({ id: Number(m[1]), texto: corpo })
  }
  return r
}

const SIGLAS: [RegExp, string][] = [
  [/^LEI COMPLEMENTAR$/, 'PLC'],
  [/^LEI$/, 'PL'],
  [/^EMENDA (?:À|A) CONSTITUI[ÇC][ÃA]O$/, 'PEC'],
  [/^DECRETO LEGISLATIVO$/, 'PDL'],
]

// "PROJETO DE LEI Nº 26.393/2026" (o número da Alba é contínuo, com ponto de milhar)
const CABECALHO =
  /^PROJETO DE (LEI COMPLEMENTAR|LEI|EMENDA (?:À|A) CONSTITUI[ÇC][ÃA]O|DECRETO LEGISLATIVO)\s*N\s*[º°o.]\s*([\d.]{1,7})\s*\/\s*(\d{4})\s*/
const MENCAO =
  /PROJETO DE (LEI COMPLEMENTAR|LEI|EMENDA (?:À|A) CONSTITUI[ÇC][ÃA]O|DECRETO LEGISLATIVO)\s*N\s*[º°o.]\s*([\d.]{1,7})\s*\/\s*(\d{4})/gi

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

function autorDaMateria(cabecalho: string | undefined, texto: string): AutorColetado | null {
  if (/GOVERNADOR/i.test(texto.slice(-1500)) && !/Deputad[oa]\s/i.test(texto.slice(-600))) {
    const g = /([A-ZÁ-Ú][A-ZÁ-Ú ]{5,60}?)\s+Governador/.exec(texto.slice(-1500))
    return {
      papel: 'autor',
      nomeLivre: g ? `${capitalizar(g[1].trim())} (Governador do Estado)` : 'Governador do Estado',
    }
  }
  // No cabeçalho ("DEPUTADA CLÁUDIA OLIVEIRA - Declara...") ou na assinatura ("Deputado FELIPE DUARTE (Às Comissões...")
  const nomes = [
    cabecalho
      ? /^DEPUTAD[OA]S?\s+([A-ZÁ-Ú][A-ZÁ-Ú .'-]{2,60}?)\s+-\s/.exec(cabecalho)?.[1]
      : undefined,
    [...texto.matchAll(/Deputad[oa]\s+([A-ZÁ-Ú][A-ZÁ-Ú .'-]{2,60}?)\s*(?:\(|\n|$)/g)].at(-1)?.[1],
  ]
  const nome = nomes.find(Boolean)
  if (!nome) return null
  const n = capitalizar(nome.trim())
  return {
    papel: 'autor',
    parlamentar: { chave: `alba:parlamentar:${slugify(n)}`, nome: n, uf: 'BA', casa: 'assembleia' },
  }
}

export type ProjetoAlba = {
  materia: number
  sigla: string
  numero: number
  ano: number
  ementa: string
  texto: string
  comissoes?: string
  autor: AutorColetado | null
}

/** Projeto apresentado (matéria que começa pelo cabeçalho do projeto); outras matérias devolvem null. */
export function projetoDaMateria(m: MateriaAlba): ProjetoAlba | null {
  const c = CABECALHO.exec(m.texto)
  if (!c) return null
  const sigla = SIGLAS.find(([re]) => re.test(c[1].replace(/\s+/g, ' ')))?.[1]
  const numero = Number(c[2].replace(/\./g, ''))
  const ano = Number(c[3])
  if (!sigla || !numero || ano < 1990 || ano > 2100) return null
  const resto = m.texto.slice(c[0].length)
  const linha = resto.split('\n')[0].trim()
  const ementa = linha
    .replace(/^DEPUTAD[OA]S?\s+[A-ZÁ-Ú][A-ZÁ-Ú .'-]{2,60}?\s+-\s+/, '')
    .slice(0, 800)
  if (ementa.length < 15) return null
  const comissoes = /\((À|Às) Comiss(?:ão|ões) de:?\s*([^)]+)\)/
    .exec(m.texto)?.[2]
    ?.replace(/\.$/, '')
    .trim()
  return {
    materia: m.id,
    sigla,
    numero,
    ano,
    ementa,
    texto: resto.slice(0, 15_000).trim(),
    comissoes,
    autor: autorDaMateria(linha, m.texto),
  }
}

export const chaveBA = (p: { sigla: string; numero: number; ano: number }) =>
  `alba:${p.sigla}-${p.numero}-${p.ano}`
const idBA = (p: { sigla: string; numero: number; ano: number }) =>
  `${p.sigla}-${p.numero}-${p.ano}`
const nEdicao = (e: EdicaoAlba) => e.numero.toLocaleString('pt-BR')

/** Projeto do diário → pacote no formato comum: publicação, despacho às comissões e texto original. */
export function pacoteDoProjetoAlba(p: ProjetoAlba, e: EdicaoAlba): PacoteProposicao {
  const chave = chaveBA(p)
  const id = idBA(p)
  const tramitacoes: PacoteProposicao['tramitacoes'] = [
    {
      chave: `alba:pub:${e.id}:${id}`,
      proposicao: chave,
      data: e.data,
      orgao: 'Presidência',
      descricao: `Apresentado: expediente despachado pela Presidência (Diário do Legislativo nº ${nEdicao(e)})`,
      tipoEvento: 'apresentacao',
      urlDocumento: e.url,
    },
  ]
  if (p.comissoes)
    tramitacoes.push({
      chave: `alba:comissoes:${e.id}:${id}`,
      proposicao: chave,
      data: e.data,
      orgao: 'Comissões',
      descricao: `Distribuído às Comissões de ${p.comissoes}`,
      tipoEvento: 'outro',
      urlDocumento: e.url,
    })
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'BA',
      sigla: p.sigla,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: e.data,
      statusOficial: `Publicado no Diário do Legislativo nº ${nEdicao(e)}${p.comissoes ? `; nas comissões` : ''}`,
      statusSimplificado: 'em_tramitacao',
      etapa: p.comissoes ? 'Comissões' : undefined,
      ultimaMovimentacao: e.data,
      urlInteiroTeor: e.url,
      urlFonte: e.url,
      autoria: p.autor ? [p.autor] : [],
    },
    tramitacoes,
    versoes: [
      {
        chave: `alba:texto:${id}`,
        proposicao: chave,
        data: e.data,
        tipo: 'original',
        rotulo: `Texto publicado no Diário do Legislativo nº ${nEdicao(e)}`,
        url: e.url,
        texto: p.texto,
      },
    ],
    votacoes: [],
  }
}

/** Projetos citados no título de outras matérias (pareceres, ordem do dia, redação final, autógrafos). */
export function mencoesDaMateria(
  m: MateriaAlba,
): { sigla: string; numero: number; ano: number; titulo: string }[] {
  if (CABECALHO.test(m.texto)) return []
  const titulo = m.texto.split('\n')[0].slice(0, 300)
  const r = new Map<string, { sigla: string; numero: number; ano: number; titulo: string }>()
  for (const c of titulo.matchAll(MENCAO)) {
    const sigla = SIGLAS.find(([re]) => re.test(c[1].toUpperCase().replace(/\s+/g, ' ')))?.[1]
    const numero = Number(c[2].replace(/\./g, ''))
    if (sigla && numero)
      r.set(`${sigla}-${numero}-${c[3]}`, {
        sigla,
        numero,
        ano: Number(c[3]),
        titulo: titulo.trim(),
      })
  }
  return [...r.values()]
}

/** Tipo do andamento pelo título da matéria do diário. */
export function eventoAlba(titulo: string): TipoEvento {
  const t = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/PARECER/.test(t)) return 'parecer_relator'
  if (/ORDEM DO DIA|PAUTA/.test(t)) return 'pauta'
  if (/VETO/.test(t)) return 'veto'
  if (/REDACAO FINAL|AUTOGRAFO|APROVAD/.test(t)) return 'aprovacao'
  if (/SUBSTITUTIVO/.test(t)) return 'substitutivo'
  return tipoDoAndamento(titulo)
}

/** Matéria que cita proposta acompanhada → andamento (o tipo sai do título: parecer, aprovação, redação final...). */
export function eventoDaMencao(
  a: { sigla: string; numero: number; ano: number; titulo: string },
  m: MateriaAlba,
  e: EdicaoAlba,
): EventoColetado {
  return {
    alvo: {
      chaves: [chaveBA(a)],
      identificacoes: [`${a.sigla} ${a.numero}/${a.ano}`],
      esfera: 'estadual',
      uf: 'BA',
    },
    tramitacoes: [
      {
        chave: `alba:materia:${m.id}:${idBA(a)}`,
        data: e.data,
        descricao: `Diário do Legislativo nº ${nEdicao(e)}: ${a.titulo.slice(0, 240)}`,
        tipoEvento: eventoAlba(a.titulo),
        urlDocumento: e.url,
      },
    ],
  }
}
