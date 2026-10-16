/**
 * Assembleia Legislativa do Ceará (Alece) → formato comum. A Alece não usa o SAPL nem tem API; duas páginas abertas bastam:
 *  - Histórico do expediente (www.al.ce.gov.br/legislativo/expediente-historico): cada sessão, das mais novas para as mais
 *    antigas, com as matérias lidas ("LEITURA DE PROJETOS DE LEI N.º: 593/2026 - Autoria do Deputado X - ementa").
 *    É a apresentação oficial da proposta e o caminho para as novas.
 *  - Lista por legislatura (www2.al.ce.gov.br/legislativo/proposicoes/numero.php), em ISO-8859-1, 20 por página e em ordem
 *    de número: autor, entrada, leitura, ementa, comissões, o histórico inteiro ("Em 17.03.26 - ..."), autógrafo, lei e veto.
 *    A ficha (tramit<ano>/pl<n>_<aa>.htm) tem o texto integral.
 * Funções puras, testadas sobre páginas reais gravadas em tests/fixtures/coleta/alece/.
 *
 * Chaves: alece:<SIGLA>-<número>-<ano> (proposta), alece:tram:<proposta>:<n>, alece:parlamentar:<nome>.
 */
import { slugify } from '../../lib/texto'
import { tipoDoAndamento } from '../classificar'
import type { AutorColetado, PacoteProposicao, StatusSimplificado, TipoEvento } from '../tipos'

export const ALECE = 'https://www.al.ce.gov.br'
export const WWW2 = 'https://www2.al.ce.gov.br/legislativo/proposicoes'

const ENTIDADES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  lt: '<',
  gt: '>',
  ordm: 'º',
  ordf: 'ª',
  deg: '°',
  ndash: '–',
  mdash: '—',
  ccedil: 'ç',
  Ccedil: 'Ç',
}
const ACENTOS: Record<string, string> = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈' }

/** Texto limpo: entidades HTML (com acentos), sem tags, espaços normais. */
export const limpar = (t: string) =>
  t
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([A-Za-z])(acute|grave|circ|tilde|uml);/g, (_, l, a) =>
      (l + ACENTOS[a]).normalize('NFC'),
    )
    .replace(/&([a-zA-Z]+);/g, (m, e) => ENTIDADES[e] ?? m)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()

/**
 * As páginas do www2 se dizem ISO-8859-1, mas os dados vêm do banco em UTF-8 ("JÃ” FARIAS"). Lida como latin1,
 * cada sequência UTF-8 válida volta ao caractere certo; o que é latin1 de verdade fica como está.
 */
// Navegadores (e o TextDecoder 'latin1') leem ISO-8859-1 como windows-1252: 0x80–0x9F viram “ ” – € etc.
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ'
const byte = (c: string) => {
  const i = CP1252.indexOf(c)
  return i >= 0 ? 0x80 + i : c.charCodeAt(0)
}
export const consertarUtf8 = (s: string) =>
  s.replace(/[\xC2-\xF4][\x80-\xBF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]{1,3}/g, (m) => {
    const d = Buffer.from([...m].map(byte)).toString('utf8')
    return d.includes('\uFFFD') ? m : d
  })

/** Corpo de uma página do www2 (bytes) → texto. */
export const decodificarWww2 = (b: ArrayBuffer | Buffer) =>
  consertarUtf8(Buffer.from(b as ArrayBuffer).toString('latin1'))

const uma = (t: string) => limpar(t).replace(/\s+/g, ' ').trim()

