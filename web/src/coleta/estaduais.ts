/**
 * Conectores das fontes estaduais (Fases 5 e 6): Assembleias com SAPL (AC, AM, RO, TO; AL, PB, PI), o Diário da ALE-RR
 * (Roraima), a pesquisa de proposições da Alepa e o Banco de Leis da Alepa (Pará), o Diário do Legislativo da Bahia, o
 * expediente e a lista de proposições da Alece (Ceará) a pesquisa de proposições da ALMT (Mato Grosso) a API de dados abertos da ALMG (Minas Gerais) a API do processo legislativo da Alesp (São Paulo) o e-Legis da Alesc (Santa Catarina) e a ordem do dia da Alep (Paraná). A chave é o slug da fonte em Fontes.
 */
import { conectorAlba } from './alba/conector'
import { conectorAlep } from './alep/conector'
import { conectorAlece } from './alece/conector'
import { conectorAlesc } from './alesc/conector'
import { conectorAlerr } from './alerr/conector'
import { conectorAlesp } from './alesp/conector'
import { conectorAlmg } from './almg/conector'
import { conectorAlmt } from './almt/conector'
import { conectorLeisPara } from './alepa/leis'
import { conectorAlepa } from './alepa/conector'
import type { Conector } from './conector'
import { CONECTORES_SAPL, SAPL_CASAS } from './sapl/conector'

export const CONECTORES_ESTADUAIS: Record<string, Conector> = {
  ...CONECTORES_SAPL,
  'casa-rr': conectorAlerr,
  'casa-pa': conectorAlepa,
  'leis-pa': conectorLeisPara,
  'casa-ba': conectorAlba,
  'casa-ce': conectorAlece,
  'casa-mt': conectorAlmt,
  'casa-mg': conectorAlmg,
  'casa-sp': conectorAlesp,
  'casa-sc': conectorAlesc,
  'casa-pr': conectorAlep,
}

/** Dados da fonte quando ela ainda não existe em Fontes (a coleta cria). */
export const FONTES_ESTADUAIS: Record<string, { nome: string; nivel: 'A' | 'B' | 'C' | 'D'; esfera: 'estadual'; uf: string; url: string }> = {
  ...Object.fromEntries(SAPL_CASAS.map((c) => [`casa-${c.uf}`, { nome: c.nome, nivel: 'A' as const, esfera: 'estadual' as const, uf: c.uf.toUpperCase(), url: c.base }])),
  'casa-rr': { nome: 'Assembleia Legislativa de Roraima (Diário da ALE-RR)', nivel: 'C', esfera: 'estadual', uf: 'RR', url: 'https://diarios.al.rr.leg.br/' },
  'casa-pa': { nome: 'Assembleia Legislativa do Pará (pesquisa de proposições)', nivel: 'B', esfera: 'estadual', uf: 'PA', url: 'https://www.alepa.pa.gov.br/Home/Page/Proposicoes' },
  'leis-pa': { nome: 'Banco de Leis da Alepa (leis aprovadas do Pará)', nivel: 'A', esfera: 'estadual', uf: 'PA', url: 'https://bancodeleis.alepa.pa.gov.br/api.php' },
  'casa-ba': { nome: 'Assembleia Legislativa da Bahia (Diário do Legislativo)', nivel: 'C', esfera: 'estadual', uf: 'BA', url: 'https://egbanet.egba.ba.gov.br/alba' },
  'casa-ce': { nome: 'Assembleia Legislativa do Ceará (expediente e proposições)', nivel: 'B', esfera: 'estadual', uf: 'CE', url: 'https://www.al.ce.gov.br/legislativo/expediente-historico' },
  'casa-mt': { nome: 'Assembleia Legislativa de Mato Grosso (pesquisa de proposições)', nivel: 'B', esfera: 'estadual', uf: 'MT', url: 'https://www.al.mt.gov.br/proposicao' },
  'casa-mg': { nome: 'Assembleia Legislativa de Minas Gerais (dados abertos)', nivel: 'A', esfera: 'estadual', uf: 'MG', url: 'https://dadosabertos.almg.gov.br/documentacao/index' },
  'casa-sp': { nome: 'Assembleia Legislativa de São Paulo (processo legislativo)', nivel: 'A', esfera: 'estadual', uf: 'SP', url: 'https://www.al.sp.gov.br/propositura' },
  'casa-sc': { nome: 'Assembleia Legislativa de Santa Catarina (e-Legis)', nivel: 'B', esfera: 'estadual', uf: 'SC', url: 'https://portalelegis.alesc.sc.gov.br/proposicoes/processo-legislativo' },
  'casa-pr': { nome: 'Assembleia Legislativa do Paraná (ordem do dia)', nivel: 'C', esfera: 'estadual', uf: 'PR', url: 'https://www.assembleia.pr.leg.br/' },
}
