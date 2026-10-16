/**
 * Nota de relevância (0–100) de uma proposta captada, a partir do dicionário de palavras-chave.
 * Só separa o que pode ser ambiental para a triagem; quem decide é o autor.
 * Cada termo vale também no plural (ou no singular), sem acento, sem diferença de maiúsculas e com hífen ou espaço.
 */

export type Termo = { termo: string; peso: number; exclusao?: boolean; grupo?: string }

export function normalizar(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Para a busca dos termos: além de normalizar, hífen vira espaço ("ecológico-econômico" = "ecológico econômico"). */
const paraBusca = (t: string) => normalizar(t.replace(/[-‐-―]/g, ' '))

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/**
 * Singular e plural de uma palavra já normalizada, como trecho de expressão regular:
 * unidade/unidades, ambiental/ambientais, emissão/emissões, sustentável/sustentáveis, ordem/ordens, mar/mares.
 * Vale tanto para o termo no singular quanto no plural.
 */
export function variantes(p: string): string {
  if (!/^[a-z]+$/.test(p)) return escapar(p)
  if (/^(de|e|a|o|em|ao|por|para|com|sem|que)$/.test(p)) return p
  const base = (re: RegExp) => escapar(p.replace(re, ''))
  if (/(oes|aes|aos)$/.test(p)) return `${base(/(oes|aes|aos)$/)}(?:ao|oes|aes|aos)`
  if (/ao$/.test(p)) return `${base(/ao$/)}(?:ao|oes|aes|aos)`
  // Palavras curtas ficam de fora das regras de -al/-el ("leis" é plural de "lei"; "mais", "país" e "mal" não mudam)
  if (p.length > 4 && /ais$/.test(p)) return `${base(/ais$/)}(?:al|ais)`
  if (p.length > 4 && /eis$/.test(p)) return `${base(/eis$/)}(?:el|eis)`
  if (p.length > 3 && /[aeou]l$/.test(p)) return `${base(/l$/)}(?:l|is)`
  if (/ns$/.test(p)) return `${base(/ns$/)}(?:m|ns)`
  if (/m$/.test(p)) return `${base(/m$/)}(?:m|ns)`
  if (/[rz]es$/.test(p)) return `${base(/es$/)}(?:es)?`
  if (/[rz]$/.test(p)) return `${p}(?:es)?`
  if (/[aeiou]s$/.test(p)) return `${base(/s$/)}s?`
  if (/[aeiou]$/.test(p)) return `${p}s?`
  return p
}

/** Forma de referência do termo (palavras no singular), para não contar duas vezes "agrotóxico" e "agrotóxicos". */
export function raiz(termo: string): string {
  return paraBusca(termo)
    .split(' ')
    .map((p) =>
      p
        .replace(/(oes|aes|aos)$/, 'ao')
        .replace(/^(.{2,})ais$/, '$1al')
        .replace(/^(.{2,})eis$/, '$1el')
        .replace(/ns$/, 'm')
        .replace(/([rz])es$/, '$1')
        .replace(/([aeiou])s$/, '$1'),
    )
    .join(' ')
}

const expressoes = new Map<string, RegExp | null>()
function expressao(termo: string): RegExp | null {
  if (expressoes.has(termo)) return expressoes.get(termo)!
  const t = paraBusca(termo)
  const re = t ? new RegExp(`(^|[^a-z0-9])${t.split(' ').map(variantes).join('\\s+')}([^a-z0-9]|$)`) : null
  if (expressoes.size > 5000) expressoes.clear()
  expressoes.set(termo, re)
  return re
}

function contem(textoNorm: string, termo: string): boolean {
  return !!expressao(termo)?.test(textoNorm)
}

/** Tira repetições: a mesma raiz conta uma vez (o maior peso) e o termo contido em outro achado não soma de novo. */
function semRepeticao(achados: Termo[]): Termo[] {
  const porRaiz = new Map<string, Termo>()
  for (const d of achados) {
    const r = raiz(d.termo)
    const atual = porRaiz.get(r)
    if (!atual || d.peso > atual.peso) porRaiz.set(r, d)
  }
  const unicos = [...porRaiz.entries()]
  return unicos.filter(([r]) => !unicos.some(([outra]) => outra !== r && ` ${outra} `.includes(` ${r} `))).map(([, d]) => d)
}

export type Resultado = { nota: number; encontrados: string[]; grupos: string[]; excluida: boolean }

/**
 * Soma os pesos (1–10) dos termos encontrados e satura em 100 com curva suave:
 * um termo forte (peso 10) dá ~63; dois termos fortes passam de 85.
 * Um termo de exclusão (ex.: "denominação de rodovia") zera a nota.
 */
export function pontuar(texto: string, dicionario: Termo[]): Resultado {
  const norm = paraBusca(texto)
  const achados = dicionario.filter((d) => contem(norm, d.termo))
  const excluida = achados.some((d) => d.exclusao)
  const positivos = semRepeticao(achados.filter((d) => !d.exclusao))
  const soma = positivos.reduce((s, d) => s + Math.max(0, Math.min(10, d.peso)), 0)
  const nota = excluida ? 0 : Math.round(100 * (1 - Math.exp(-soma / 10)))
  return {
    nota,
    encontrados: positivos.map((d) => d.termo),
    grupos: [...new Set(positivos.map((d) => d.grupo).filter((g): g is string => !!g))],
    excluida,
  }
}
