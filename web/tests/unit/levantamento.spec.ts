import { describe, expect, it } from 'vitest'
import { linksPromissores, sinaisDe } from '@/levantamento/sinais'

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
