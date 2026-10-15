/**
 * Nota de relevância (0–100) de uma proposta captada, a partir do dicionário de palavras-chave.
 * Só separa o que pode ser ambiental para a triagem; quem decide é o autor.
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

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function contem(textoNorm: string, termo: string): boolean {
  const t = normalizar(termo)
  if (!t) return false
  return new RegExp(`(^|[^a-z0-9])${escapar(t)}([^a-z0-9]|$)`).test(textoNorm)
}

export type Resultado = { nota: number; encontrados: string[]; grupos: string[]; excluida: boolean }

/**
 * Soma os pesos (1–10) dos termos encontrados e satura em 100 com curva suave:
 * um termo forte (peso 10) dá ~63; dois termos fortes passam de 85.
 * Um termo de exclusão (ex.: "denominação de rodovia") zera a nota.
 */
export function pontuar(texto: string, dicionario: Termo[]): Resultado {
  const norm = normalizar(texto)
  const achados = dicionario.filter((d) => contem(norm, d.termo))
  const excluida = achados.some((d) => d.exclusao)
  const positivos = achados.filter((d) => !d.exclusao)
  const soma = positivos.reduce((s, d) => s + Math.max(0, Math.min(10, d.peso)), 0)
  const nota = excluida ? 0 : Math.round(100 * (1 - Math.exp(-soma / 10)))
  return {
    nota,
    encontrados: positivos.map((d) => d.termo),
    grupos: [...new Set(positivos.map((d) => d.grupo).filter((g): g is string => !!g))],
    excluida,
  }
}
