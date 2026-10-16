/**
 * Diário da Assembleia Legislativa de Roraima (diarios.al.rr.leg.br) → formato comum.
 * O SAPL da ALE-RR recusa o acesso de fora; o diário publica, quase todo dia, o texto integral dos projetos
 * apresentados (cabeçalho "PROJETO DE LEI Nº 149/2026", ementa, artigos e assinatura) e os autógrafos.
 * Funções puras, testadas sobre edições reais gravadas em tests/fixtures/coleta/alerr/.
 *
 * Chaves: alerr:<SIGLA>-<número>-<ano> (proposta), alerr:pub:<edição>:<proposta> (publicação no diário),
 * alerr:autografo:<edição>:<proposta>, alerr:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import type { AutorColetado, EventoColetado, PacoteProposicao } from '../tipos'

export const DIARIO_RR = 'https://diarios.al.rr.leg.br'

export type Edicao = { numero: number; data: string; url: string }

/** "DIARIO-ALE-RR-ED.-4747-13.10.2026" → edição 4747 de 2026-10-13. */
export function edicaoDe(titulo: string, url: string): Edicao | null {
  const m = /ED\.?-?\s*(\d{3,5})\D+(\d{2})\.(\d{2})\.(\d{4})/i.exec(titulo) || /ED\.?-?\s*(\d{3,5})\D+(\d{2})\.(\d{2})\.(\d{4})/i.exec(url)
  if (!m) return null
  return { numero: Number(m[1]), data: `${m[4]}-${m[3]}-${m[2]}`, url }
}

const SIGLAS: [RegExp, string][] = [
  [/^LEI COMPLEMENTAR$/, 'PLC'],
  [/^LEI$/, 'PL'],
  [/^EMENDA (?:À|A) CONSTITUI[ÇC][ÃA]O$/, 'PEC'],
  [/^DECRETO LEGISLATIVO$/, 'PDL'],
]

// Cabeçalho em maiúsculas (no corpo do texto, "Projeto de Lei" vem em minúsculas e não conta).
// Formatos vistos: "Nº 149/2026", "N. 150 DE 2026", "N°152/2026", "Nº 153, DE 25 DE SETEMBRO DE 2026", "Nº 155 DE SETEMBRO DE 2026".
const CABECALHO =
  /PROJETO DE (LEI COMPLEMENTAR|LEI|EMENDA (?:À|A) CONSTITUI[ÇC][ÃA]O|DECRETO LEGISLATIVO)\s*N\s*[º°o.]?\s*\.?\s*(\d{1,4})\s*(?:\/\s*(\d{4})|,?\s*DE\s+(?:\d{1,2}\s+DE\s+)?(?:[A-ZÇ]+\s+DE\s+)?(\d{4}))\.?/g

