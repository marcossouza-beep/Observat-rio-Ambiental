import { crc32, deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { lerZip } from '@/coleta/zip'

/** Monta um ZIP pequeno (um arquivo guardado, outro comprimido), como os do INLABS. */
function criarZip(arquivos: { nome: string; texto: string; comprimir: boolean }[]) {
  const locais: Buffer[] = []
  const centrais: Buffer[] = []
  let offset = 0
  for (const a of arquivos) {
    const bruto = Buffer.from(a.texto, 'utf8')
    const dados = a.comprimir ? deflateRawSync(bruto) : bruto
    const nome = Buffer.from(a.nome, 'utf8')
    const crc = crc32(bruto)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(a.comprimir ? 8 : 0, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(dados.length, 18)
    local.writeUInt32LE(bruto.length, 22)
    local.writeUInt16LE(nome.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(a.comprimir ? 8 : 0, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(dados.length, 20)
    central.writeUInt32LE(bruto.length, 24)
    central.writeUInt16LE(nome.length, 28)
    central.writeUInt32LE(offset, 42)
    locais.push(local, nome, dados)
    centrais.push(central, nome)
    offset += local.length + nome.length + dados.length
  }
  const dir = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(dir.length, 12)
  fim.writeUInt32LE(offset, 16)
  return Buffer.concat([...locais, dir, fim])
}

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
