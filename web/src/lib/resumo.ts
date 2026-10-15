/**
 * Conteúdo dos e-mails automáticos (docs/ENTREGA.md, seção "E-mails"):
 * - alerta diário: o que andou nas leis que a pessoa segue (no máximo 1 e-mail por dia);
 * - resumo semanal (sexta): nota do autor, pareceres da semana, pauta, o que andou, interesses, região e parlamentares seguidos.
 *   Quem informou o estado recebe a edição da sua região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul): nota regional do autor,
 *   se houver, e o bloco "Na sua região" com as leis dos estados da região e dos biomas que a cobrem. Sem estado, edição nacional.
 * Funções puras: recebem os dados já buscados e devolvem título, parágrafos e seções.
 */
import type { SecaoEmail } from './email'
import { ROTULO_CARATER, votoAFavorDaProtecao, type Carater } from './indicadores'
import { REGIAO, SITE_URL } from './rotulos'

export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const
export type Regiao = (typeof REGIOES)[number]
export const regiaoDe = (uf?: string | null) => (uf ? (REGIAO[uf.toUpperCase()] as Regiao | undefined) : undefined)
const ufsDaRegiao = (r: Regiao) => Object.keys(REGIAO).filter((uf) => REGIAO[uf] === r)

export type TipoEventoPublico = 'pauta' | 'urgencia' | 'substitutivo' | 'votacao' | 'aprovacao' | 'sancao' | 'veto'
export const EVENTOS_PUBLICOS: TipoEventoPublico[] = ['pauta', 'urgencia', 'substitutivo', 'votacao', 'aprovacao', 'sancao', 'veto']

const ROTULO_EVENTO: Record<TipoEventoPublico, string> = {
  pauta: 'Entrou na pauta',
  urgencia: 'Urgência aprovada',
  substitutivo: 'Texto substitutivo',
  votacao: 'Votação',
  aprovacao: 'Aprovada',
  sancao: 'Sanção',
  veto: 'Veto',
}

export type LeiResumo = { id: number; rotulo: string; titulo?: string | null; slug: string; temas: number[]; biomas: number[]; uf?: string | null }
export type EventoResumo = { leiId: number; tipo: TipoEventoPublico; descricao: string; data: string; orgao?: string | null }
export type ParecerResumo = { leiId: number; titulo: string; slug: string; carater?: Carater | null; resumo?: string }
export type VotoResumo = { parlamentarId: number; nome: string; partido?: string | null; uf?: string | null; voto: string; leiId: number; data: string }
export type InscritoResumo = {
  nome?: string | null
  uf?: string | null
  temas: number[]
  biomas: number[]
  seguindo: number[]
  seguirParlamentares: number[]
}

const dataCurta = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso))
const nomeDaLei = (l: LeiResumo) => (l.titulo ? `${l.titulo} (${l.rotulo})` : l.rotulo)
const urlLei = (l: LeiResumo) => `${SITE_URL}/leis/${l.slug}`
const curto = (t: string, n = 180) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)
const primeiroNome = (n?: string | null) => n?.trim().split(/\s+/)[0] || ''

function itemDeEvento(e: EventoResumo, lei: LeiResumo) {
  const quando = e.tipo === 'pauta' ? `${dataCurta(e.data)}${e.orgao ? ` · ${e.orgao}` : ''}` : dataCurta(e.data)
  return { texto: `${ROTULO_EVENTO[e.tipo]}: ${curto(e.descricao.replace(/^[^:]{0,40}:\s*/, ''), 160)}`, detalhe: quando, url: urlLei(lei) }
}

