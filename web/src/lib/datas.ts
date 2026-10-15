/**
 * Datas e prazos em dias corridos e dias úteis, no fuso de Brasília.
 *
 * Feriados nacionais: Lei 662/1949, Lei 10.607/2002 e Lei 14.759/2023 (Consciência Negra),
 * mais a Sexta-feira Santa. Carnaval e Corpus Christi são ponto facultativo federal e
 * só contam como não úteis quando `pontosFacultativos` for verdadeiro.
 */

export const FUSO = 'America/Sao_Paulo'

/** Data "civil" (ano, mês, dia) sem hora, para contar dias sem erro de fuso. */
export type DataCivil = { ano: number; mes: number; dia: number }

export function dataCivil(d: Date, fuso = FUSO): DataCivil {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  return { ano: v('year'), mes: v('month'), dia: v('day') }
}

const paraUTC = (c: DataCivil) => Date.UTC(c.ano, c.mes - 1, c.dia)
const deUTC = (ms: number): DataCivil => {
  const d = new Date(ms)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
}
const DIA = 86_400_000

export const somarDias = (c: DataCivil, n: number): DataCivil => deUTC(paraUTC(c) + n * DIA)
export const diferencaDias = (a: DataCivil, b: DataCivil): number =>
  Math.round((paraUTC(a) - paraUTC(b)) / DIA)
export const chave = (c: DataCivil) =>
  `${c.ano}-${String(c.mes).padStart(2, '0')}-${String(c.dia).padStart(2, '0')}`
export const formatarCurta = (c: DataCivil) =>
  `${String(c.dia).padStart(2, '0')}/${String(c.mes).padStart(2, '0')}`

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): DataCivil {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return { ano, mes, dia }
}

export function feriados(ano: number, pontosFacultativos = false): Set<string> {
  const fixos: [number, number][] = [
    [1, 1],
    [4, 21],
    [5, 1],
    [9, 7],
    [10, 12],
    [11, 2],
    [11, 15],
    [11, 20],
    [12, 25],
  ]
  const s = new Set(fixos.map(([m, d]) => chave({ ano, mes: m, dia: d })))
  const p = pascoa(ano)
  s.add(chave(somarDias(p, -2))) // Sexta-feira Santa
  if (pontosFacultativos) {
    s.add(chave(somarDias(p, -48))) // segunda de Carnaval
    s.add(chave(somarDias(p, -47))) // terça de Carnaval
    s.add(chave(somarDias(p, 60))) // Corpus Christi
  }
  return s
}

export function ehDiaUtil(c: DataCivil, pontosFacultativos = false): boolean {
  const semana = new Date(paraUTC(c)).getUTCDay()
  if (semana === 0 || semana === 6) return false
  return !feriados(c.ano, pontosFacultativos).has(chave(c))
}

/**
 * Soma `n` dias úteis a partir de `inicio`. O dia de início não conta
 * (pedido recebido na terça + 3 dias úteis = sexta).
 */
export function somarDiasUteis(inicio: DataCivil, n: number, pontosFacultativos = false): DataCivil {
  let atual = inicio
  let restantes = n
  while (restantes > 0) {
    atual = somarDias(atual, 1)
    if (ehDiaUtil(atual, pontosFacultativos)) restantes--
  }
  return atual
}

/** Guarda uma data civil como meio-dia de Brasília (15h UTC), para não mudar de dia ao exibir. */
export const civilParaISO = (c: DataCivil) => `${chave(c)}T15:00:00.000Z`
export const isoParaCivil = (iso: string | Date) => dataCivil(new Date(iso))
