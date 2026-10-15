/**
 * Classificação A–D do levantamento regional (docs/LEVANTAMENTO.md):
 *  A — dados estruturados (API, SAPL, JSON/XML de dados abertos): conector automático direto.
 *  B — páginas HTML com a lista das proposições (ou das edições): conector lendo as páginas.
 *  C — só PDF, ou página montada no navegador: leitura de PDF ou navegador automatizado; frágil.
 *  D — fora do ar, bloqueado ou sem nada útil: cadastro manual pelo autor.
 * A sugestão sai das evidências da sondagem; AJUSTES registra correções feitas por quem revisou, com o motivo.
 */
import type { ResultadoOrgao, Sondagem } from './sondar'

export type Nivel = 'A' | 'B' | 'C' | 'D'
export type Classificacao = { nivel: Nivel; motivo: string; url?: string; ajustado?: boolean }

const ok = (s: Sondagem) => s.status !== null && s.status >= 200 && s.status < 300 && !s.sinais?.bloqueio

export function sugerirNivel(o: ResultadoOrgao): Classificacao {
  const boas = o.sondagens.filter(ok)
  const sapl = boas.find((s) => s.sinais?.sapl)
  if (sapl) return { nivel: 'A', motivo: `API do SAPL respondendo${sapl.sinais?.registros ? ` (${sapl.sinais.registros} matérias)` : ''}`, url: sapl.urlFinal || sapl.url }
  const estruturada = boas.find((s) => (s.sinais?.json || s.sinais?.xml || s.sinais?.arquivo) && (s.bytes || 0) > 200)
  if (estruturada) {
    const forma = estruturada.sinais?.json ? 'JSON' : estruturada.sinais?.xml ? 'XML' : 'arquivo para baixar'
    return { nivel: 'A', motivo: `dados estruturados (${forma})`, url: estruturada.urlFinal || estruturada.url }
  }

  const paginas = boas.filter((s) => s.sinais && !s.sinais.json && !s.sinais.xml)
  if (!paginas.length) {
    const bloqueada = o.sondagens.find((s) => s.sinais?.bloqueio)
    if (bloqueada) return { nivel: 'D', motivo: 'site bloqueia acesso automático (captcha ou desafio)', url: bloqueada.url }
    const semResposta = o.sondagens.every((s) => s.status === null && /TIMEOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND/.test(s.erro || ''))
    return {
      nivel: 'D',
      motivo: semResposta
        ? 'não respondeu a partir dos servidores do GitHub (fora do Brasil); pode ser bloqueio de acesso estrangeiro: testar de um servidor no Brasil'
        : 'nenhum endereço respondeu com conteúdo',
      url: o.sondagens[0]?.url,
    }
  }
  const legivel = (s: Sondagem) => !s.sinais!.spa && s.sinais!.texto > 400
  if (o.orgao === 'casa') {
    const lista = paginas.find((s) => legivel(s) && s.sinais!.linksProposicao >= 5 && s.papel !== 'site')
      || paginas.find((s) => legivel(s) && s.sinais!.linksProposicao >= 10)
    if (lista) return { nivel: 'B', motivo: `página com lista de proposições em HTML (${lista.sinais!.linksProposicao} links)`, url: lista.urlFinal || lista.url }
    const pdf = paginas.find((s) => s.sinais!.pdfs > 0)
    if (pdf) return { nivel: 'C', motivo: `lista de proposições não encontrada em HTML; o site publica documentos em PDF (${pdf.sinais!.pdfs} na página)`, url: pdf.urlFinal || pdf.url }
    const spa = paginas.find((s) => s.sinais!.spa)
    if (spa) return { nivel: 'C', motivo: 'página montada no navegador (precisa de navegador automatizado)', url: spa.urlFinal || spa.url }
    return { nivel: 'D', motivo: 'site no ar, mas sem lista de proposições encontrada; cadastro manual até achar a fonte', url: paginas[0].urlFinal || paginas[0].url }
  }
  // Diário Oficial: quase sempre PDF por edição
  const pdf = paginas.find((s) => s.sinais!.pdfs > 0)
  if (pdf) return { nivel: 'C', motivo: `edições em PDF (${pdf.sinais!.pdfs} na página)`, url: pdf.urlFinal || pdf.url }
  const spa = paginas.find((s) => s.sinais!.spa)
  if (spa) return { nivel: 'C', motivo: 'consulta montada no navegador', url: spa.urlFinal || spa.url }
  return { nivel: 'C', motivo: 'site no ar; edições sem link direto na página inicial (consulta por data)', url: paginas[0].urlFinal || paginas[0].url }
}

/**
 * Correções de quem revisou o resultado, por "UF:casa" ou "UF:diario". Cada uma diz o que a sondagem mostrou.
 * Revisão de 15/10/2026 sobre a segunda rodada da sondagem.
 */
export const AJUSTES: Record<string, Omit<Classificacao, 'ajustado'>> = {
  'MT:casa': {
    nivel: 'B',
    motivo: 'SAPL instalado mas sem uso (1 matéria); API própria (api.al.mt.gov.br) exige chave (resposta 401): pedir acesso; até lá, lista de proposições em HTML',
    url: 'https://www.al.mt.gov.br/proposicao/',
  },
  'MG:casa': {
    nivel: 'A',
    motivo: 'portal de dados abertos com API documentada (dadosabertos.almg.gov.br); as consultas testadas responderam erro 500: acertar os parâmetros pela documentação antes do conector',
    url: 'https://dadosabertos.almg.gov.br/documentacao/index',
  },
  'RR:casa': {
    nivel: 'D',
    motivo: 'usa o SAPL, mas a API recusa o acesso (403) e o site não mostra conteúdo sem o navegador; pedir liberação à ALE-RR',
    url: 'https://sapl.al.rr.leg.br/',
  },
  'CE:casa': {
    nivel: 'D',
    motivo: 'site responde de forma intermitente e a página de proposições testada não existe (404); falta localizar a consulta de proposições',
    url: 'https://www.al.ce.gov.br/',
  },
  'PA:casa': {
    nivel: 'D',
    motivo: 'site no ar, mas a página de proposições não traz a lista no HTML; falta localizar a consulta',
    url: 'https://www.alepa.pa.gov.br/Home/Page/Proposicoes',
  },
  'RJ:casa': {
    nivel: 'B',
    motivo: 'consulta de proposições no sistema Lotus Notes da Alerj (páginas HTML, sem API); falta testar a listagem',
    url: 'http://alerjln1.alerj.rj.gov.br/scpro2327.nsf/Internet/LeiInt?OpenForm',
  },
  'PR:casa': {
    nivel: 'C',
    motivo: 'a consulta de proposições é protegida por captcha; o portal de dados abertos não traz proposições; resta a leitura dos documentos em PDF',
    url: 'https://consultas.assembleia.pr.leg.br/',
  },
}

export function classificar(o: ResultadoOrgao): Classificacao {
  const a = AJUSTES[`${o.uf}:${o.orgao}`]
  return a ? { ...a, ajustado: true } : sugerirNivel(o)
}
