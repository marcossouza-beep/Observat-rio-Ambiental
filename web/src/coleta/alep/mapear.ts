/**
 * Assembleia Legislativa do Paraná (Alep) → formato comum, pela ordem do dia do Plenário.
 * A pesquisa legislativa passa por captcha (não é contornado); a página inicial lista, sem captcha, as ordens do dia
 * das próximas e últimas sessões (título, data e PDF em storage2.assembleia.pr.leg.br/file/public-media/ordem/).
 * Cada PDF traz a sessão, a data e os itens: "Item 2 – 2º Turno do Projeto de Lei nº 630/2025.", autoria, ementa
 * e pareceres.
 * Funções puras, testadas sobre a página e os PDFs reais gravados em tests/fixtures/coleta/alep/.
 *
 * Chaves: alep:<SIGLA>-<número>-<ano> (proposta), alep:ordem:<data>:<sessão>:<proposta>, alep:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import {
  ErroFormato,
  type AutorColetado,
  type EventoColetado,
  type PacoteProposicao,
} from '../tipos'

export const ALEP = 'https://www.assembleia.pr.leg.br'

export type CartaoOrdemAlep = { titulo: string; url: string }

/** Cartões da aba "Ordem do Dia" da página inicial: título da sessão e o PDF. */
export function ordensDaInicial(html: string): CartaoOrdemAlep[] {
  const aba = html.split('id="content-ordem-dia"')[1]
  if (!aba) throw new ErroFormato('alep', 'content-ordem-dia', '/')
  const r: CartaoOrdemAlep[] = []
  for (const bloco of aba
    .split(/id="content-(?!ordem-dia)/)[0]
    .split('<h3')
    .slice(1)) {
    const titulo = /^[^>]*>([\s\S]*?)<\/h3>/.exec(bloco)?.[1].replace(/\s+/g, ' ').trim()
    const url =
      /href="(https:\/\/storage2\.assembleia\.pr\.leg\.br\/[^"]+\/ordem\/[^"]+\.pdf)"/.exec(
        bloco,
      )?.[1]
    if (titulo && url && !r.some((x) => x.url === url)) r.push({ titulo, url })
  }
  return r
}

const MESES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARCO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Tipos que interessam, do mais específico para o mais geral. */
const TIPOS: [RegExp, string][] = [
  [/Projeto de Lei Complementar/i, 'PLC'],
  [/Proposta de Emenda (?:à|a) Constitui[çc][ãa]o/i, 'PEC'],
  [/Projeto de Decreto Legislativo/i, 'PDL'],
  [/Projeto de Lei/i, 'PL'],
]

export type ItemOrdemAlep = {
  item: number
  /** "2º Turno", "Turno Único", "Redação Final", "Veto"… */
  etapa: string
  sigla: string
  numero: number
  ano: number
  autores: string[]
  ementa: string
  pareceres: string[]
}

export type OrdemAlep = { sessao: string; data: string; itens: ItemOrdemAlep[] }

const CABECALHO =
  /Assembleia Legislativa do Estado do Paran[áa]\s+Centro Legislativo Presidente An[íi]bal Khury\s+Diretoria de Assist[êe]ncia ao Plen[áa]rio/g

/** Texto do PDF da ordem do dia → sessão, data e itens (só PL, PLC, PEC e PDL). */
export function lerOrdemAlep(texto: string): OrdemAlep {
  const t = texto.replace(CABECALHO, '\n')
  const s = /PARA A\s+(\d+)[ªa]\s+SESS[ÃA]O\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)/.exec(t)
  const d = /EM\s+(\d{1,2})\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/.exec(semAcento(t))
  const mes = d ? MESES.indexOf(d[2]) + 1 : 0
  if (!s || !d || !mes)
    throw new ErroFormato('alep', 'sessão e data da ordem do dia', 'PDF da ordem do dia')
  const tipoSessao = s[2].charAt(0) + s[2].slice(1).toLowerCase()
  const itens: ItemOrdemAlep[] = []
  for (const bloco of t.split(/\bItem\s+(?=\d+\s*[–-])/).slice(1)) {
    const cab =
      /^(\d+)\s*[–-]\s*([^\n]*?)\s+(?:do|da)\s+((?:Projeto|Proposta)[^\n]*?)\s+n[º°o]\s*([\d.]+)\/(\d{4})/i.exec(
        bloco,
      )
    if (!cab) continue
    const tipo = TIPOS.find(([re]) => re.test(cab[3]))
    if (!tipo) continue
    // Linhas depois do cabeçalho; títulos de seção em maiúsculas ("PROPOSIÇÕES EM 2º TURNO") ficam de fora
    const linhas = bloco
      .slice(cab[0].length)
      .replace(
        /\s+(?:PROPOSI[ÇC][ÕO]ES?|PROJETOS?|VETOS?|MAT[ÉE]RIAS?)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9ºª ]+$/u,
        '',
      )
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l && l !== '.')
    const autoria = linhas.find((l) => /^Autoria\b/i.test(l)) || ''
    const pareceres = linhas.filter((l) => /^(Parecer|Aguardando parecer)/i.test(l))
    const ementa = linhas
      .filter((l) => l !== autoria && !pareceres.includes(l) && !/^(Ofício|Mensagem)\s+n/i.test(l))
      .join(' ')
      .trim()
    itens.push({
      item: Number(cab[1]),
      etapa: cab[2].trim(),
      sigla: tipo[1],
      numero: Number(cab[4].replace(/\./g, '')),
      ano: Number(cab[5]),
      autores: autoresDaLinha(autoria),
      ementa,
      pareceres,
    })
  }
  return {
    sessao: `${s[1]}ª Sessão ${tipoSessao}`,
    data: `${d[3]}-${String(mes).padStart(2, '0')}-${d[1].padStart(2, '0')}`,
    itens,
  }
}

