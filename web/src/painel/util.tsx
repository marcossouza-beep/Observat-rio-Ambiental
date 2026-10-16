import { situacaoPrazo, textoPrazo } from '../lib/compromissos'
import { isoParaCivil } from '../lib/datas'
import { posicoes } from '../lib/relevancia'

export const ADMIN = '/admin'
export const linkDoc = (colecao: string, id: string | number) => `${ADMIN}/collections/${colecao}/${id}`

export function ChipPrazo({ prazo, agora = new Date() }: { prazo?: string | null; agora?: Date }) {
  if (!prazo) return null
  const c = isoParaCivil(prazo)
  const { situacao } = situacaoPrazo(c, agora)
  const cls = situacao === 'atrasado' || situacao === 'vence_hoje' ? 'r' : situacao === 'perto' ? 'y' : 'g'
  return <span className={`obs-chip ${cls}`}>{textoPrazo(c, agora)}</span>
}

export const Chip = ({ cor, children }: { cor?: 'r' | 'y' | 'g' | 'b' | 'l' | ''; children: React.ReactNode }) => <span className={`obs-chip ${cor || ''}`}>{children}</span>

export const dataCurta = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso)) : ''

/** Início da semana (segunda, 00:00 em Brasília) em ISO. */
export function inicioDaSemana(agora = new Date()): string {
  const brt = new Date(agora.getTime() - 3 * 36e5)
  const dia = (brt.getUTCDay() + 6) % 7
  const seg = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - dia, 3)
  return new Date(seg).toISOString()
}

/** Destaca os termos encontrados na ementa, com as mesmas variações da nota (plural, hífen, acento). */
export function Destacar({ texto, termos }: { texto: string; termos?: string[] | null }) {
  const lista = (termos || []).filter(Boolean)
  if (!lista.length) return <>{texto}</>
  const marcas: [number, number][] = lista.flatMap((t) => posicoes(texto, t))
  marcas.sort((a, b) => a[0] - b[0])
  const partes: React.ReactNode[] = []
  let pos = 0
  marcas.forEach(([a, b], k) => {
    if (a < pos) return
    partes.push(texto.slice(pos, a), <mark key={k}>{texto.slice(a, b)}</mark>)
    pos = b
  })
  partes.push(texto.slice(pos))
  return <>{partes}</>
}
