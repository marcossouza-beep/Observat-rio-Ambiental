/**
 * Alterações que uma proposta faz em lei já existente, lidas do próprio texto da proposta
 * (técnica da LC 95/1998, art. 12): "A Lei nº X passa a vigorar com a seguinte redação: “Art. 4º ...” (NR)",
 * "... acrescida do seguinte art. 4º-A: “...”", "Ficam revogados o art. 5º e o § 2º do art. 7º da Lei nº X".
 * Junto com o texto compilado da lei (redação vigente), monta o "como é hoje × como fica" literal.
 * Funções puras: não interpretam nada, só localizam e recortam o texto oficial.
 */
import { leisCitadas, type LeiCitada } from './leis'

export type TipoAlteracao = 'nova_redacao' | 'acrescimo' | 'revogacao'
export type Alteracao = {
  lei: LeiCitada
  tipo: TipoAlteracao
  /** Como aparece no texto: "Art. 4º", "Art. 4º-A", "§ 2º do art. 7º" */
  dispositivo: string
  /** Número do artigo, para achar a redação vigente: "4", "4-A" */
  artigo: string
  /** Redação proposta, literal (vazio na revogação) */
  proposto: string
}

const ABRE = /[“"]/
const FECHA = /[”"]/
const COMANDO = /passa(?:m)?\s+a\s+vigorar\s+(?:com\s+a\s+seguinte\s+reda[çc][ãa]o|com\s+as\s+seguintes\s+altera[çc][õo]es|acrescid[oa]s?\b[^:“"]*)\s*:/gi
const REVOGA = /\bFica(?:m)?\s+revogad[oa]s?\s+([\s\S]+?)\b(?:d[aoe]s?)\s+((?:Lei|Decreto|Medida)[^;]*?(?:de\s+\d{4}|\/\d{4}))/gi
const ARTIGO_NO_INICIO = /^Art\.?\s*(\d+)\s*[º°o]?((?:-[A-Z])?)/i

const juntar = (t: string) => t.replace(/\r/g, '').replace(/-\n(?=[a-zà-ú])/g, '').replace(/\s+/g, ' ').trim()
const limpar = (t: string) =>
  t
    .replace(/\((?:NR|AC)\)/g, '')
    .replace(/[“”"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Trechos entre aspas a partir de uma posição, até sair das aspas e chegar a um artigo da própria proposta. */
function blocoCitado(t: string, desde: number): { citado: string; fim: number } {
  let prof = 0
  let i = desde
  let citado = ''
  let retoAberto = false
  for (; i < t.length; i++) {
    const c = t[i]
    if (c === '"') {
      retoAberto = !retoAberto
      prof += retoAberto ? 1 : -1
      citado += ' '
      continue
    }
    if (c === '“') {
      prof++
      citado += ' '
      continue
    }
    if (c === '”') {
      prof = Math.max(0, prof - 1)
      citado += ' '
      continue
    }
    if (prof > 0) {
      citado += c
      continue
    }
    // Fora das aspas: um novo artigo da proposta ou um novo comando encerra o bloco
    const resto = t.slice(i, i + 12)
    if (citado.trim() && /^\s*Art\.?\s*\d/i.test(resto)) break
  }
  return { citado, fim: i }
}

/** "Art. 4º ... Art. 4º-A ..." (dentro das aspas) → um item por artigo citado. */
function porArtigo(citado: string): { artigo: string; dispositivo: string; texto: string }[] {
  const partes = limpar(citado).split(/\s+(?=Art\.?\s*\d+\s*[º°o]?(?:-[A-Z])?[\s.])/i)
  const r: { artigo: string; dispositivo: string; texto: string }[] = []
  for (const p of partes) {
    const m = ARTIGO_NO_INICIO.exec(p)
    if (!m) {
      // Parágrafo citado sozinho ("§ 3º ..."): fica com o artigo anterior
      if (r.length) r[r.length - 1].texto += ` ${p}`
      continue
    }
    const artigo = `${m[1]}${m[2] ? m[2].toUpperCase() : ''}`
    r.push({ artigo, dispositivo: `Art. ${m[1]}${Number(m[1]) < 10 ? 'º' : ''}${m[2] ? m[2].toUpperCase() : ''}`, texto: p })
  }
  return r
}

export function alteracoesDoTexto(texto: string | null | undefined): Alteracao[] {
  if (!texto) return []
  const t = juntar(texto)
  const r: Alteracao[] = []

  for (const m of t.matchAll(COMANDO)) {
    const inicio = m.index ?? 0
    // A lei alterada está no comando, entre o artigo da proposta e "passa a vigorar"
    const antes = t.slice(Math.max(0, inicio - 300), inicio)
    const lei = leisCitadas(antes.split(/\bArt\.?\s*\d+\s*[º°o]?\s+(?=[A-ZÀ-Ú])/).pop() || antes).pop()
    if (!lei) continue
    const acrescimo = /acrescid/i.test(m[0])
    const { citado } = blocoCitado(t, inicio + m[0].length)
    for (const a of porArtigo(citado)) {
      r.push({ lei, tipo: acrescimo || /-[A-Z]$/.test(a.artigo) ? 'acrescimo' : 'nova_redacao', dispositivo: a.dispositivo, artigo: a.artigo, proposto: a.texto })
    }
  }

  for (const m of t.matchAll(REVOGA)) {
    const lei = leisCitadas(m[2]).pop()
    if (!lei) continue
    for (const pedaco of m[1].split(/\s*[,;]\s*|\s+e\s+(?=(?:o|os|a|as)\s)/)) {
      const art = /\bart(?:igo)?s?\.?\s*(\d+)\s*[º°o]?((?:-[A-Z])?)/i.exec(pedaco)
      if (!art) continue
      const dispositivo = pedaco.replace(/^(?:o|os|a|as)\s+/i, '').trim()
      r.push({ lei, tipo: 'revogacao', dispositivo: dispositivo.charAt(0).toUpperCase() + dispositivo.slice(1), artigo: `${art[1]}${art[2].toUpperCase()}`, proposto: '' })
    }
  }
  return r
}

/**
 * Recorta um artigo do texto compilado da lei (redação vigente): do "Art. 4º" até o próximo artigo.
 * Devolve vazio se o artigo não existe (é acréscimo) ou o texto não foi carregado.
 */
export function artigoDaLei(textoLei: string | null | undefined, artigo: string): string {
  if (!textoLei) return ''
  const [num, letra = ''] = artigo.split('-')
  const t = textoLei.replace(/\r/g, '')
  const cab = new RegExp(`(?:^|\\n)\\s*(Art\\.?\\s*${num}\\s*[º°o]?${letra ? `\\s*-\\s*${letra}` : '(?!\\s*-\\s*[A-Z])'}(?![\\d])[\\s.][\\s\\S]*?)(?=\\n\\s*Art\\.?\\s*\\d|$)`, 'i')
  const m = cab.exec(t)
  return m ? m[1].replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim() : ''
}

/** Agrupa por lei alterada, na ordem em que aparecem. */
export function porLei(alteracoes: Alteracao[]): { lei: LeiCitada; itens: Alteracao[] }[] {
  const grupos = new Map<string, { lei: LeiCitada; itens: Alteracao[] }>()
  for (const a of alteracoes) {
    const k = a.lei.urn || a.lei.rotulo
    if (!grupos.has(k)) grupos.set(k, { lei: a.lei, itens: [] })
    grupos.get(k)!.itens.push(a)
  }
  return [...grupos.values()]
}
