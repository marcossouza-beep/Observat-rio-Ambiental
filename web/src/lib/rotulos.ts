/** Rótulos e nomes usados nas páginas públicas. */

export const NOME_SITE = process.env.NEXT_PUBLIC_NOME_SITE || 'ênfase jur'
export const SITE_URL = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const UF_NOME: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

export const REGIAO: Record<string, string> = {
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
}

const DA = new Set(['BA', 'PB'])
const DE = new Set(['AL', 'GO', 'MG', 'PE', 'RO', 'RR', 'SC', 'SP', 'SE'])
/** "do Pará", "da Bahia", "de Goiás" */
export function deUF(uf: string): string {
  const nome = UF_NOME[uf] || uf
  return `${DA.has(uf) ? 'da' : DE.has(uf) ? 'de' : 'do'} ${nome}`
}

export const SITUACAO: Record<string, { rotulo: string; classe: string }> = {
  em_tramitacao: { rotulo: 'Em tramitação', classe: 'tg-tram' },
  aprovada: { rotulo: 'Aprovada', classe: 'tg-apr' },
  norma: { rotulo: 'Virou norma', classe: 'tg-apr' },
  vetada: { rotulo: 'Vetada', classe: 'tg-mal' },
  arquivada: { rotulo: 'Arquivada', classe: 'tg-neu' },
  rejeitada: { rotulo: 'Rejeitada', classe: 'tg-neu' },
}

export const CARATER: Record<string, { rotulo: string; classe: string }> = {
  malefico: { rotulo: 'Maléfico', classe: 'tg-mal' },
  enfraquece_indiretamente: { rotulo: 'Enfraquece indiretamente', classe: 'tg-ind' },
  neutro: { rotulo: 'Neutro', classe: 'tg-neu' },
  benefico: { rotulo: 'Benéfico', classe: 'tg-ben' },
}

export const IMPACTO: Record<string, string> = { alto: 'Alto impacto', medio: 'Médio impacto', baixo: 'Baixo impacto' }

export const CASA: Record<string, string> = {
  camara: 'Câmara dos Deputados',
  senado: 'Senado Federal',
  congresso: 'Congresso Nacional',
  presidencia: 'Presidência da República',
  assembleia: 'Assembleia Legislativa',
  camara_municipal: 'Câmara Municipal',
}

/** Artigo da sigla: "a PEC", "a MP", "a Lei", "o PL". */
export function artigo(sigla: string): 'a' | 'o' {
  return /^(PEC|MPV?|LEI|LC|RES|EMC|EC|IN)/i.test(sigla.trim()) ? 'a' : 'o'
}

const DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
export const dataBR = (iso?: string | null) => (iso ? DATA.format(new Date(iso)) : '')
const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })
export const dataLonga = (iso?: string | null) => (iso ? DATA_LONGA.format(new Date(iso)) : '')