/** "17.03.26" ou "06/02/23" → "2026-03-17". */
export function dataCurta(d: string): string | null {
  const m = /(\d{2})[./](\d{2})[./](\d{2,4})/.exec(d)
  if (!m) return null
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${ano}-${m[2]}-${m[1]}`
}

const capitalizar = (n: string) =>
  n
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')

/** Deputado vira parlamentar; Poder Executivo, Ministério Público, tribunais e Mesa ficam com o nome. */
export function autorAlece(autor: string): AutorColetado | null {
  // "RENATO ROSENO, COAUTORIA GABRIELA AGUIAR E ...": o primeiro nome é o autor
  const a = autor
    .replace(/^Autoria (?:d[oa]s?\s+)?/i, '')
    .split(/,|\bCOAUTORIA\b/i)[0]
    .trim()
  if (!a || a === '-') return null
  if (
    /PODER EXECUTIVO|GOVERNADOR|MINIST[ÉE]RIO P[ÚU]BLICO|TRIBUNAL|DEFENSORIA|MESA DIRETORA|COMISS[ÃA]O/i.test(
      a,
    )
  )
    return { papel: 'autor', nomeLivre: capitalizar(a) }
  const nome = capitalizar(a.replace(/^(?:Deputad[oa]s?|Dep\.)\s+/i, ''))
  return {
    papel: 'autor',
    parlamentar: {
      chave: `alece:parlamentar:${slugify(nome)}`,
      nome,
      uf: 'CE',
      casa: 'assembleia',
    },
  }
}

// ── Lista por legislatura (www2) ─────────────────────────────────────────────

export type RegistroAlece = {
  numero: number
  ano: number
  autor: string
  entrada: string | null
  leitura: string | null
  ementa: string
  urlTexto?: string
  comissoes: string
  localizacao: string
  andamentos: { data: string; descricao: string }[]
  autografo: string
  lei: string
  veto: string
  obs: string
}

const campo = (bloco: string, rotulo: string) => {
  const re = new RegExp(
    `<b>${rotulo}<\\/b><\\/font>(?:<br>|&nbsp;)\\s*<font[^>]*>([\\s\\S]*?)<\\/font>`,
  )
  return re.exec(bloco)?.[1] ?? ''
}
const valor = (t: string) => {
  const v = uma(t)
  return v === '-' ? '' : v
}

/** Registros de uma página da lista (numero.php, ano.php, autor.php ou busca). */
export function registrosDaLista(html: string): RegistroAlece[] {
  const r: RegistroAlece[] = []
  for (const bloco of html.split(/<b>N&ordm; do Proj\.:<\/b>/).slice(1)) {
    const num = /<font[^>]*>\s*(\d+)\s*\/\s*(\d{2,4})\s*<\/font>/.exec(bloco)
    if (!num) continue
    const ano = num[2].length === 2 ? 2000 + Number(num[2]) : Number(num[2])
    const ementaHtml =
      /<b>Ementa:<\/b><\/font><br><font[^>]*>([\s\S]*?)<\/font><\/td>/.exec(bloco)?.[1] ?? ''
    const urlTexto = /href=['"]([^'"]+)['"]/.exec(ementaHtml)?.[1]
    // Histórico: "Em 17.03.26 - texto" por linha, depois de Distribuição e Localização
    const hist =
      /<b>Localiza&ccedil;&atilde;o:<\/b><\/font>&nbsp;<font[^>]*>[\s\S]*?<\/font><br><font[^>]*>([\s\S]*?)<\/font><\/td>/.exec(
        bloco,
      )?.[1] ?? ''
    const andamentos = limpar(hist)
      .split('\n')
      .map((l) => /^Em (\d{2}\.\d{2}\.\d{2,4}) - (.+)$/.exec(l.trim()))
      .filter((m): m is RegExpExecArray => !!m && !!dataCurta(m[1]))
      .map((m) => ({ data: dataCurta(m[1])!, descricao: m[2].trim() }))
    r.push({
      numero: Number(num[1]),
      ano,
      autor: valor(campo(bloco, 'Autor:')),
      entrada: dataCurta(campo(bloco, 'Entrada:')),
      leitura: dataCurta(campo(bloco, 'Expediente:')),
      ementa: uma(ementaHtml),
      urlTexto: urlTexto?.replace(/^http:/, 'https:'),
      comissoes: valor(campo(bloco, 'Distribui&ccedil;&atilde;o/Comiss&otilde;es:')),
      localizacao: valor(campo(bloco, 'Localiza&ccedil;&atilde;o:')),
      andamentos,
      autografo: valor(campo(bloco, 'Aut&oacute;grafo:')),
      lei: valor(campo(bloco, 'Lei:')),
      veto: valor(campo(bloco, 'Veto n&ordm;:')),
      obs: valor(campo(bloco, 'OBS:')),
    })
  }
  return r
}

/** Total de páginas da lista ("Página 1 de 126"). */
export const paginasDaLista = (html: string) => Number(/gina \d+ de (\d+)/.exec(html)?.[1] || 1)

export function eventoAlece(descricao: string): TipoEvento {
  const t = descricao.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/LEITURA NO EXPEDIENTE|DEPARTAMENTO LEGISLATIVO/.test(t)) return 'apresentacao'
  if (/REGIME DE URGENCIA/.test(t)) return 'urgencia'
  if (/ORDEM DO DIA|PAUTA/.test(t)) return 'pauta'
  if (/RELATOR|PARECER/.test(t)) return 'parecer_relator'
  if (/SANCIONAD|LEI N/.test(t)) return 'sancao'
  if (/VETAD|VETO/.test(t)) return 'veto'
  if (/ARQUIVAD/.test(t)) return 'arquivamento'
  if (/APROVAD|AUTOGRAFO/.test(t)) return 'aprovacao'
  return tipoDoAndamento(descricao)
}

export function statusAlece(
  r: Pick<RegistroAlece, 'lei' | 'veto' | 'obs' | 'autografo'>,
): StatusSimplificado {
  const o = r.obs.toUpperCase()
  if (r.lei) return 'norma'
  if (/VETAD/.test(o)) return 'vetada'
  if (/REJEITAD|PREJUDICAD/.test(o)) return 'rejeitada'
  if (/ARQUIVAD|RETIRAD/.test(o)) return 'arquivada'
  if (r.autografo || /APROVAD/.test(o)) return 'aprovada'
  return 'em_tramitacao'
}

export const chaveCE = (sigla: string, numero: number, ano: number) =>
  `alece:${sigla}-${numero}-${ano}`

/** Tabela do www2 de cada sigla (a lista tem uma por tipo, separada em tramitando "T" e deliberados "D"). */
export const TABELAS_ALECE: Record<string, string> = {
  PL: 'projeto_lei',
  PLC: 'projeto_compl',
  PEC: 'projeto_emen',
  PDL: 'projeto_decre',
  MSG: 'projeto_mens',
}

export const urlLista = (sigla: string, opcao: 'T' | 'D', pagina = 1) =>
  `${WWW2}/numero.php?nome=31_legislatura&tabela=${TABELAS_ALECE[sigla]}&opcao=${opcao}${pagina > 1 ? `&absolutepage=${pagina}` : ''}`

/** Texto integral dos projetos de lei: tramit<ano>/pl<n>_<aa> (PDF desde 2024; HTML antes). */
export const urlFicha = (sigla: string, numero: number, ano: number) =>
  sigla === 'PL'
    ? `https://www2.al.ce.gov.br/legislativo/tramit${ano}/pl${numero}_${String(ano).slice(2)}.${ano >= 2024 ? 'pdf' : 'htm'}`
    : undefined

// ── Expediente (www) ─────────────────────────────────────────────────────────

export type SessaoAlece = { id: number; data: string; resumo: string; url: string }

/** Sessões do histórico do expediente (mais novas primeiro): id da página de texto, data e o começo do conteúdo. */
export function sessoesDoHistorico(html: string): SessaoAlece[] {
  const r: SessaoAlece[] = []
  for (const m of html.matchAll(
    /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td[^>]*>\s*<p>(\d{2})\/(\d{2})\/(\d{4})<\/p>[\s\S]*?\/legislativo\/expediente-texto\/(\d+)/g,
  )) {
    const id = Number(m[5])
    if (r.some((s) => s.id === id)) continue
    r.push({
      id,
      data: `${m[4]}-${m[3]}-${m[2]}`,
      resumo: uma(m[1]).slice(0, 300),
      url: `${ALECE}/legislativo/expediente-texto/${id}`,
    })
  }
  return r
}

export type LeituraAlece = {
  sigla: string
  numero: number
  ano: number
  autor: string
  ementa: string
}

const siglaDaSecao = (s: string): string | null => {
  const t = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  if (/INDICACAO|REQUERIMENTO|CORRESPONDENCIA|MOCAO|RESOLUCAO|EMENDAS? (?:AO|AOS|A)\b/.test(t))
    return null
  if (/LEI COMPLEMENTAR/.test(t)) return 'PLC'
  if (/PROJETOS? DE LEI/.test(t)) return 'PL'
  if (/MENSAGE/.test(t)) return 'MSG'
  if (/EMENDA CONSTITUCIONAL|EMENDAS? A CONSTITUICAO/.test(t)) return 'PEC'
  if (/DECRETO LEGISLATIVO/.test(t)) return 'PDL'
  return null
}

/**
 * Matérias lidas numa sessão (página expediente-texto): "LEITURA DE PROJETOS DE LEI N.º: 593/2026 - Autoria do Deputado
 * Romeu Aldigueri - Institui...". Mensagens do Executivo viram MSG (o projeto de lei do governo tem o número da mensagem).
 */
export function leiturasDoExpediente(html: string): LeituraAlece[] {
  const t = uma(html)
  const ini = t.search(/EXPEDIENTE\s*(?:—\s*SESS[ÃA]O [A-ZÁ-Ú]+\s*)?\d{2}\.\d{2}\.\d{4}/)
  const fim = t.indexOf('Mapa do site', ini)
  const corpo = t.slice(Math.max(0, ini), fim > 0 ? fim : undefined)
  const r: LeituraAlece[] = []
  for (const secao of corpo.split(/LEITURA D[EOA]S? /).slice(1)) {
    const cab =
      /^([A-ZÁ-ÚÇ ]+?)(?:\s*N\.?\s*[º°]?\s*)?:?\s*(?=\d|$)/.exec(secao)?.[1] || secao.slice(0, 60)
    const sigla = siglaDaSecao(cab)
    if (!sigla) continue
    for (const m of secao.matchAll(
      /(\d{1,4})\s*\/\s*(\d{4})\s*-\s*Autoria\s+(?:d[oa]s?\s+)?(.+?)\s+-\s+(.+?)(?=\s*\d{1,4}\s*\/\s*\d{4}\s*-\s*Autoria|$)/g,
    )) {
      const ementa = m[4]
        .replace(
          /^Projeto de Lei (?:da |do )?oriundo da Mensagem n\.?\s*[º°]?\s*[\d.]+(?:\/\d{4})?\s*-\s*/i,
          '',
        )
        .trim()
      r.push({ sigla, numero: Number(m[1]), ano: Number(m[2]), autor: m[3].trim(), ementa })
    }
  }
  return r
}

const idCE = (p: { sigla: string; numero: number; ano: number }) =>
  `${p.sigla}-${p.numero}-${p.ano}`
const dataBR = (d: string) => d.split('-').reverse().join('/')

/** Matéria lida no expediente → pacote (proposta nova): leitura como apresentação, autor e a ficha com o texto. */
export function pacoteDaLeitura(l: LeituraAlece, s: SessaoAlece, texto?: string): PacoteProposicao {
  const chave = chaveCE(l.sigla, l.numero, l.ano)
  const autor = autorAlece(l.autor)
  const ficha = urlFicha(l.sigla, l.numero, l.ano)
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'CE',
      sigla: l.sigla,
      numero: l.numero,
      ano: l.ano,
      ementa: l.ementa,
      dataApresentacao: s.data,
      statusOficial: `Lido no expediente de ${dataBR(s.data)}`,
      statusSimplificado: 'em_tramitacao',
      ultimaMovimentacao: s.data,
      urlInteiroTeor: ficha,
      urlFonte: s.url,
      autoria: autor ? [autor] : [],
    },
    tramitacoes: [
      {
        chave: `alece:leitura:${s.id}:${idCE(l)}`,
        proposicao: chave,
        data: s.data,
        orgao: 'Plenário',
        descricao: 'Leitura no Expediente',
        tipoEvento: 'apresentacao',
        urlDocumento: s.url,
      },
    ],
    versoes: ficha
      ? [
          {
            chave: `alece:texto:${idCE(l)}`,
            proposicao: chave,
            data: s.data,
            tipo: 'original',
            rotulo: 'Texto do projeto (Alece)',
            url: ficha,
            ...(texto ? { texto } : {}),
          },
        ]
      : [],
    votacoes: [],
  }
}

