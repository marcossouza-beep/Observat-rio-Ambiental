/** Utilitários comuns aos mapeadores. */

/** O Senado converte XML em JSON: um item sozinho vem como objeto, vários como lista. */
export function lista<T = Record<string, unknown>>(v: unknown): T[] {
  if (v == null) return []
  return (Array.isArray(v) ? v : [v]).filter((x) => x && typeof x === 'object' && !('_cortado' in (x as object))) as T[]
}

/**
 * Data/hora das casas (horário de Brasília, sem fuso) para ISO em UTC.
 * Aceita "2025-07-16T10:00", "2021-06-11 07:24:23", "2025-05-21" e "2026-10-15T10:00:00.000".
 * Datas sem hora ficam ao meio-dia de Brasília, para não mudar de dia ao exibir.
 */
export function dataBrasilia(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(v.trim())
  if (!m) return undefined
  // "T00:00" nas fichas quer dizer "sem hora": vale como data só.
  const semHora = !m[4] || (m[4] === '00' && m[5] === '00' && (!m[6] || m[6] === '00'))
  const [, a, me, d] = m
  const [h, mi, s] = semHora ? ['12', '00', '00'] : [m[4], m[5], m[6] || '00']
  const ms = Date.UTC(+a, +me - 1, +d, +h + 3, +mi, +s)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined
}

export const inteiro = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : undefined
}

export const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : undefined)

/** Placar escrito na descrição da votação: "Sim: 231; Não: 87; Abstenção: 1; Total: 318." */
export function placarDaDescricao(descricao: string | null | undefined) {
  const n = (re: RegExp) => inteiro(re.exec(descricao || '')?.[1])
  return { placarSim: n(/Sim:\s*(\d+)/i), placarNao: n(/N[ãa]o:\s*(\d+)/i), placarAbstencao: n(/Absten[çc][ãa]o:\s*(\d+)/i) }
}

/** Primeira lista de objetos numa resposta, onde quer que esteja. */
export function primeiraLista(v: unknown, prof = 0): Record<string, unknown>[] {
  if (prof > 6 || !v) return []
  if (Array.isArray(v)) return lista(v)
  if (typeof v === 'object')
    for (const x of Object.values(v)) {
      const l = primeiraLista(x, prof + 1)
      if (l.length) return l
    }
  return []
}
