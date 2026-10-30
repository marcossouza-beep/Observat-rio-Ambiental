import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib'
import { extractText, getDocumentProxy } from 'unpdf'
import { describe, expect, it } from 'vitest'
import { carimbarPdf, paraWinAnsi } from '@/lib/carimbo'
import { caminhoLink, codigoLink, destinoLink, lerCodigo, linhasCarimbo } from '@/lib/linkRastreavel'

describe('link rastreável', () => {
  it('codifica e lê parecer, material e versão', () => {
    const r = { parecer: 12, material: 'nota_tecnica' as const, versao: 2 }
    expect(codigoLink(r)).toBe('12-nt-v2')
    expect(caminhoLink(r)).toBe('/r/12-nt-v2')
    expect(lerCodigo('12-nt-v2')).toEqual(r)
    expect(lerCodigo('7-qc-v1')).toEqual({ parecer: 7, material: 'quadro_comparativo', versao: 1 })
    expect(destinoLink('pl-1-2026-x', r)).toBe('/pareceres/pl-1-2026-x?pdf=nt&v=2')
  })
  it('recusa códigos fora do formato', () => {
    for (const c of ['', '12', '12-xx-v1', 'abc-nt-v1', '12-nt-v', '12-nt-v1/../x']) expect(lerCodigo(c)).toBeNull()
  })
  it('monta o rodapé com identificação e link', () => {
    const [l1, l2] = linhasCarimbo({
      site: 'https://enfasejur.com.br',
      nomeSite: 'ênfase jur',
      material: 'quadro_comparativo',
      proposta: 'PL nº 1.234/2026',
      versao: 2,
      publicadoEm: '09/10/2026',
      textoAnalisado: 'Substitutivo, de 08/10/2026',
      autor: 'Nome do Autor',
      link: '/r/12-qc-v2',
      baixadoEm: '30/10/2026',
    })
    expect(l1).toBe('ênfase jur · Quadro comparativo do parecer prévio sobre PL nº 1.234/2026 · versão 2, de 09/10/2026 · analisa: Substitutivo, de 08/10/2026 · autoria: Nome do Autor')
    expect(l2).toBe('Versão atual, texto base e histórico: https://enfasejur.com.br/r/12-qc-v2 · baixado em 30/10/2026')
  })
})

describe('carimbo no PDF', () => {
  async function pdfDeDuasPaginas() {
    const d = await PDFDocument.create()
    const f = await d.embedFont(StandardFonts.Helvetica)
    for (const t of ['Pagina um', 'Pagina dois']) d.addPage([595, 842]).drawText(t, { x: 50, y: 780, size: 12, font: f })
    return d.save()
  }

  it('carimba todas as páginas com o texto e o link clicável', async () => {
    const url = 'https://enfasejur.com.br/r/12-nt-v2'
    const saida = await carimbarPdf(await pdfDeDuasPaginas(), { linhas: ['ênfase jur · Nota técnica do parecer prévio sobre PL nº 1.234/2026 · versão 2', `Versão atual: ${url}`], url, titulo: 'Nota técnica' })
    expect(saida).not.toBeNull()
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(saida!)), { mergePages: false })
    expect(text).toHaveLength(2)
    for (const pagina of text as string[]) {
      expect(pagina).toContain('PL nº 1.234/2026')
      expect(pagina).toContain(url)
    }
    const doc = await PDFDocument.load(saida!)
    expect(doc.getTitle()).toBe('Nota técnica')
    for (const p of doc.getPages()) expect(p.node.lookup(PDFName.of('Annots'))).toBeTruthy()
  })

  it('PDF ilegível volta null (o download segue sem carimbo)', async () => {
    expect(await carimbarPdf(new TextEncoder().encode('não é pdf'), { linhas: ['a', 'b'], url: 'https://x', titulo: 't' })).toBeNull()
  })

  it('troca o que a fonte padrão não desenha', () => {
    expect(paraWinAnsi('Art. 3º — “texto” → fim… ✓')).toBe('Art. 3º - "texto" -> fim... ')
  })
})