/** Registro da lista do www2 → pacote com o histórico inteiro, situação e local (atualiza a proposta acompanhada). */
export function pacoteDoRegistro(r: RegistroAlece, sigla: string): PacoteProposicao {
  const chave = chaveCE(sigla, r.numero, r.ano)
  const id = idCE({ sigla, numero: r.numero, ano: r.ano })
  const autor = autorAlece(r.autor)
  const tramitacoes = r.andamentos.map((a) => ({
    chave: `alece:tram:${id}:${a.data}:${slugify(a.descricao).slice(0, 60)}`,
    proposicao: chave,
    data: a.data,
    descricao: a.descricao,
    tipoEvento: eventoAlece(a.descricao),
  }))
  const ultima = r.andamentos.at(-1)
  const extras = [
    r.autografo && `Autógrafo ${r.autografo}`,
    r.lei && `Lei ${r.lei}`,
    r.veto && `Veto ${r.veto}`,
  ]
    .filter(Boolean)
    .join('; ')
  return {
    proposicao: {
      chave,
      casa: 'assembleia',
      esfera: 'estadual',
      uf: 'CE',
      sigla,
      numero: r.numero,
      ano: r.ano,
      ementa: r.ementa,
      dataApresentacao: r.leitura || r.entrada || undefined,
      statusOficial: [r.obs || 'Em tramitação', r.localizacao && `em ${r.localizacao}`, extras]
        .filter(Boolean)
        .join(' · '),
      statusSimplificado: statusAlece(r),
      etapa: r.localizacao || undefined,
      regime: r.andamentos.some((a) => /REGIME DE URG/i.test(a.descricao)) ? 'urgencia' : 'normal',
      ultimaMovimentacao: ultima?.data || r.leitura || r.entrada || undefined,
      urlInteiroTeor: r.urlTexto || urlFicha(sigla, r.numero, r.ano),
      urlFonte: urlLista(sigla, /TRAMITANDO/i.test(r.obs) || !r.obs ? 'T' : 'D'),
      autoria: autor ? [autor] : [],
    },
    tramitacoes,
    versoes: [],
    votacoes: [],
  }
}
