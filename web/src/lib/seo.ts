/** Títulos, descrições e dados estruturados (docs/SEO.md). */
import { CARATER, IMPACTO, NOME_SITE, SITE_URL } from './rotulos'

export const url = (caminho: string) => `${SITE_URL}${caminho.startsWith('/') ? caminho : `/${caminho}`}`

/** O título só promete parecer quando ele está prometido (situação "em preparação"). */
export function tituloLei(p: { rotulo?: string | null; titulo?: string | null }, estado: 'parecer' | 'em_preparacao' | 'acompanhando') {
  const base = `${p.rotulo}${p.titulo ? ` — ${p.titulo}` : ''}`
  if (estado === 'parecer') return `${base}: texto, tramitação e votação`
  if (estado === 'em_preparacao') return `${base}: o que é, situação e votação — parecer em breve`
  return `${base}: o que é, situação e votação`
}

export function tituloParecer(par: { seo?: { tituloSeo?: string | null } | null }, p: { rotulo?: string | null; titulo?: string | null }) {
  return par.seo?.tituloSeo || `${p.rotulo}: parecer técnico${p.titulo ? ` — ${p.titulo}` : ''}`
}

// Ponto de abreviatura ("Dep.", "Sen.", "nº", "art.") não termina a frase
const ABREVIATURAS = /(?:^|\s)(?:Dep|Deps|Sen|Est|Dr|Dra|Sr|Sra|Prof|Gov|Ver|art|arts|inc|al|n|nº)\.$/i
function primeiraFrase(t: string) {
  for (const m of t.matchAll(/[.!?](?=\s|$)/g)) {
    const ate = t.slice(0, (m.index ?? 0) + 1)
    if (!ABREVIATURAS.test(ate)) return ate.trim()
  }
  return t.trim()
}
export function cortar(t: string, max = 155) {
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function descricaoParecer(par: { seo?: { metaDescricao?: string | null } | null; impacto?: string | null; carater?: string | null }, resumo: string) {
  if (par.seo?.metaDescricao) return par.seo.metaDescricao
  const etiquetas = [par.impacto ? IMPACTO[par.impacto] : '', par.carater ? CARATER[par.carater]?.rotulo.toLowerCase() : ''].filter(Boolean).join(', ')
  return cortar(`Parecer técnico: ${primeiraFrase(resumo)}${etiquetas ? ` ${etiquetas}.` : ''}`)
}

type LeiAlterada = { rotulo: string; tipo?: string; nomePopular?: string | null; urn?: string | null; url?: string | null }

/** "Altera a Lei nº 12.651/2012 (Código Florestal)." — a lei alterada, com o nome pelo qual é procurada. */
export function fraseAlteracao(leis: LeiAlterada[]) {
  if (!leis.length) return ''
  const um = (l: LeiAlterada) => `${/^Decreto/i.test(l.tipo || l.rotulo) ? 'o' : 'a'} ${l.rotulo}${l.nomePopular ? ` (${l.nomePopular})` : ''}`
  const nomes = leis.slice(0, 3).map(um)
  return `Altera ${nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0]}.`
}

export function descricaoLei(p: { ementa?: string | null }, frase: string, estado: 'parecer' | 'em_preparacao' | 'acompanhando', alteradas: LeiAlterada[] = []) {
  const fim = estado === 'parecer' ? ' Leia o parecer técnico.' : estado === 'em_preparacao' ? ' Parecer técnico em preparação.' : ''
  const altera = fraseAlteracao(alteradas)
  const base = primeiraFrase(frase || p.ementa || '')
  const tudo = `${base}${altera ? ` ${altera}` : ''}${fim}`
  // Se não couber, a lei alterada vem primeiro: é por ela que muita gente procura
  return cortar(tudo.length <= 155 || !altera ? tudo : `${altera} ${base}`)
}

/** Palavras-chave do editor (seção SEO) + leis alteradas, sem repetição e sem vazio. */
export function palavrasDaPagina(seo: { palavraChave?: string | null; nomePopular?: string | null; secundarias?: (string | null)[] | null } | null | undefined, alteradas: LeiAlterada[] = []) {
  const todas = [seo?.palavraChave, seo?.nomePopular, ...(seo?.secundarias || []), ...alteradas.flatMap((l) => [l.nomePopular, l.rotulo])]
  const vistas = new Set<string>()
  return todas.filter((t): t is string => {
    const k = (t || '').trim().toLowerCase()
    if (!k || vistas.has(k)) return false
    vistas.add(k)
    return true
  })
}

const legislacaoAlterada = (l: LeiAlterada) => ({
  '@type': 'Legislation',
  name: l.nomePopular ? `${l.rotulo} (${l.nomePopular})` : l.rotulo,
  alternateName: l.nomePopular || undefined,
  legislationIdentifier: l.urn || l.rotulo,
  url: l.url || undefined,
})

type Pessoa = { nome: string; titulo?: string | null; slug?: string | null; foto?: string | null; redes?: (string | null | undefined)[] }

export function jsonLdParecer(a: {
  titulo: string
  caminho: string
  publicadoEm?: string | null
  atualizadoEm?: string | null
  autor?: Pessoa | null
  lei: { nome: string; identificador: string; jurisdicao: string }
  palavras?: string[]
  alteradas?: LeiAlterada[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.titulo,
    url: url(a.caminho),
    mainEntityOfPage: url(a.caminho),
    datePublished: a.publicadoEm || undefined,
    dateModified: a.atualizadoEm || a.publicadoEm || undefined,
    inLanguage: 'pt-BR',
    author: a.autor
      ? {
          '@type': 'Person',
          name: a.autor.nome,
          jobTitle: a.autor.titulo || undefined,
          url: a.autor.slug ? url(`/autores/${a.autor.slug}`) : undefined,
          image: a.autor.foto || undefined,
          sameAs: (a.autor.redes || []).filter(Boolean),
        }
      : undefined,
    about: { '@type': 'Legislation', name: a.lei.nome, legislationIdentifier: a.lei.identificador, legislationJurisdiction: a.lei.jurisdicao },
    keywords: a.palavras?.length ? a.palavras.join(', ') : undefined,
    mentions: a.alteradas?.length ? a.alteradas.map(legislacaoAlterada) : undefined,
    publisher: { '@type': 'Organization', name: NOME_SITE, url: SITE_URL, logo: `${SITE_URL}/marca/logo.png` },
  }
}

export function jsonLdLei(a: {
  nome: string
  identificador: string
  jurisdicao: string
  caminho: string
  data?: string | null
  situacao?: string
  nomePopular?: string | null
  palavras?: string[]
  alteradas?: LeiAlterada[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name: a.nome,
    legislationIdentifier: a.identificador,
    legislationJurisdiction: a.jurisdicao,
    legislationDate: a.data ? a.data.slice(0, 10) : undefined,
    legislationLegalForce: a.situacao,
    alternateName: a.nomePopular || undefined,
    keywords: a.palavras?.length ? a.palavras.join(', ') : undefined,
    // schema.org: "outra legislação que esta legislação altera"
    legislationChanges: a.alteradas?.length ? a.alteradas.map(legislacaoAlterada) : undefined,
    url: url(a.caminho),
    inLanguage: 'pt-BR',
  }
}

export function jsonLdTrilha(itens: { nome: string; caminho: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, item: url(it.caminho) })),
  }
}

export function jsonLdSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: NOME_SITE,
    url: SITE_URL,
    inLanguage: 'pt-BR',
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/busca?q={termo}`, 'query-input': 'required name=termo' },
  }
}

/** Jurisdição no formato do schema.org: "BR" ou "BR-PA". */
export const jurisdicao = (esfera: string, uf?: string | null) => (esfera === 'federal' || !uf ? 'BR' : `BR-${uf}`)