/** Alerta diário: uma seção por lei seguida que andou. */
export function montarAlerta(inscrito: Pick<InscritoResumo, 'nome'>, porLei: { lei: LeiResumo; eventos: EventoResumo[] }[]) {
  const com = porLei.filter((x) => x.eventos.length)
  if (!com.length) return null
  const titulo = com.length === 1 ? `${com[0].lei.titulo || com[0].lei.rotulo} andou` : `${com.length} leis que você segue andaram`
  const ola = primeiroNome(inscrito.nome)
  return {
    titulo,
    assunto: com.length === 1 ? `Novidade: ${com[0].lei.rotulo}` : `Novidades em ${com.length} leis que você segue`,
    paragrafos: [`${ola ? `${ola}, ` : ''}${com.length === 1 ? 'a lei que você segue teve novidade' : 'as leis que você segue tiveram novidades'} na tramitação oficial.`],
    secoes: com.map(
      ({ lei, eventos }): SecaoEmail => ({
        titulo: nomeDaLei(lei),
        itens: [...eventos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4).map((e) => itemDeEvento(e, lei)),
      }),
    ),
  }
}

const interessa = (l: LeiResumo, i: InscritoResumo) => l.temas.some((t) => i.temas.includes(t)) || l.biomas.some((b) => i.biomas.includes(b))
/** Lei da região de quem recebe: do próprio estado (0), de outro estado da região (1) ou de bioma que cobre a região (2). */
function pesoDaRegiao(l: LeiResumo, i: InscritoResumo, ufsDoBioma: Map<number, string[]>): number | null {
  const regiao = regiaoDe(i.uf)
  if (!regiao) return null
  const ufs = ufsDaRegiao(regiao)
  const uf = l.uf?.toUpperCase()
  if (uf && uf === i.uf!.toUpperCase()) return 0
  if (uf && ufs.includes(uf)) return 1
  if (l.biomas.some((b) => (ufsDoBioma.get(b) || []).some((x) => ufs.includes(x.toUpperCase())))) return 2
  return null
}

export type DadosResumo = {
  inicio: string
  fim: string
  nota?: string | null
  leis: Map<number, LeiResumo>
  pareceres: ParecerResumo[]
  eventos: EventoResumo[]
  pauta: EventoResumo[]
  votos: VotoResumo[]
  /** Caráter do parecer publicado de cada lei (para o sentido do voto). */
  carater: Map<number, Carater>
  ufsDoBioma: Map<number, string[]>
  /** Nota do autor para cada edição regional desta semana (opcional). */
  notasRegionais?: Partial<Record<Regiao, string>>
}

