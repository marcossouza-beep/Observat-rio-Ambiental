import { describe, expect, it } from 'vitest'
import { sugerirNivel } from '@/levantamento/classificacao'
import { linksPromissores, sinaisDe, type Sinais } from '@/levantamento/sinais'
import type { ResultadoOrgao, Sondagem } from '@/levantamento/sondar'

const base = 'https://www.al.xx.leg.br/'

describe('sinais do levantamento', () => {
  it('reconhece a API do SAPL e o total de registros', () => {
    const s = sinaisDe(JSON.stringify({ pagination: { total_entries: 4210, page: 1 }, results: [{ id: 1 }] }), 'application/json', base)
    expect(s).toMatchObject({ json: true, sapl: true, registros: 4210, xml: false })
  })

  it('JSON comum não é SAPL; XML e RSS são reconhecidos', () => {
    expect(sinaisDe('{"dados": []}', 'application/json', base)).toMatchObject({ json: true, sapl: false })
    expect(sinaisDe('<?xml version="1.0"?><proposituras/>', 'text/xml', base).xml).toBe(true)
    expect(sinaisDe('<rss version="2.0"></rss>', 'text/plain', base).xml).toBe(true)
  })

  it('página com links de proposições, PDFs, dados abertos e SAPL', () => {
    const html = `<html><head><title> Assembleia </title></head><body>
      <a href="/proposicoes">Proposições</a><a href="/projeto/123">PL 123/2026</a>
      <a href="/diario/2026-10-15.pdf">Diário</a><a href="https://sapl.al.xx.leg.br/">Processo legislativo</a>
      <a href="/transparencia/dados-abertos">Dados abertos</a><p>${'texto '.repeat(200)}</p></body></html>`
    const s = sinaisDe(html, 'text/html', base)
    expect(s.titulo).toBe('Assembleia')
    expect(s.linksProposicao).toBe(2)
    expect(s.pdfs).toBe(1)
    expect(s.citaSapl).toBe(true)
    expect(s.citaDadosAbertos).toBe(true)
    expect(s.linksDados).toEqual(['https://www.al.xx.leg.br/transparencia/dados-abertos'])
    expect(s.spa).toBe(false)
  })

  it('página montada no navegador e bloqueio de robô', () => {
    const spa = '<html><body><div id="root"></div><script src="a.js"></script><script src="b.js"></script><script>x()</script></body></html>'
    expect(sinaisDe(spa, 'text/html', base).spa).toBe(true)
    expect(sinaisDe('<html><body><div class="g-recaptcha"></div></body></html>', 'text/html', base).bloqueio).toBe(true)
  })

  it('links que vale sondar: do próprio site ou de .leg.br/.gov.br, sem arquivos', () => {
    const html = `<a href="/proposicoes">Proposições</a><a href="https://sapl.al.xx.leg.br/">SAPL</a>
      <a href="https://twitter.com/x">Projeto no Twitter</a><a href="/lei.pdf">Projeto em PDF</a><a href="/noticias">Notícias</a>`
    expect(linksPromissores(html, base)).toEqual(['https://www.al.xx.leg.br/proposicoes', 'https://sapl.al.xx.leg.br/'])
  })
})

type Parcial = Omit<Partial<Sondagem>, 'sinais'> & { sinais?: Partial<Sinais> }
const s = ({ sinais, ...extra }: Parcial): Sondagem => ({
  url: 'https://www.al.xx.leg.br/',
  papel: 'site',
  status: 200,
  bytes: 5000,
  ...extra,
  sinais: sinais
    ? { json: false, xml: false, sapl: false, citaSapl: false, pdfs: 0, linksProposicao: 0, linksDados: [], citaDadosAbertos: false, spa: false, bloqueio: false, texto: 3000, ...sinais }
    : undefined,
})
const orgao = (o: 'casa' | 'diario', sondagens: Sondagem[]): ResultadoOrgao => ({ uf: 'XX', orgao: o, nome: 'X', sigla: 'X', sondagens })

describe('classificação A–D', () => {
  it('A: API do SAPL ou dados estruturados', () => {
    expect(sugerirNivel(orgao('casa', [s({ sinais: {} }), s({ url: 'https://sapl.al.xx.leg.br/api/x', papel: 'sapl_padrao', sinais: { json: true, sapl: true, registros: 900 } })]))).toMatchObject({ nivel: 'A', motivo: 'API do SAPL respondendo (900 matérias)' })
    expect(sugerirNivel(orgao('casa', [s({ papel: 'api', sinais: { xml: true } })])).nivel).toBe('A')
  })
  it('B: página HTML com a lista de proposições', () => {
    const r = sugerirNivel(orgao('casa', [s({ sinais: { linksProposicao: 2 } }), s({ url: 'https://www.al.xx.leg.br/proposicoes', papel: 'link', sinais: { linksProposicao: 30 } })]))
    expect(r).toMatchObject({ nivel: 'B', url: 'https://www.al.xx.leg.br/proposicoes' })
  })
  it('C: só PDF ou página montada no navegador', () => {
    expect(sugerirNivel(orgao('casa', [s({ sinais: { pdfs: 4 } })])).nivel).toBe('C')
    expect(sugerirNivel(orgao('casa', [s({ sinais: { spa: true, texto: 50 } })])).nivel).toBe('C')
    expect(sugerirNivel(orgao('diario', [s({ sinais: { pdfs: 12 } })]))).toMatchObject({ nivel: 'C', motivo: 'edições em PDF (12 na página)' })
  })
  it('D: fora do ar, bloqueado ou sem lista', () => {
    expect(sugerirNivel(orgao('casa', [s({ status: null, erro: 'UND_ERR_CONNECT_TIMEOUT' })])).motivo).toMatch(/fora do Brasil/)
    expect(sugerirNivel(orgao('casa', [s({ status: 500 })])).motivo).toBe('nenhum endereço respondeu com conteúdo')
    expect(sugerirNivel(orgao('casa', [s({ status: 200, sinais: { bloqueio: true } })])).motivo).toMatch(/bloqueia/)
    expect(sugerirNivel(orgao('casa', [s({ sinais: { linksProposicao: 1 } })])).nivel).toBe('D')
    expect(sugerirNivel(orgao('casa', [s({ status: 404, sinais: { linksProposicao: 50 } })])).nivel).toBe('D')
  })
})
