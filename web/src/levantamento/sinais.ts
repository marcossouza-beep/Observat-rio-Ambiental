/**
 * Sinais extraídos de uma resposta HTTP, para o levantamento A–D. Funções puras (testadas em tests/unit/levantamento.spec.ts).
 */

export type Sinais = {
  /** A resposta é JSON válido. */
  json: boolean
  /** XML, RSS ou Atom. */
  xml: boolean
  /** Arquivo de dados para baixar (ZIP, CSV, planilha). */
  arquivo?: boolean
  /** Resposta da API do SAPL (Interlegis): JSON com "pagination" e "results". */
  sapl: boolean
  /** A página cita o SAPL ou aponta para uma instância dele. */
  citaSapl: boolean
  /** Quantidade de registros quando a API informa (SAPL e afins). */
  registros?: number
  pdfs: number
  /** Links que parecem levar a proposições, projetos, matérias ou tramitação. */
  linksProposicao: number
  /** Links para dados abertos, API, webservice, arquivos .json/.xml/.csv. */
  linksDados: string[]
  citaDadosAbertos: boolean
  /** Página que só monta o conteúdo no navegador (pouco texto e muito script). */
  spa: boolean
  /** Bloqueio de robô: captcha, desafio do Cloudflare. */
  bloqueio: boolean
  titulo?: string
  /** Texto visível aproximado, em caracteres. */
  texto: number
}

const RE_PROPOSICAO = /proposi|projeto|mat[eé]ria|tramita|pesquisa-?legisl|processo-?legisl|ple\b/i
const RE_DADOS = /dados[-_ ]?abertos|\/api\b|\/api\/|webservice|\/ws\/|\.json\b|\.xml\b|\.csv\b|swagger|openapi|\/rss/i

export function linksDe(html: string, base: string): { href: string; texto: string }[] {
  const out: { href: string; texto: string }[] = []
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = new URL(m[1].trim(), base).toString()
      if (!/^https?:/.test(href)) continue
      out.push({ href, texto: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) })
    } catch {
      // link inválido
    }
  }
  return out
}

export function sinaisDe(corpo: string, tipo: string, base: string): Sinais {
  const t = corpo.trimStart()
  let json = false
  let sapl = false
  let registros: number | undefined
  if (/json/i.test(tipo) || t.startsWith('{') || t.startsWith('[')) {
    try {
      const v = JSON.parse(t) as Record<string, unknown>
      json = true
      if (v && typeof v === 'object' && 'pagination' in v && 'results' in v) {
        sapl = true
        const p = v.pagination as { total_entries?: number } | undefined
        if (typeof p?.total_entries === 'number') registros = p.total_entries
      }
    } catch {
      // não é JSON
    }
  }
  const xml = !json && (/xml|rss|atom/i.test(tipo) || /^<\?xml|^<rss|^<feed/i.test(t))
  const arquivo = !json && !xml && /zip|csv|octet-stream|spreadsheet|excel/i.test(tipo)
  const html = !json && !xml && !arquivo ? corpo : ''
  const links = html ? linksDe(html, base) : []
  const textoVisivel = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const scripts = (html.match(/<script\b/gi) || []).length
  return {
    json,
    xml,
    arquivo,
    sapl,
    citaSapl: /sapl/i.test(html) || links.some((l) => /\/\/sapl\./i.test(l.href)),
    registros,
    pdfs: links.filter((l) => /\.pdf(\?|$)/i.test(l.href)).length,
    linksProposicao: links.filter((l) => RE_PROPOSICAO.test(l.href) || RE_PROPOSICAO.test(l.texto)).length,
    linksDados: [...new Set(links.filter((l) => RE_DADOS.test(l.href) || /dados abertos/i.test(l.texto)).map((l) => l.href))].slice(0, 12),
    citaDadosAbertos: /dados abertos/i.test(textoVisivel),
    spa: !!html && textoVisivel.length < 400 && scripts >= 3,
    bloqueio: /cf-chl|challenge-platform|g-recaptcha|hcaptcha|captcha/i.test(html) && textoVisivel.length < 2000,
    titulo: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 120),
    texto: textoVisivel.length,
  }
}

/** Links da página que vale sondar também (proposições, dados abertos, SAPL, diário), sem repetir. */
export function linksPromissores(html: string, base: string, max = 8): string[] {
  const host = new URL(base).hostname.replace(/^www\./, '')
  const vistos = new Set<string>()
  const bons: string[] = []
  for (const l of linksDe(html, base)) {
    const h = new URL(l.href).hostname.replace(/^www\./, '')
    const mesmoSite = h === host || h.endsWith('.' + host) || host.endsWith('.' + h) || /\.(leg|gov)\.br$/.test(h)
    if (!mesmoSite || vistos.has(l.href) || /\.(pdf|jpg|png|zip|doc)/i.test(l.href)) continue
    if (/sapl|dados[-_ ]?abertos|\/api|webservice|proposi|projeto|mat[eé]ria|tramita|di[aá]rio/i.test(l.href + ' ' + l.texto)) {
      vistos.add(l.href)
      bons.push(l.href)
    }
    if (bons.length >= max) break
  }
  return bons
}
