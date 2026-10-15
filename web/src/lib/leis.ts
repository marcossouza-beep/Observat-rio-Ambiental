/**
 * Leis citadas na ementa de uma proposta ("altera as Leis nºs 9.605, de 12 de fevereiro de 1998, e 9.985…"),
 * com o identificador LexML (URN) e o link para a norma. Fonte: LexML (docs/APIS.md, seção 2.4).
 */
import { normalizar } from './relevancia'

export type LeiCitada = { rotulo: string; tipo: string; numero: string; data?: string; ano?: string; urn?: string; url: string }

const MESES: Record<string, string> = {
  janeiro: '01', fevereiro: '02', marco: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

/** Tipo de norma → nome no rótulo e na URN do LexML. */
const TIPOS: { re: RegExp; nome: string; urn: string }[] = [
  { re: /^leis? complementar(?:es)?$/, nome: 'Lei Complementar', urn: 'lei.complementar' },
  { re: /^decretos?-leis?$/, nome: 'Decreto-Lei', urn: 'decreto.lei' },
  { re: /^leis?$/, nome: 'Lei', urn: 'lei' },
  { re: /^decretos?$/, nome: 'Decreto', urn: 'decreto' },
  { re: /^medidas? provisorias?$/, nome: 'Medida Provisória', urn: 'medida.provisoria' },
]

const numeroLimpo = (n: string) => n.replace(/\./g, '')
const comPontos = (n: string) => numeroLimpo(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** "12 de fevereiro de 1998" (texto já sem acento) → "1998-02-12". */
function dataPorExtenso(t: string): string | undefined {
  const m = /^(\d{1,2})(?:º|o)? de ([a-z]+) de (\d{4})/.exec(t.trim())
  if (!m || !MESES[m[2]]) return undefined
  return `${m[3]}-${MESES[m[2]]}-${m[1].padStart(2, '0')}`
}

export function leisCitadas(texto: string | null | undefined): LeiCitada[] {
  if (!texto) return []
  // Trabalha sobre o texto sem acento, mantendo as posições (a normalização remove só os acentos).
  const t = normalizar(texto).replace(/\bn\s*[º°o]s?\.?(?=\s|\d)\s*/g, 'nº ')
  const achadas = new Map<string, LeiCitada>()
  // "Lei nº 9.605, de 12 de fevereiro de 1998" | "Leis nºs 9.605, de …, e 9.985, de …" | "Lei nº 12.651/2012"
  const bloco = /\b(leis? complementar(?:es)?|decretos?-leis?|leis?|decretos?|medidas? provisorias?)\s+nº\s+((?:[\d.]+(?:\/\d{2,4})?(?:,?\s+de\s+\d{1,2}º?\s+de\s+[a-z]+\s+de\s+\d{4})?(?:,?\s+e\s+|\s*,\s*)?)+)/g
  for (const m of t.matchAll(bloco)) {
    const tipo = TIPOS.find((x) => x.re.test(m[1]))
    if (!tipo) continue
    const item = /([\d.]+)(?:\/(\d{2,4}))?(?:,?\s+de\s+(\d{1,2}º?\s+de\s+[a-z]+\s+de\s+\d{4}))?/g
    for (const n of m[2].matchAll(item)) {
      const numero = numeroLimpo(n[1])
      if (!/^\d+$/.test(numero) || numero.length > 6) continue
      const data = n[3] ? dataPorExtenso(n[3].replace('º', '')) : undefined
      const ano = data?.slice(0, 4) || (n[2] ? (n[2].length === 2 ? `19${n[2]}` : n[2]) : undefined)
      const urn = data ? `urn:lex:br:federal:${tipo.urn}:${data};${numero}` : undefined
      const rotulo = `${tipo.nome} nº ${comPontos(numero)}${ano ? `/${ano}` : ''}`
      const url = urn
        ? `https://www.lexml.gov.br/urn/${urn}`
        : `https://www.lexml.gov.br/busca/search?keyword=${encodeURIComponent(`${tipo.nome} ${numero}${ano ? ` ${ano}` : ''}`)}`
      const chave = `${tipo.urn}:${numero}:${ano || ''}`
      if (!achadas.has(chave)) achadas.set(chave, { rotulo, tipo: tipo.nome, numero, data, ano, urn, url })
    }
  }
  return [...achadas.values()]
}