/** Resumo semanal de um inscrito. Devolve null quando não há o que contar (o e-mail não sai vazio). */
export function montarResumo(i: InscritoResumo, d: DadosResumo) {
  const secoes: SecaoEmail[] = []
  const ja = new Set<number>()
  const lei = (id: number) => d.leis.get(id)
  const regiao = regiaoDe(i.uf)
  const daRegiao = (id: number) => (lei(id) ? pesoDaRegiao(lei(id)!, i, d.ufsDoBioma) !== null : false)
  // Ordem de destaque: seguidas, da região, do interesse, o resto
  const ordem = (id: number) => (i.seguindo.includes(id) ? 0 : daRegiao(id) ? 1 : lei(id) && interessa(lei(id)!, i) ? 2 : 3)

  // 1. Pareceres publicados na semana (os seguidos, da região e de interesse primeiro)
  const pareceres = [...d.pareceres].sort((a, b) => ordem(a.leiId) - ordem(b.leiId))
  secoes.push({
    titulo: 'Pareceres publicados',
    itens: pareceres.slice(0, 10).map((p) => ({
      texto: p.titulo,
      url: `${SITE_URL}/pareceres/${p.slug}`,
      detalhe: [p.carater ? `Caráter: ${ROTULO_CARATER[p.carater]}` : '', p.resumo ? curto(p.resumo, 200) : ''].filter(Boolean).join(' · ') || undefined,
    })),
  })

  // 2. Em votação nos próximos dias
  const pauta = d.pauta.filter((e) => lei(e.leiId)).sort((a, b) => ordem(a.leiId) - ordem(b.leiId) || a.data.localeCompare(b.data))
  secoes.push({
    titulo: 'Em votação nos próximos dias',
    itens: pauta.slice(0, 8).map((e) => ({ texto: nomeDaLei(lei(e.leiId)!), url: urlLei(lei(e.leiId)!), detalhe: `${dataCurta(e.data)}${e.orgao ? ` · ${e.orgao}` : ''}` })),
  })

  // 3–5. O que andou: nas leis seguidas, do interesse, da região
  const porLei = new Map<number, EventoResumo[]>()
  for (const e of d.eventos) if (lei(e.leiId)) porLei.set(e.leiId, [...(porLei.get(e.leiId) || []), e])
  const ultimo = (id: number) => [...(porLei.get(id) || [])].sort((a, b) => b.data.localeCompare(a.data))[0]
  const bloco = (titulo: string, filtro: (l: LeiResumo) => boolean, max: number, peso: (l: LeiResumo) => number = () => 0) => {
    const ids = [...porLei.keys()]
      .filter((id) => !ja.has(id) && filtro(lei(id)!))
      .sort((a, b) => peso(lei(a)!) - peso(lei(b)!))
      .slice(0, max)
    ids.forEach((id) => ja.add(id))
    secoes.push({ titulo, itens: ids.map((id) => ({ ...itemDeEvento(ultimo(id), lei(id)!), texto: nomeDaLei(lei(id)!), detalhe: itemDeEvento(ultimo(id), lei(id)!).texto })) })
  }
  bloco('O que andou nas leis que você segue', (l) => i.seguindo.includes(l.id), 10)
  bloco('Do seu interesse', (l) => interessa(l, i), 6)
  bloco(`Na sua região${regiao ? ` (${regiao})` : ''}`, (l) => pesoDaRegiao(l, i, d.ufsDoBioma) !== null, 6, (l) => pesoDaRegiao(l, i, d.ufsDoBioma) ?? 9)

  // 6. Parlamentares que você segue
  const votos = d.votos.filter((v) => i.seguirParlamentares.includes(v.parlamentarId) && lei(v.leiId))
  secoes.push({
    titulo: 'Parlamentares que você segue',
    itens: votos.slice(0, 10).map((v) => {
      const c = d.carater.get(v.leiId)
      const sentido = c ? votoAFavorDaProtecao(v.voto, c) : null
      const rotuloVoto = v.voto === 'sim' ? 'Sim' : v.voto === 'nao' ? 'Não' : v.voto === 'abstencao' ? 'abstenção' : v.voto === 'obstrucao' ? 'obstrução' : 'ausente'
      return {
        texto: `${v.nome}${v.partido ? ` (${v.partido}${v.uf ? `-${v.uf}` : ''})` : ''} votou ${rotuloVoto} · ${lei(v.leiId)!.rotulo}`,
        url: urlLei(lei(v.leiId)!),
        detalhe: c ? `Parecer: ${ROTULO_CARATER[c]}${sentido === null ? '' : sentido ? ' · voto a favor da proteção' : ' · voto contra a proteção'}` : 'Ainda sem parecer publicado',
      }
    }),
  })

  const comConteudo = secoes.filter((s) => s.itens.length)
  const notaRegional = regiao ? d.notasRegionais?.[regiao]?.trim() : undefined
  if (!comConteudo.length && !d.nota?.trim() && !notaRegional) return null
  const ola = primeiroNome(i.nome)
  const paragrafos = (t?: string | null) => (t?.trim() ? t.trim().split(/\n{2,}/) : [])
  return {
    titulo: `Resumo da semana · ${regiao ? `edição ${regiao} · ` : ''}${dataCurta(d.inicio)} a ${dataCurta(d.fim)}`,
    assunto: `Resumo da semana${regiao ? ` (${regiao})` : ''}: ${comConteudo.length ? comConteudo.map((s) => s.titulo.split(' (')[0].toLowerCase()).slice(0, 2).join(', ') : 'nota do autor'}`,
    paragrafos: [...paragrafos(d.nota), ...paragrafos(notaRegional), `${ola ? `${ola}, ` : ''}o que aconteceu nas leis ambientais esta semana${regiao ? `, com destaque para a região ${regiao}` : ''}.`],
    secoes: comConteudo,
  }
}
