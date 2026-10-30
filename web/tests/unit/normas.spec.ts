import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerFicha, urlFicha } from '@/coleta/normas/mapear'

const amostra = (nome: string) => JSON.parse(JSON.parse(readFileSync(path.resolve('tests/fixtures/coleta/normas', `${nome}.json`), 'utf8')).corpo.html)

describe('normas.leg.br: ficha da norma', () => {
  it('Lei nº 6.938/1981: nome popular e texto vigente', () => {
    expect(lerFicha(amostra('normas-leg-6938'))).toEqual({
      pagina: 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1981-08-31;6938',
      nomePopular: 'Lei da Política Nacional do Meio Ambiente',
      urlVigente: 'https://normas.leg.br/api/public/binario/b10bbcdc-51fc-40ca-9a88-6e9c38182749/texto',
    })
  })
  it('Lei do SNUC', () => {
    const f = lerFicha(amostra('normas-leg-9985'))
    expect(f.nomePopular).toBe('Lei do Sistema Nacional de Unidades de Conservação da Natureza (Snuc)')
    expect(f.urlVigente).toMatch(/^https:\/\/normas\.leg\.br\/api\/public\/binario\/.+\/texto$/)
  })
  it('resposta vazia não quebra', () => {
    expect(lerFicha(null)).toEqual({ pagina: null, nomePopular: null, urlVigente: null })
  })
  it('endereço da ficha', () => {
    expect(urlFicha('urn:lex:br:federal:lei:2012-05-25;12651')).toBe('https://normas.leg.br/api/public/normas?urn=urn:lex:br:federal:lei:2012-05-25;12651&tipo_documento=maior-detalhe')
  })
})

describe('normas.leg.br: texto vigente (Compilação Monovigente da Câmara)', async () => {
  const { textoDoHtml } = await import('@/coleta/normas/mapear')
  const { artigoDaLei } = await import('@/lib/alteracoes')
  const bruto = JSON.parse(readFileSync(path.resolve('tests/fixtures/coleta/normas/normas-leg-6938-vigente.json'), 'utf8')).corpo.html
  const texto = textoDoHtml(bruto)

  it('HTML vira um dispositivo por linha, sem marcação', () => {
    expect(texto).toContain('Lei nº 6.938, de 31 de Agosto de 1981')
    expect(texto).not.toMatch(/<[a-z]/i)
    expect(texto).not.toMatch(/&#x?[0-9a-f]+;|&nbsp;/i)
  })
  it('recorta o art. 10 da Lei nº 6.938/1981 como está em vigor', () => {
    expect(artigoDaLei(texto, '10').split('\n')).toEqual([
      'Art. 10. A construção, instalação, ampliação e funcionamento de estabelecimentos e atividades utilizadores de recursos ambientais, efetiva ou potencialmente poluidores ou capazes, sob qualquer forma, de causar degradação ambiental dependerão de prévio licenciamento ambiental. (“Caput” do artigo com redação dada pela Lei Complementar nº 140, de 8/12/2011)',
      '§ 1º Os pedidos de licenciamento, sua renovação e a respectiva concessão serão publicados no jornal oficial, bem como em periódico regional ou local de grande circulação, ou em meio eletrônico de comunicação mantido pelo órgão ambiental competente. (Parágrafo com redação dada pela Lei Complementar nº 140, de 8/12/2011)',
      '§ 2º (Revogado pela Lei Complementar nº 140, de 8/12/2011)',
      '§ 3º (Revogado pela Lei Complementar nº 140, de 8/12/2011)',
      '§ 4º (Revogado pela Lei Complementar nº 140, de 8/12/2011)',
    ])
  })
  it('acha artigo acrescido (9º-A) e não leva junto o título da seção seguinte', () => {
    expect(artigoDaLei(texto, '9-A')).toMatch(/^Art\. 9º-A\. O proprietário ou possuidor de imóvel/)
    expect(artigoDaLei(texto, '1')).not.toMatch(/DA POLÍTICA NACIONAL DO MEIO AMBIENTE/)
  })
  it('redação riscada (revogada) sai do texto', () => {
    expect(textoDoHtml('<p><span>Art. 5º Texto em vigor.</span></p><p><strike>Art. 5º Texto antigo.</strike></p>')).toBe('Art. 5º Texto em vigor.')
  })
})
