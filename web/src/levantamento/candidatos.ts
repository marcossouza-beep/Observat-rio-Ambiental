/**
 * Fase 4 — levantamento regional: endereços candidatos das 27 casas legislativas estaduais
 * (26 Assembleias + Câmara Legislativa do DF) e dos 27 Diários Oficiais.
 *
 * Esta lista é só o ponto de partida: a sondagem (sondar.ts, rodada no GitHub Actions) acessa
 * cada endereço e registra o que de fato responde. A classificação A–D sai do resultado
 * (classificacao.ts), nunca desta lista.
 *
 * Para todo estado a sondagem também tenta, sozinha, o SAPL do Interlegis no endereço padrão
 * (sapl.al.<uf>.leg.br), porque um mesmo conector serve a todas as casas que usam o SAPL.
 */

export type Candidato = {
  /** O que se espera encontrar: a página inicial, a busca de proposições, dados abertos, API… */
  papel: 'site' | 'proposicoes' | 'dados_abertos' | 'api' | 'diario'
  url: string
}

export type Orgao = { nome: string; sigla: string; candidatos: Candidato[] }
export type Estado = { uf: string; casa: Orgao; diario: Orgao }

const site = (url: string): Candidato => ({ papel: 'site', url })
const prop = (url: string): Candidato => ({ papel: 'proposicoes', url })
const dados = (url: string): Candidato => ({ papel: 'dados_abertos', url })
const api = (url: string): Candidato => ({ papel: 'api', url })
const doe = (url: string): Candidato => ({ papel: 'diario', url })