/** Tira o cabeçalho de página ("6BOA VISTA, 13 DE OUTUBRO DE 2026DIÁRIO DA ALE/RR ED. Nº 4747 DIÁRIO DA ASSEMBLEIA LEGISLATIVA"). */
export const semCabecalhoDePagina = (t: string) =>
  t.replace(/\s*\d*\s*BOA VISTA, \d{1,2} DE [A-ZÇ]+ DE \d{4}\s*DI[ÁA]RIO DA ALE\/RR ED\. N[º°] ?\d+\s*DI[ÁA]RIO DA ASSEMBLEIA LEGISLATIVA\s*/g, ' ')

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** Autor pela assinatura: "CHICO MOZART Deputado Estadual" vira parlamentar; o governador fica com nome livre. */
export function autorDoBloco(bloco: string): AutorColetado | null {
  const gov = /([A-ZÁ-Ú][A-ZÁ-Ú ]{5,60}?)\s+Governador(?:a)? do Estado de Roraima/.exec(bloco)
  const dep = /(?:^|[\n.)\d]\s*)([A-ZÁ-Úa-zá-ú][A-Za-zÁ-Úá-ú' ]{3,60}?)\s+Deputad[oa] Estadual/im.exec(bloco)
  if (gov && (!dep || gov.index < dep.index)) return { papel: 'autor', nomeLivre: `${capitalizar(gov[1].trim())} (Governador do Estado)` }
  if (!dep) return null
  const nome = capitalizar(dep[1].trim())
  return { papel: 'autor', parlamentar: { chave: `alerr:parlamentar:${slugify(nome)}`, nome, uf: 'RR', casa: 'assembleia' } }
}

export type ProjetoNoDiario = { sigla: string; numero: number; ano: number; ementa: string; texto: string; autor: AutorColetado | null }

/** Projetos apresentados numa edição, com ementa, texto e autor. Um por número (o primeiro cabeçalho vale). */
export function projetosDaEdicao(textoBruto: string): ProjetoNoDiario[] {
  const texto = semCabecalhoDePagina(textoBruto)
  const achados = [...texto.matchAll(CABECALHO)]
  const vistos = new Map<string, ProjetoNoDiario>()
  achados.forEach((m, i) => {
    const sigla = SIGLAS.find(([re]) => re.test(m[1].replace(/\s+/g, ' ')))?.[1]
    const numero = Number(m[2])
    const ano = Number(m[3] || m[4])
    if (!sigla || !numero || ano < 1990 || ano > 2100) return
    const fim = i + 1 < achados.length ? achados[i + 1].index! : Math.min(texto.length, m.index! + 30_000)
    const bloco = texto.slice(m.index! + m[0].length, fim)
    // Ementa: o resto da linha do cabeçalho ou, se vazio, a linha seguinte
    const linhas = bloco.split('\n').map((l) => l.trim())
    const ementa = (linhas[0] && linhas[0].length > 15 ? linhas[0] : linhas.find((l) => l.length > 15) || '').replace(/^[.,\s]+/, '').slice(0, 800)
    if (!ementa || /^(O GOVERNADOR|A MESA|A ASSEMBLEIA|Art\.)/.test(ementa)) return
    const id = `${sigla}-${numero}-${ano}`
    if (vistos.has(id)) return
    // Texto do projeto: até a justificativa, a mensagem seguinte do governo ou as outras matérias do diário
    const corte = bloco.search(/JUSTIFICATIVA|EXCELENT[ÍI]SSIMO SENHOR PRESIDENTE|\bINDICA[ÇC][ÕO]ES\b|\bREQUERIMENTOS?\b\s+(?:N|PEDIDO)|SUPERINTEND[ÊE]NCIA DE GEST[ÃA]O/)
    const textoProjeto = (corte > 0 ? bloco.slice(0, corte) : bloco).slice(0, 15_000).trim()
    vistos.set(id, { sigla, numero, ano, ementa, texto: textoProjeto, autor: autorDoBloco(bloco.slice(0, 25_000)) })
  })
  return [...vistos.values()]
}

/** "Autógrafo do Projeto de Lei nº 157/2026": o projeto foi aprovado e segue para sanção. */
export function autografosDaEdicao(texto: string): { sigla: string; numero: number; ano: number }[] {
  const r = new Map<string, { sigla: string; numero: number; ano: number }>()
  for (const m of texto.matchAll(/Aut[óo]grafo d[oa] Projeto de (Lei Complementar|Lei|Decreto Legislativo)\s*n[º°o.]?\s*(\d{1,4})\s*\/\s*(\d{4})/gi)) {
    const t = m[1].toLowerCase()
    const sigla = t === 'lei complementar' ? 'PLC' : t === 'lei' ? 'PL' : 'PDL'
    r.set(`${sigla}-${m[2]}-${m[3]}`, { sigla, numero: Number(m[2]), ano: Number(m[3]) })
  }
  return [...r.values()]
}

export const chaveRR = (p: { sigla: string; numero: number; ano: number }) => `alerr:${p.sigla}-${p.numero}-${p.ano}`

/** Projeto do diário → pacote no formato comum, com a publicação como andamento e o texto como versão original. */
export function pacoteDoProjeto(p: ProjetoNoDiario, e: Edicao): PacoteProposicao {
  const chave = chaveRR(p)
  const id = `${p.sigla}-${p.numero}-${p.ano}`
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'RR',
      sigla: p.sigla,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      dataApresentacao: e.data,
      statusOficial: `Publicado no Diário da ALE-RR nº ${e.numero}`,
      statusSimplificado: 'em_tramitacao',
      ultimaMovimentacao: e.data,
      urlInteiroTeor: e.url,
      urlFonte: e.url,
      autoria: p.autor ? [p.autor] : [],
    },
    tramitacoes: [
      { chave: `alerr:pub:${e.numero}:${id}`, proposicao: chave, data: e.data, orgao: 'Plenário', descricao: `Apresentado e publicado no Diário da ALE-RR nº ${e.numero}`, tipoEvento: 'apresentacao', urlDocumento: e.url },
    ],
    versoes: [{ chave: `alerr:texto:${id}`, proposicao: chave, data: e.data, tipo: 'original', rotulo: `Texto publicado no Diário da ALE-RR nº ${e.numero}`, url: e.url, texto: p.texto }],
    votacoes: [],
  }
}

/** Autógrafo publicado → andamento de aprovação na proposta acompanhada (pela chave ou pelo número em RR). */
export function eventoDoAutografo(a: { sigla: string; numero: number; ano: number }, e: Edicao): EventoColetado {
  const id = `${a.sigla}-${a.numero}-${a.ano}`
  return {
    alvo: { chaves: [chaveRR(a)], identificacoes: [`${a.sigla} ${a.numero}/${a.ano}`], esfera: 'estadual', uf: 'RR' },
    tramitacoes: [
      { chave: `alerr:autografo:${e.numero}:${id}`, data: e.data, orgao: 'Plenário', descricao: `Aprovado: autógrafo publicado no Diário da ALE-RR nº ${e.numero}`, tipoEvento: 'aprovacao', urlDocumento: e.url },
    ],
  }
}
