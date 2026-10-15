import { describe, expect, it } from 'vitest'
import { lerZip } from '@/coleta/zip'
import { criarZip } from '../helpers/zip'

describe('lerZip', () => {
  const zip = criarZip([
    { nome: '515_20261015_1.xml', texto: '<xml>guardado</xml>', comprimir: false },
    { nome: 'imagem.jpg', texto: 'x', comprimir: false },
    { nome: '515_20261015_2.xml', texto: '<xml>' + 'ação '.repeat(200) + '</xml>', comprimir: true },
  ])
  it('lê arquivos guardados e comprimidos, com filtro', () => {
    const r = lerZip(zip, (n) => n.endsWith('.xml'))
    expect(r.map((a) => a.nome)).toEqual(['515_20261015_1.xml', '515_20261015_2.xml'])
    expect(r[0].conteudo.toString()).toBe('<xml>guardado</xml>')
    expect(r[1].conteudo.toString()).toContain('ação ação')
  })
  it('recusa o que não é ZIP (ex.: página de login devolvida no lugar do arquivo)', () => {
    expect(() => lerZip(Buffer.from('<html>faça login</html>'))).toThrow(/ZIP inválido/)
  })
})