/** "Autoria da Deputada Ana Júlia e da Deputada Luciana Rafagnin." → ["Deputada Ana Júlia", "Deputada Luciana Rafagnin"]. */
function autoresDaLinha(l: string): string[] {
  const corpo = l
    .replace(/^Autoria\s+(?:d[oa]s?\s+)?/i, '')
    .split(/\.\s+(?=Of[íi]cio|Mensagem)/i)[0]
    .replace(/\.$/, '')
  return corpo
    .split(/\s*,\s*|\s+e\s+(?=d[oa]s?\s)/)
    .map((a) => a.replace(/^d[oa]s?\s+/i, '').trim())
    .filter(Boolean)
}

/** "Deputado Cobra Repórter" vira parlamentar; Poder Executivo, Tribunal de Justiça, Mesa ficam com o nome. */
export function autoresAlep(autores: string[]): AutorColetado[] {
  return autores.map((a, i): AutorColetado => {
    const papel = i ? 'coautor' : 'autor'
    const dep = /^Deputad[oa]s?\s+(.+)$/i.exec(a)
    if (!dep) return { papel, nomeLivre: a }
    const nome = dep[1].trim()
    return {
      papel,
      parlamentar: {
        chave: `alep:parlamentar:${slugify(nome)}`,
        nome,
        uf: 'PR',
        casa: 'assembleia',
      },
    }
  })
}

const idPR = (p: { sigla: string; numero: number; ano: number }) =>
  `${p.sigla}-${p.numero}-${p.ano}`
export const chavePR = (p: { sigla: string; numero: number; ano: number }) => `alep:${idPR(p)}`

function tramitacaoDoItem(o: OrdemAlep, i: ItemOrdemAlep, url: string) {
  const etapa = i.etapa.toLowerCase()
  return {
    chave: `alep:ordem:${o.data}:${slugify(o.sessao)}:${idPR(i)}`,
    data: o.data,
    orgao: 'Plenário',
    descricao:
      `Na ordem do dia da ${o.sessao} (${etapa})${i.pareceres.length ? `. ${i.pareceres.join(' ')}` : ''}`.slice(
        0,
        500,
      ),
    tipoEvento: 'pauta' as const,
    urlDocumento: url,
  }
}

/** Item de uma proposta acompanhada → andamento "pauta" na data da sessão. */
export function eventoDoItem(o: OrdemAlep, i: ItemOrdemAlep, url: string): EventoColetado {
  return {
    alvo: {
      chaves: [chavePR(i)],
      identificacoes: [`${i.sigla} ${i.numero}/${i.ano}`],
      esfera: 'estadual',
      uf: 'PR',
    },
    tramitacoes: [tramitacaoDoItem(o, i, url)],
  }
}

/** Item relevante ainda fora do site → proposta nova, com a ordem do dia como primeiro andamento. */
export function pacoteDoItem(o: OrdemAlep, i: ItemOrdemAlep, url: string): PacoteProposicao {
  const chave = chavePR(i)
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'PR',
      sigla: i.sigla,
      numero: i.numero,
      ano: i.ano,
      ementa: i.ementa,
      // A ordem do dia não traz a data de apresentação
      statusOficial: `Na ordem do dia da ${o.sessao} (${i.etapa})`,
      statusSimplificado: 'em_tramitacao',
      etapa: 'Plenário',
      ultimaMovimentacao: o.data,
      urlInteiroTeor: url,
      urlFonte: url,
      autoria: autoresAlep(i.autores),
    },
    tramitacoes: [{ ...tramitacaoDoItem(o, i, url), proposicao: chave }],
    versoes: [],
    votacoes: [],
  }
}
