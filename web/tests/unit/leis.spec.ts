import { describe, expect, it } from 'vitest'
import { leisCitadas } from '@/lib/leis'

describe('leisCitadas', () => {
  it('Lei Geral do Licenciamento: lista com "nºs" e datas por extenso', () => {
    const r = leisCitadas(
      'Dispõe sobre o licenciamento ambiental; regulamenta o inciso IV do § 1º do art. 225 da Constituição Federal; altera as Leis nºs 9.605, de 12 de fevereiro de 1998, e 9.985, de 18 de julho de 2000; revoga dispositivo da Lei nº 7.661, de 16 de maio de 1988; e dá outras providências.',
    )
    expect(r.map((l) => l.rotulo)).toEqual(['Lei nº 9.605/1998', 'Lei nº 9.985/2000', 'Lei nº 7.661/1988'])
    expect(r[0].urn).toBe('urn:lex:br:federal:lei:1998-02-12;9605')
    expect(r[0].url).toBe('https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1998-02-12;9605')
  })
  it('lei complementar, decreto-lei e forma curta com barra', () => {
    const r = leisCitadas('Altera a Lei Complementar nº 140, de 8 de dezembro de 2011, o Decreto-Lei nº 25, de 30 de novembro de 1937, e a Lei nº 12.651/2012.')
    expect(r.map((l) => [l.rotulo, l.urn])).toEqual([
      ['Lei Complementar nº 140/2011', 'urn:lex:br:federal:lei.complementar:2011-12-08;140'],
      ['Decreto-Lei nº 25/1937', 'urn:lex:br:federal:decreto.lei:1937-11-30;25'],
      ['Lei nº 12.651/2012', undefined],
    ])
    expect(r[2].url).toMatch(/lexml\.gov\.br\/busca\/search\?keyword=Lei%2012651%202012/)
  })
  it('sem leis citadas', () => {
    expect(leisCitadas('Institui o Dia Nacional do Cerrado.')).toEqual([])
    expect(leisCitadas(null)).toEqual([])
  })
})
