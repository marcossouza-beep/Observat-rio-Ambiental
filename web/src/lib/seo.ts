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

const primeiraFrase = (t: string) => (t.match(/^.*?[.!?](\s|$)/)?.[0] || t).trim()
export function cortar(t: string, max = 155) {
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function descricaoParecer(par: { seo?: { metaDescricao?: string | null } | null; impacto?: string | null; carater?: string | null }, resumo: string) {
  if (par.seo?.metaDescricao) return par.seo.metaDescricao
  const etiquetas = [par.impacto ? IMPACTO[par.impacto] : '', par.carater ? CARATER[par.carater]?.rotulo.toLowerCase() : ''].filter(Boolean).join(', ')
  return cortar(`Parecer técnico: ${primeiraFrase(resumo)}${etiquetas ? ` ${etiquetas}.` : ''}`)
}

export function descricaoLei(p: { ementa?: string | null }, frase: string, estado: 'parecer' | 'em_preparacao' | 'acompanhando') {
  const fim = estado === 'parecer' ? ' Leia o parecer técnico.' : estado === 'em_preparacao' ? ' Parecer técnico em preparação.' : ''
  return cortar(`${primeiraFrase(frase || p.ementa || '')}${fim}`)
}

type Pessoa = { nome: string; titulo?: string | null; slug?: string | null; foto?: string | null; redes?: (string | null | undefined)[] }

export function jsonLdParecer(a: {
  titulo: string
  caminho: string
  publicadoEm?: string | null
  atualizadoEm?: string | null
  autor?: Pessoa | null
  lei: { nome: string; identificador: string; jurisdicao: string }
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
    publisher: { '@type': 'Organization', name: NOME_SITE, url: SITE_URL },
  }
}

export function jsonLdLei(a: { nome: string; identificador: string; jurisdicao: string; caminho: string; data?: string | null; situacao?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name: a.nome,
    legislationIdentifier: a.identificador,
    legislationJurisdiction: a.jurisdicao,
    legislationDate: a.data ? a.data.slice(0, 10) : undefined,
    legislationLegalForce: a.situacao,
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
