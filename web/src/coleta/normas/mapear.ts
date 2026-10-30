/**
 * normas.leg.br (Senado/Congresso): ficha da norma e texto vigente (Compilação Monovigente).
 * API pública usada pelo próprio site: GET /api/public/normas?urn=<URN>&tipo_documento=maior-detalhe.
 * Funções puras, testadas sobre respostas reais gravadas em tests/fixtures/coleta/normas/.
 */
export const NORMAS_LEG = 'https://normas.leg.br'

export const urlFicha = (urn: string) => `${NORMAS_LEG}/api/public/normas?urn=${urn}&tipo_documento=maior-detalhe`

type Ficha = {
  '@id'?: string
  headline?: string
  alternateName?: string[] | string
  encoding?: { version?: string; contentUrl?: string | null; additionalType?: string }[]
}

export type FichaNorma = {
  /** Endereço da norma no normas.leg.br, para o leitor */
  pagina: string | null
  /** "Lei da Política Nacional do Meio Ambiente" (sem o ano entre parênteses) */
  nomePopular: string | null
  /** HTML do texto vigente, pelo caminho público */
  urlVigente: string | null
}

export function lerFicha(json: unknown): FichaNorma {
  const f = (json || {}) as Ficha
  const nomes = Array.isArray(f.alternateName) ? f.alternateName : f.alternateName ? [f.alternateName] : []
  // O primeiro apelido é o código interno ("LEI-6938-1981-08-31"); o nome popular vem depois, com o ano no fim
  const popular = nomes.find((n) => !/^[A-Z]+-\d/.test(n))?.replace(/\s*\(\d{4}\)\s*$/, '').trim() || null
  const atual = f.encoding?.find((e) => e.version === 'Current' && e.contentUrl)
  return {
    pagina: f['@id'] || null,
    nomePopular: popular,
    // O site troca /api/binario/ por /api/public/binario/ para baixar o texto
    urlVigente: atual?.contentUrl ? atual.contentUrl.replace('/api/binario/', '/api/public/binario/') : null,
  }
}

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordm: 'º', ordf: 'ª', sect: '§', ndash: '–', mdash: '—', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', deg: '°' }

/**
 * HTML do texto vigente → texto com um dispositivo por linha (é o formato que o site recorta por artigo).
 * Redação antiga riscada (<strike>, <s>, <del>) sai: fica só o que está em vigor.
 */
export function textoDoHtml(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(strike|s|del)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr|table|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTIDADES[e.toLowerCase()] ?? m),
    )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}
