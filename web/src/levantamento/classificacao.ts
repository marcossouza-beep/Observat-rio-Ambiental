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
  const estruturada = boas.find((s) => (s.sinais?.json || s.sinais?.xml) && (s.bytes || 0) > 200)
  if (estruturada) return { nivel: 'A', motivo: `dados estruturados (${estruturada.sinais?.json ? 'JSON' : 'XML'})`, url: estruturada.urlFinal || estruturada.url }

  const paginas = boas.filter((s) => s.sinais && !s.sinais.json && !s.sinais.xml)
  if (!paginas.length) {
    const bloqueada = o.sondagens.find((s) => s.sinais?.bloqueio)
    return { nivel: 'D', motivo: bloqueada ? 'site bloqueia acesso automático (captcha ou desafio)' : 'nenhum endereço respondeu', url: o.sondagens[0]?.url }
  }
  const legivel = (s: Sondagem) => !s.sinais!.spa && s.sinais!.texto > 400
  if (o.orgao === 'casa') {
    const lista = paginas.find((s) => legivel(s) && s.sinais!.linksProposicao >= 5 && s.papel !== 'site')
      || paginas.find((s) => legivel(s) && s.sinais!.linksProposicao >= 10)
    if (lista) return { nivel: 'B', motivo: `página com lista de proposições em HTML (${lista.sinais!.linksProposicao} links)`, url: lista.urlFinal || lista.url }
    const pdf = paginas.find((s) => s.sinais!.pdfs > 0)
    if (pdf) return { nivel: 'C', motivo: `proposições só em PDF (${pdf.sinais!.pdfs} PDFs na página)`, url: pdf.urlFinal || pdf.url }
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

/** Correções de quem revisou o resultado, por "UF:casa" ou "UF:diario". */
export const AJUSTES: Record<string, Omit<Classificacao, 'ajustado'>> = {}

export function classificar(o: ResultadoOrgao): Classificacao {
  const a = AJUSTES[`${o.uf}:${o.orgao}`]
  return a ? { ...a, ajustado: true } : sugerirNivel(o)
}