export const ESTADOS: Estado[] = [
  {
    uf: 'AC',
    casa: { nome: 'Assembleia Legislativa do Acre', sigla: 'Aleac', candidatos: [site('https://www.al.ac.leg.br/'), site('https://aleac.ac.leg.br/')] },
    diario: { nome: 'Diário Oficial do Acre', sigla: 'DOE-AC', candidatos: [doe('https://www.diario.ac.gov.br/')] },
  },
  {
    uf: 'AL',
    casa: { nome: 'Assembleia Legislativa de Alagoas', sigla: 'ALE-AL', candidatos: [site('https://www.al.al.leg.br/'), site('https://sapl.al.al.leg.br/')] },
    diario: { nome: 'Diário Oficial de Alagoas', sigla: 'DOE-AL', candidatos: [doe('https://diario.imprensaoficial.al.gov.br/'), doe('https://www.imprensaoficial.al.gov.br/')] },
  },
  {
    uf: 'AP',
    casa: { nome: 'Assembleia Legislativa do Amapá', sigla: 'Alap', candidatos: [site('https://www.al.ap.leg.br/'), site('https://www.al.ap.gov.br/')] },
    diario: { nome: 'Diário Oficial do Amapá', sigla: 'DOE-AP', candidatos: [doe('https://diofe.portal.ap.gov.br/'), doe('https://seadantigo.portal.ap.gov.br/diario-oficial')] },
  },
  {
    uf: 'AM',
    casa: {
      nome: 'Assembleia Legislativa do Amazonas',
      sigla: 'Aleam',
      candidatos: [site('https://www.aleam.gov.br/'), api('https://sapl.al.am.leg.br/api/materia/materialegislativa/?page_size=1')],
    },
    diario: { nome: 'Diário Oficial do Amazonas', sigla: 'DOE-AM', candidatos: [doe('https://diario.imprensaoficial.am.gov.br/'), doe('https://www.imprensaoficial.am.gov.br/')] },
  },
  {
    uf: 'BA',
    casa: { nome: 'Assembleia Legislativa da Bahia', sigla: 'Alba', candidatos: [site('https://www.al.ba.gov.br/'), prop('https://www.al.ba.gov.br/atividade-legislativa/proposicoes')] },
    diario: { nome: 'Diário Oficial da Bahia', sigla: 'DOE-BA', candidatos: [doe('https://dool.egba.ba.gov.br/'), doe('https://www.egba.ba.gov.br/')] },
  },
  {
    uf: 'CE',
    casa: { nome: 'Assembleia Legislativa do Ceará', sigla: 'Alece', candidatos: [site('https://www.al.ce.gov.br/'), prop('https://www.al.ce.gov.br/proposicoes')] },
    diario: { nome: 'Diário Oficial do Ceará', sigla: 'DOE-CE', candidatos: [doe('https://www.ceara.gov.br/diario-oficial/'), doe('http://imagens.seplag.ce.gov.br/')] },
  },
  {
    uf: 'DF',
    casa: { nome: 'Câmara Legislativa do Distrito Federal', sigla: 'CLDF', candidatos: [site('https://www.cl.df.gov.br/'), prop('https://ple.cl.df.gov.br/')] },
    diario: { nome: 'Diário Oficial do Distrito Federal', sigla: 'DODF', candidatos: [doe('https://www.dodf.df.gov.br/'), api('https://www.dodf.df.gov.br/index/jornal-json')] },
  },
  {
    uf: 'ES',
    casa: { nome: 'Assembleia Legislativa do Espírito Santo', sigla: 'Ales', candidatos: [site('https://www.al.es.gov.br/'), dados('https://www.al.es.gov.br/Transparencia/DadosAbertos')] },
    diario: { nome: 'Diário Oficial do Espírito Santo', sigla: 'DIO-ES', candidatos: [doe('https://ioes.dio.es.gov.br/'), doe('https://dio.es.gov.br/')] },
  },
  {
    uf: 'GO',
    casa: { nome: 'Assembleia Legislativa de Goiás', sigla: 'Alego', candidatos: [site('https://portal.al.go.leg.br/'), site('https://www.al.go.leg.br/')] },
    diario: { nome: 'Diário Oficial de Goiás', sigla: 'DOE-GO', candidatos: [doe('https://diariooficial.abc.go.gov.br/')] },
  },
  {
    uf: 'MA',
    casa: { nome: 'Assembleia Legislativa do Maranhão', sigla: 'Alema', candidatos: [site('https://www.al.ma.leg.br/')] },
    diario: { nome: 'Diário Oficial do Maranhão', sigla: 'DOE-MA', candidatos: [doe('https://www.diariooficial.ma.gov.br/')] },
  },
  {
    uf: 'MT',
    casa: { nome: 'Assembleia Legislativa de Mato Grosso', sigla: 'ALMT', candidatos: [site('https://www.al.mt.gov.br/'), prop('https://www.al.mt.gov.br/proposicao/')] },
    diario: { nome: 'Diário Oficial de Mato Grosso', sigla: 'Iomat', candidatos: [doe('https://www.iomat.mt.gov.br/')] },
  },
  {
    uf: 'MS',
    casa: { nome: 'Assembleia Legislativa de Mato Grosso do Sul', sigla: 'ALEMS', candidatos: [site('https://www.al.ms.gov.br/')] },
    diario: { nome: 'Diário Oficial de Mato Grosso do Sul', sigla: 'DOE-MS', candidatos: [doe('https://www.spdo.ms.gov.br/diariodoe')] },
  },
  {
    uf: 'MG',
    casa: {
      nome: 'Assembleia Legislativa de Minas Gerais',
      sigla: 'ALMG',
      candidatos: [
        site('https://www.almg.gov.br/'),
        dados('https://dadosabertos.almg.gov.br/'),
        api('https://dadosabertos.almg.gov.br/ws/proposicoes/pesquisa/direcionada?tp=1&formato=json&ano=2026'),
      ],
    },
    diario: { nome: 'Diário Oficial de Minas Gerais', sigla: 'DOMG', candidatos: [doe('https://www.jornalminasgerais.mg.gov.br/')] },
  },
  {
    uf: 'PA',
    casa: { nome: 'Assembleia Legislativa do Pará', sigla: 'Alepa', candidatos: [site('https://www.alepa.pa.gov.br/')] },
    diario: { nome: 'Diário Oficial do Pará', sigla: 'IOEPA', candidatos: [doe('https://www.ioepa.com.br/'), doe('https://www.ioepa.com.br/pages/')] },
  },
  {
    uf: 'PB',
    casa: { nome: 'Assembleia Legislativa da Paraíba', sigla: 'ALPB', candidatos: [site('https://www.al.pb.leg.br/')] },
    diario: { nome: 'Diário Oficial da Paraíba', sigla: 'DOE-PB', candidatos: [doe('https://auniao.pb.gov.br/doe')] },
  },
  {
    uf: 'PR',
    casa: { nome: 'Assembleia Legislativa do Paraná', sigla: 'Alep', candidatos: [site('https://www.assembleia.pr.leg.br/'), prop('https://consultas.assembleia.pr.leg.br/')] },
    diario: { nome: 'Diário Oficial do Paraná', sigla: 'DIOE-PR', candidatos: [doe('https://www.documentos.dioe.pr.gov.br/dioe/consultaPublicaPDF.do'), doe('https://www.dioe.pr.gov.br/')] },
  },
  {
    uf: 'PE',
    casa: { nome: 'Assembleia Legislativa de Pernambuco', sigla: 'Alepe', candidatos: [site('https://www.alepe.pe.gov.br/'), dados('https://dadosabertos.alepe.pe.gov.br/')] },
    diario: { nome: 'Diário Oficial de Pernambuco', sigla: 'DOE-PE', candidatos: [doe('https://diariooficial.cepe.com.br/')] },
  },
  {
    uf: 'PI',
    casa: { nome: 'Assembleia Legislativa do Piauí', sigla: 'Alepi', candidatos: [site('https://www.al.pi.leg.br/')] },
    diario: { nome: 'Diário Oficial do Piauí', sigla: 'DOE-PI', candidatos: [doe('https://www.diariooficial.pi.gov.br/')] },
  },
  {
    uf: 'RJ',
    casa: { nome: 'Assembleia Legislativa do Rio de Janeiro', sigla: 'Alerj', candidatos: [site('https://www.alerj.rj.gov.br/'), prop('http://alerjln1.alerj.rj.gov.br/scpro2327.nsf/Internet/LeiInt?OpenForm')] },
    diario: { nome: 'Diário Oficial do Rio de Janeiro', sigla: 'Ioerj', candidatos: [doe('https://www.ioerj.com.br/')] },
  },
  {
    uf: 'RN',
    casa: { nome: 'Assembleia Legislativa do Rio Grande do Norte', sigla: 'ALRN', candidatos: [site('https://www.al.rn.leg.br/'), site('https://www.al.rn.gov.br/')] },
    diario: { nome: 'Diário Oficial do Rio Grande do Norte', sigla: 'DOE-RN', candidatos: [doe('https://www.diariooficial.rn.gov.br/'), doe('http://diariooficial.rn.gov.br/dei/dorn3/')] },
  },
  {
    uf: 'RS',
    casa: { nome: 'Assembleia Legislativa do Rio Grande do Sul', sigla: 'ALRS', candidatos: [site('https://ww4.al.rs.gov.br/'), site('https://www.al.rs.gov.br/')] },
    diario: { nome: 'Diário Oficial do Rio Grande do Sul', sigla: 'DOE-RS', candidatos: [doe('https://www.diariooficial.rs.gov.br/')] },
  },
  {
    uf: 'RO',
    casa: { nome: 'Assembleia Legislativa de Rondônia', sigla: 'ALE-RO', candidatos: [site('https://www.al.ro.leg.br/')] },
    diario: { nome: 'Diário Oficial de Rondônia', sigla: 'Diof-RO', candidatos: [doe('https://diof.ro.gov.br/')] },
  },
  {
    uf: 'RR',
    casa: { nome: 'Assembleia Legislativa de Roraima', sigla: 'ALE-RR', candidatos: [site('https://www.al.rr.leg.br/')] },
    diario: { nome: 'Diário Oficial de Roraima', sigla: 'DOE-RR', candidatos: [doe('https://www.imprensaoficial.rr.gov.br/')] },
  },
  {
    uf: 'SC',
    casa: { nome: 'Assembleia Legislativa de Santa Catarina', sigla: 'Alesc', candidatos: [site('https://www.alesc.sc.gov.br/'), prop('https://www.alesc.sc.gov.br/legislativo/tramitacao-de-materia')] },
    diario: { nome: 'Diário Oficial de Santa Catarina', sigla: 'DOE-SC', candidatos: [doe('https://www.doe.sea.sc.gov.br/'), doe('https://portal.doe.sea.sc.gov.br/')] },
  },
  {
    uf: 'SP',
    casa: {
      nome: 'Assembleia Legislativa de São Paulo',
      sigla: 'Alesp',
      candidatos: [site('https://www.al.sp.gov.br/'), dados('https://www.al.sp.gov.br/dados-abertos/'), dados('https://www.al.sp.gov.br/repositorioDados/processo_legislativo/proposituras.xml')],
    },
    diario: { nome: 'Diário Oficial de São Paulo', sigla: 'DOE-SP', candidatos: [doe('https://www.doe.sp.gov.br/'), doe('https://www.imprensaoficial.com.br/')] },
  },
  {
    uf: 'SE',
    casa: { nome: 'Assembleia Legislativa de Sergipe', sigla: 'Alese', candidatos: [site('https://www.al.se.leg.br/')] },
    diario: { nome: 'Diário Oficial de Sergipe', sigla: 'DOE-SE', candidatos: [doe('https://www.segrase.se.gov.br/'), doe('https://iose.se.gov.br/')] },
  },
  {
    uf: 'TO',
    casa: { nome: 'Assembleia Legislativa do Tocantins', sigla: 'Aleto', candidatos: [site('https://www.al.to.leg.br/'), prop('https://www.al.to.leg.br/materias')] },
    diario: { nome: 'Diário Oficial do Tocantins', sigla: 'DOE-TO', candidatos: [doe('https://diariooficial.to.gov.br/')] },
  },
]

/** Endereço padrão do SAPL (Interlegis) para a casa do estado, tentado em todos. */
export const saplPadrao = (uf: string) => `https://sapl.al.${uf.toLowerCase()}.leg.br/api/materia/materialegislativa/?page_size=1`
